import { Prisma, type BookingStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/http';
import { missingServiceIdsAtLocation } from '../../utils/haversine';
import { normalizeIndianMobile } from '../../utils/phone';
import {
  assertBookingTransition,
  bookingAudit,
  BookingIntegrityError,
  fingerprintBookingRequest,
  generateBookingNumber,
  generateStartOtp,
  logBookingIdempotency,
  type BookingActorType,
  type BookingMutationSource,
} from './booking-integrity';
import { BookingCancellationPolicyError } from './booking-errors';
import {
  isOnlinePaymentMethod,
  isPackageVariant,
  money,
  priceBookingItemsFromCatalog,
  resolveDurationMinutes,
  resolveRequiredWorkers,
  type ClientBookingItemPriceHint,
} from './pricing';
import { getPoolSlotAvailability } from '../daily-capacity/slot-pool.service';
import { minToTime, nextIstDates, timeToMin } from '../daily-capacity/slot-pool-core';

const bookingListSelect = {
  id: true,
  bookingNo: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  payableTotal: true,
  scheduledDate: true,
  scheduledFromTime: true,
  scheduledToTime: true,
  slotStartAt: true,
  slotEndAt: true,
  serviceDurationMinutes: true,
  serviceAddress: true,
  customerName: true,
  customerPhone: true,
  customerNotes: true,
  isPackagePurchase: true,
  requiredWorkerCount: true,
  cashSettled: true,
  cashSettledAt: true,
  createdAt: true,
  city: { select: { id: true, name: true } },
  serviceCategory: { select: { id: true, name: true, iconUrl: true } },
  assignedHero: { select: { id: true, name: true, phone: true, profilePhotoUrl: true, rating: true } },
  items: {
    select: {
      id: true,
      name: true,
      quantity: true,
      unitPrice: true,
      taxAmount: true,
      totalAmount: true,
      serviceId: true,
      serviceVariantId: true,
      service: { select: { id: true, name: true, duration: true } },
      serviceVariant: { select: { id: true, name: true, durationMinutes: true } },
    },
  },
} satisfies Prisma.BookingSelect;

const bookingDetailSelect = {
  ...bookingListSelect,
  version: true,
  customerId: true,
  customerAddressId: true,
  cityId: true,
  bookingType: true,
  creationSource: true,
  subtotal: true,
  discountTotal: true,
  taxTotal: true,
  coinsRedeemed: true,
  coinsDiscount: true,
  overtimeFeeAmount: true,
  overtimeMinutes: true,
  latitude: true,
  longitude: true,
  startOtp: true,
  startOtpVerifiedAt: true,
  couponCode: true,
  customerEmail: true,
  adminNotes: true,
  completedAt: true,
  updatedAt: true,
  customerServicePackageId: true,
  statusHistory: {
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      message: true,
      actorType: true,
      source: true,
      reasonCode: true,
      reasonText: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  purchasedPackages: {
    select: {
      id: true,
      packageName: true,
      totalVisits: true,
      usedVisits: true,
      validityDays: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  },
} satisfies Prisma.BookingSelect;

export type CustomerBookingItemInput = ClientBookingItemPriceHint;

export interface CreateCustomerBookingInput {
  idempotencyKey?: string;
  addressId: number;
  items: CustomerBookingItemInput[];
  scheduledDate?: string;
  scheduledFromTime?: string;
  scheduledToTime?: string;
  paymentMethod?: string;
  customerNotes?: string;
  couponCode?: string;
  serviceCategoryId?: number;
  coinsToRedeem?: number;
}

export interface CreateDashboardBookingInput {
  idempotencyKey?: string;
  cityId: number;
  customerName: string;
  customerPhone: string;
  customerAltPhone?: string;
  customerEmail?: string;
  serviceAddress: string;
  latitude?: number;
  longitude?: number;
  customerId?: number;
  customerAddressId?: number;
  serviceCategoryId?: number;
  scheduledDate?: string;
  scheduledFromTime?: string;
  scheduledToTime?: string;
  paymentMethod?: string;
  customerNotes?: string;
  adminNotes?: string;
  items: CustomerBookingItemInput[];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function loadAuthoritativeBookingItems(items: ClientBookingItemPriceHint[]) {
  const serviceIds = [...new Set(items.flatMap((item) => (item.serviceId ? [item.serviceId] : [])))];
  const variantIds = [...new Set(items.flatMap((item) => (item.serviceVariantId ? [item.serviceVariantId] : [])))];
  const [services, variants] = await Promise.all([
    prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, description: true, price: true, taxMode: true, taxValue: true, isActive: true },
    }),
    prisma.serviceVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        serviceId: true,
        name: true,
        description: true,
        singlePrice: true,
        mrp: true,
        isActive: true,
        service: { select: { id: true, name: true, description: true, price: true, taxMode: true, taxValue: true, isActive: true } },
      },
    }),
  ]);
  return priceBookingItemsFromCatalog(items, services, variants);
}

async function resolveServiceCategoryId(items: { serviceId: number }[]): Promise<number | undefined> {
  const serviceId = items[0]?.serviceId;
  if (!serviceId) return undefined;
  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { categoryId: true } });
  return service?.categoryId;
}

async function getUnavailableServiceIds(serviceIds: number[], latitude: unknown, longitude: unknown): Promise<number[]> {
  if (serviceIds.length === 0) return [];
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return [];

  const hubs = await prisma.hub.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      cityId: true,
      latitude: true,
      longitude: true,
      serviceRadiusMeters: true,
      serviceAvailability: {
        where: { serviceId: { in: serviceIds }, isActive: true },
        select: { serviceId: true },
      },
    },
  });
  return missingServiceIdsAtLocation(
    lat,
    lng,
    hubs.map((hub) => ({
      id: hub.id,
      name: hub.name,
      cityId: hub.cityId,
      latitude: hub.latitude,
      longitude: hub.longitude,
      serviceRadiusMeters: hub.serviceRadiusMeters,
      offeredServiceIds: hub.serviceAvailability.map((row) => row.serviceId),
    })),
    serviceIds,
  );
}

async function detectPackagePurchase(items: { serviceVariantId?: number }[]) {
  const variantIds = [...new Set(items.flatMap((item) => (item.serviceVariantId ? [item.serviceVariantId] : [])))];
  if (variantIds.length === 0) return { isPackagePurchase: false, packageVariantIds: new Set<number>() };
  const variants = await prisma.serviceVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, totalVisits: true, visitsPerMonth: true, validityDays: true },
  });
  const packageVariantIds = new Set(variants.filter(isPackageVariant).map((variant) => variant.id));
  return { isPackagePurchase: packageVariantIds.size > 0, packageVariantIds };
}

async function createPendingPackages(
  customerId: number,
  bookingId: number,
  items: Array<{ serviceId: number; serviceVariantId?: number; name: string }>,
) {
  const variantIds = items.flatMap((item) => (item.serviceVariantId ? [item.serviceVariantId] : []));
  if (variantIds.length === 0) return;
  const variants = await prisma.serviceVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, serviceId: true, name: true, validityDays: true, totalVisits: true, visitsPerMonth: true },
  });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const startDate = new Date(`${nextIstDates(1)[0]}T00:00:00.000Z`);

  for (const item of items) {
    if (!item.serviceVariantId) continue;
    const variant = byId.get(item.serviceVariantId);
    if (!variant || !isPackageVariant(variant)) continue;
    const totalVisits = variant.totalVisits ?? variant.visitsPerMonth ?? 1;
    const validityDays = variant.validityDays ?? totalVisits;
    await prisma.customerServicePackage.create({
      data: {
        customerId,
        bookingId,
        serviceId: item.serviceId,
        serviceVariantId: variant.id,
        packageName: item.name || variant.name,
        totalVisits,
        usedVisits: 0,
        validityDays,
        startDate,
        endDate: addDays(startDate, Math.max(validityDays - 1, 0)),
        status: 'PENDING_PAYMENT',
      },
    });
  }
}

async function replayOrConflict(scope: string, key: string, fingerprint: string) {
  const existing = await prisma.booking.findUnique({
    where: { idempotencyScope_idempotencyKey: { idempotencyScope: scope, idempotencyKey: key } },
    select: { id: true, requestFingerprint: true },
  });
  if (!existing) return null;
  if (existing.requestFingerprint !== fingerprint) {
    logBookingIdempotency('conflict', scope, key);
    throw new BookingIntegrityError('BOOKING_IDEMPOTENCY_CONFLICT', 'Idempotency key was already used with a different booking request');
  }
  logBookingIdempotency('replayed', scope, key);
  return prisma.booking.findFirstOrThrow({ where: { id: existing.id }, select: bookingDetailSelect });
}

async function insertBookingWithRetries(
  create: () => Promise<{ id: number }>,
  onConflict: () => Promise<{ id: number } | null>,
): Promise<{ id: number; replayed: boolean }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return { ...(await create()), replayed: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await onConflict();
        if (existing) return { id: existing.id, replayed: true };
        continue;
      }
      throw error;
    }
  }
  throw new AppError(500, 'Unable to allocate a unique booking number', 'BOOKING_NUMBER_EXHAUSTED');
}

export async function createCustomerBooking(customerId: number, data: CreateCustomerBookingInput) {
  if (data.coinsToRedeem && data.coinsToRedeem > 0) {
    throw new AppError(400, 'Jiffit Coins are not available yet', 'COINS_NOT_AVAILABLE');
  }
  if (data.couponCode?.trim()) {
    throw new AppError(400, 'Coupons are not available yet', 'COUPON_NOT_AVAILABLE');
  }

  const idempotencyKey = data.idempotencyKey?.trim() || undefined;
  const idempotencyScope = idempotencyKey ? `CUSTOMER:${customerId}` : undefined;
  const requestFingerprint = idempotencyKey ? fingerprintBookingRequest(data) : undefined;
  if (idempotencyKey && idempotencyScope && requestFingerprint) {
    const replayed = await replayOrConflict(idempotencyScope, idempotencyKey, requestFingerprint);
    if (replayed) return { booking: replayed, replayed: true as const };
  }

  const address = await prisma.customerAddress.findFirst({
    where: { id: data.addressId, customerId, isActive: true },
    select: {
      id: true,
      addressLine1: true,
      addressLine2: true,
      pincode: true,
      latitude: true,
      longitude: true,
      cityId: true,
      city: { select: { name: true } },
    },
  });
  if (!address) throw new AppError(404, 'Address not found', 'ADDRESS_NOT_FOUND');

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null, isActive: true },
    select: { id: true, name: true, phone: true, email: true },
  });
  if (!customer) throw new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');

  const pricedItems = await loadAuthoritativeBookingItems(data.items);
  const onlinePayment = isOnlinePaymentMethod(data.paymentMethod);
  const workerRows = await prisma.service.findMany({
    where: { id: { in: pricedItems.map((item) => item.serviceId) } },
    select: { workerCount: true },
  });
  const requiredWorkerCount = resolveRequiredWorkers(workerRows.map((row) => row.workerCount));
  const { isPackagePurchase, packageVariantIds } = await detectPackagePurchase(pricedItems);

  if (isPackagePurchase && pricedItems.some((item) => item.serviceVariantId == null || !packageVariantIds.has(item.serviceVariantId))) {
    throw new AppError(400, 'Package items cannot be mixed with single-visit services', 'MIXED_PACKAGE_CART');
  }
  if (isPackagePurchase && !onlinePayment) {
    throw new AppError(400, 'Package purchases require online payment', 'PACKAGE_ONLINE_PAYMENT_REQUIRED');
  }

  const scheduledDate = isPackagePurchase ? undefined : data.scheduledDate;
  const scheduledFromTime = isPackagePurchase ? undefined : data.scheduledFromTime;
  const scheduledToTime = isPackagePurchase ? undefined : data.scheduledToTime;

  if (!isPackagePurchase && (!scheduledDate || !scheduledFromTime)) {
    throw new AppError(400, 'A date and start time are required', 'SLOT_REQUIRED');
  }

  const unavailable = isPackagePurchase
    ? []
    : await getUnavailableServiceIds(
        pricedItems.map((item) => item.serviceId),
        address.latitude,
        address.longitude,
      );
  if (unavailable.length > 0) {
    throw new AppError(400, 'One or more services are not available at this address', 'SERVICE_NOT_AVAILABLE', {
      serviceIds: unavailable,
    });
  }

  const subtotal = money(pricedItems.reduce((sum, item) => sum + item.totalAmount, 0));
  const taxTotal = money(pricedItems.reduce((sum, item) => sum + item.taxAmount, 0));

  let overtimeFeeAmount = 0;
  let overtimeMinutes = 0;
  if (scheduledDate && scheduledFromTime) {
    const primary = pricedItems[0];
    const conflictCheck = await getPoolSlotAvailability(address.cityId, scheduledDate, primary.serviceId, {
      serviceVariantId: primary.serviceVariantId,
      quantity: primary.quantity,
      latitude: Number(address.latitude),
      longitude: Number(address.longitude),
    });
    const requestedSlot = conflictCheck.slots.find((slot) => slot.time === scheduledFromTime);
    if (!requestedSlot?.available) {
      throw new AppError(409, 'That slot is no longer available', 'SLOT_CONFLICT');
    }
    overtimeFeeAmount = requestedSlot.overtimeFeeAmount ?? 0;
    overtimeMinutes = requestedSlot.overtimeMinutes ?? 0;
  }

  const payableTotal = money(subtotal + taxTotal + overtimeFeeAmount);
  const serviceCategoryId = (await resolveServiceCategoryId(pricedItems)) ?? data.serviceCategoryId;
  const serviceAddress = [address.addressLine1, address.addressLine2, address.city.name, address.pincode]
    .filter(Boolean)
    .join(', ');

  const catalogs = await loadDurationCatalogs(pricedItems);
  const serviceDurationMinutes =
    scheduledDate && scheduledFromTime ? resolveDurationMinutes(pricedItems, catalogs.services, catalogs.variants) : undefined;
  const slotStartAt = scheduledDate && scheduledFromTime ? new Date(`${scheduledDate}T${scheduledFromTime}:00+05:30`) : undefined;
  const slotEndAt =
    slotStartAt && serviceDurationMinutes ? new Date(slotStartAt.getTime() + serviceDurationMinutes * 60_000) : undefined;
  const initialStatus = onlinePayment ? 'PENDING_PAYMENT' : 'PENDING_ASSIGNMENT';

  const created = await insertBookingWithRetries(
    async () =>
      prisma.booking.create({
        data: {
          bookingNo: generateBookingNumber(),
          idempotencyKey,
          idempotencyScope,
          requestFingerprint,
          creationSource: 'CUSTOMER_APP',
          requiredWorkerCount,
          workerPlanVersion: 1,
          customerId,
          customerAddressId: address.id,
          cityId: address.cityId,
          serviceCategoryId,
          customerName: customer.name ?? customer.phone,
          customerPhone: customer.phone,
          customerEmail: customer.email ?? undefined,
          serviceAddress,
          latitude: address.latitude,
          longitude: address.longitude,
          scheduledDate: scheduledDate ? new Date(`${scheduledDate}T00:00:00.000Z`) : undefined,
          scheduledFromTime,
          scheduledToTime:
            scheduledToTime ??
            (scheduledFromTime && serviceDurationMinutes
              ? minToTime(timeToMin(scheduledFromTime) + serviceDurationMinutes)
              : undefined),
          slotStartAt,
          slotEndAt,
          serviceDurationMinutes,
          subtotal,
          taxTotal,
          payableTotal,
          overtimeFeeAmount,
          overtimeMinutes,
          customerNotes: data.customerNotes,
          isPackagePurchase,
          status: initialStatus,
          paymentStatus: onlinePayment ? 'PENDING' : 'UNPAID',
          paymentMethod: onlinePayment ? 'ONLINE' : (data.paymentMethod ?? 'CASH'),
          startOtp: isPackagePurchase ? undefined : generateStartOtp(),
          items: {
            create: pricedItems.map((item) => ({
              serviceId: item.serviceId,
              serviceVariantId: item.serviceVariantId,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxAmount: item.taxAmount,
              totalAmount: item.totalAmount,
            })),
          },
          statusHistory: {
            create: {
              toStatus: initialStatus,
              ...bookingAudit({
                actorType: 'CUSTOMER',
                actorId: customerId,
                source: 'CUSTOMER_APP',
                reasonCode: isPackagePurchase
                  ? 'PACKAGE_PURCHASE_PAYMENT_PENDING'
                  : onlinePayment
                    ? 'ONLINE_PAYMENT_PENDING'
                    : 'BOOKING_CREATED',
                reasonText: isPackagePurchase ? 'Package purchase created pending verified payment' : 'Booking placed by customer',
              }),
            },
          },
        },
        select: { id: true },
      }),
    async () => {
      if (!idempotencyKey || !idempotencyScope || !requestFingerprint) return null;
      const replayed = await replayOrConflict(idempotencyScope, idempotencyKey, requestFingerprint);
      return replayed ? { id: replayed.id } : null;
    },
  );

  if (isPackagePurchase && !created.replayed) {
    await createPendingPackages(customerId, created.id, pricedItems);
  }

  if (onlinePayment && !created.replayed) {
    const { ensurePaymentOrderForBooking } = await import('../payments/payment.service');
    await ensurePaymentOrderForBooking(customerId, created.id);
  } else if (!isPackagePurchase && !onlinePayment && !created.replayed) {
    const { planOrDispatchBooking } = await import('../dispatch/dispatch.service');
    setImmediate(() => {
      planOrDispatchBooking(created.id, 'CASH_BOOKING_CREATED').catch(() => undefined);
    });
  }

  const booking = await prisma.booking.findFirstOrThrow({ where: { id: created.id }, select: bookingDetailSelect });
  return { booking, replayed: created.replayed };
}

async function loadDurationCatalogs(items: { serviceId: number; serviceVariantId?: number }[]) {
  const [services, variants] = await Promise.all([
    prisma.service.findMany({
      where: { id: { in: items.map((item) => item.serviceId) } },
      select: { id: true, duration: true },
    }),
    prisma.serviceVariant.findMany({
      where: { id: { in: items.flatMap((item) => (item.serviceVariantId ? [item.serviceVariantId] : [])) } },
      select: { id: true, durationMinutes: true },
    }),
  ]);
  return { services, variants };
}

export async function listCustomerBookings(customerId: number, filter: { status?: BookingStatus; page?: number; limit?: number }) {
  const page = filter.page ?? 1;
  const limit = Math.min(filter.limit ?? 20, 50);
  const where: Prisma.BookingWhereInput = { customerId, deletedAt: null, isPackagePurchase: false };
  if (filter.status) where.status = filter.status;
  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      select: bookingListSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { total, page, limit, bookings };
}

export async function getCustomerBooking(customerId: number, bookingId: number) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId, deletedAt: null },
    select: bookingDetailSelect,
  });
  if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
  return booking;
}

export async function calculateCustomerSlots(customerId: number, input: {
  customerAddressId: number;
  serviceId: number;
  serviceVariantId?: number;
  quantity?: number;
  date?: string;
}) {
  const address = await prisma.customerAddress.findFirst({
    where: { id: input.customerAddressId, customerId, isActive: true },
    select: { cityId: true, latitude: true, longitude: true },
  });
  if (!address) throw new AppError(404, 'Address not found', 'ADDRESS_NOT_FOUND');

  const dates = input.date ? [input.date] : nextIstDates(14);
  const results = [];
  for (const date of dates) {
    const pool = await getPoolSlotAvailability(address.cityId, date, input.serviceId, {
      serviceVariantId: input.serviceVariantId,
      quantity: input.quantity ?? 1,
      latitude: Number(address.latitude),
      longitude: Number(address.longitude),
    });
    const available = pool.slots.filter((slot) => slot.available);
    if (input.date) {
      results.push({ date, ...pool });
      break;
    }
    if (available.length > 0) {
      results.push({ date, ...pool, slots: available });
      if (results.length === 4) break;
    }
  }

  return {
    timezone: 'Asia/Kolkata',
    source: 'CAPACITY_POOL',
    dates: results,
  };
}

export async function createDashboardBooking(actorUserId: number, data: CreateDashboardBookingInput) {
  const phone = normalizeIndianMobile(data.customerPhone);
  if (!phone) throw new AppError(400, 'customerPhone must be a valid Indian mobile number', 'INVALID_PHONE');
  if (data.items.length === 0) throw new AppError(400, 'At least one catalog item is required', 'ITEMS_REQUIRED');

  const onlinePayment = isOnlinePaymentMethod(data.paymentMethod);
  if (onlinePayment && !data.customerId) {
    throw new BookingIntegrityError('ONLINE_PAYMENT_CUSTOMER_REQUIRED', 'Online payment bookings require a customer account');
  }

  const idempotencyKey = data.idempotencyKey?.trim() || undefined;
  const idempotencyScope = idempotencyKey ? `DASHBOARD:${actorUserId}` : undefined;
  const requestFingerprint = idempotencyKey ? fingerprintBookingRequest(data) : undefined;
  if (idempotencyKey && idempotencyScope && requestFingerprint) {
    const replayed = await replayOrConflict(idempotencyScope, idempotencyKey, requestFingerprint);
    if (replayed) return replayed;
  }

  const pricedItems = await loadAuthoritativeBookingItems(data.items);
  const workerRows = await prisma.service.findMany({
    where: { id: { in: pricedItems.map((item) => item.serviceId) } },
    select: { workerCount: true },
  });
  const requiredWorkerCount = resolveRequiredWorkers(workerRows.map((row) => row.workerCount));
  const { isPackagePurchase } = await detectPackagePurchase(pricedItems);
  if (isPackagePurchase && !onlinePayment) {
    throw new AppError(400, 'Package purchases require online payment', 'PACKAGE_ONLINE_PAYMENT_REQUIRED');
  }
  if (!isPackagePurchase && (!data.scheduledDate || !data.scheduledFromTime)) {
    throw new AppError(400, 'A date and start time are required', 'SLOT_REQUIRED');
  }

  let overtimeFeeAmount = 0;
  let overtimeMinutes = 0;
  if (data.scheduledDate && data.scheduledFromTime) {
    const primary = pricedItems[0];
    const conflictCheck = await getPoolSlotAvailability(data.cityId, data.scheduledDate, primary.serviceId, {
      serviceVariantId: primary.serviceVariantId,
      quantity: primary.quantity,
      latitude: data.latitude,
      longitude: data.longitude,
    });
    const requestedSlot = conflictCheck.slots.find((slot) => slot.time === data.scheduledFromTime);
    if (!requestedSlot?.available) {
      throw new AppError(409, 'That slot is no longer available', 'SLOT_CONFLICT');
    }
    overtimeFeeAmount = requestedSlot.overtimeFeeAmount ?? 0;
    overtimeMinutes = requestedSlot.overtimeMinutes ?? 0;
  }

  const subtotal = money(pricedItems.reduce((sum, item) => sum + item.totalAmount, 0));
  const taxTotal = money(pricedItems.reduce((sum, item) => sum + item.taxAmount, 0));
  const payableTotal = money(subtotal + taxTotal + overtimeFeeAmount);
  const catalogs = await loadDurationCatalogs(pricedItems);
  const serviceDurationMinutes =
    data.scheduledDate && data.scheduledFromTime ? resolveDurationMinutes(pricedItems, catalogs.services, catalogs.variants) : undefined;
  const slotStartAt =
    data.scheduledDate && data.scheduledFromTime ? new Date(`${data.scheduledDate}T${data.scheduledFromTime}:00+05:30`) : undefined;
  const slotEndAt =
    slotStartAt && serviceDurationMinutes ? new Date(slotStartAt.getTime() + serviceDurationMinutes * 60_000) : undefined;
  const initialStatus = onlinePayment ? 'PENDING_PAYMENT' : 'PENDING_ASSIGNMENT';
  const serviceCategoryId = (await resolveServiceCategoryId(pricedItems)) ?? data.serviceCategoryId;

  const created = await insertBookingWithRetries(
    async () =>
      prisma.booking.create({
        data: {
          bookingNo: generateBookingNumber(),
          idempotencyKey,
          idempotencyScope,
          requestFingerprint,
          creationSource: 'DASHBOARD',
          requiredWorkerCount,
          workerPlanVersion: 1,
          customerId: data.customerId,
          customerAddressId: data.customerAddressId,
          cityId: data.cityId,
          bookedById: actorUserId,
          serviceCategoryId,
          customerName: data.customerName.trim(),
          customerPhone: phone,
          customerAltPhone: data.customerAltPhone,
          customerEmail: data.customerEmail,
          serviceAddress: data.serviceAddress.trim(),
          latitude: data.latitude,
          longitude: data.longitude,
          scheduledDate: data.scheduledDate ? new Date(`${data.scheduledDate}T00:00:00.000Z`) : undefined,
          scheduledFromTime: data.scheduledFromTime,
          scheduledToTime: data.scheduledToTime,
          slotStartAt,
          slotEndAt,
          serviceDurationMinutes,
          status: initialStatus,
          subtotal,
          taxTotal,
          payableTotal,
          overtimeFeeAmount,
          overtimeMinutes,
          paymentStatus: onlinePayment ? 'PENDING' : 'UNPAID',
          paymentMethod: onlinePayment ? 'ONLINE' : (data.paymentMethod ?? 'CASH'),
          customerNotes: data.customerNotes,
          adminNotes: data.adminNotes,
          isPackagePurchase,
          startOtp: isPackagePurchase ? undefined : generateStartOtp(),
          items: {
            create: pricedItems.map((item) => ({
              serviceId: item.serviceId,
              serviceVariantId: item.serviceVariantId,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxAmount: item.taxAmount,
              totalAmount: item.totalAmount,
            })),
          },
          statusHistory: {
            create: {
              toStatus: initialStatus,
              ...bookingAudit({
                actorType: 'DASHBOARD',
                actorId: actorUserId,
                source: 'DASHBOARD',
                reasonCode: 'BOOKING_CREATED',
                reasonText: 'Booking created',
              }),
            },
          },
        },
        select: { id: true },
      }),
    async () => {
      if (!idempotencyKey || !idempotencyScope || !requestFingerprint) return null;
      const replayed = await replayOrConflict(idempotencyScope, idempotencyKey, requestFingerprint);
      return replayed ? { id: replayed.id } : null;
    },
  );

  if (isPackagePurchase && data.customerId && !created.replayed) {
    await createPendingPackages(data.customerId, created.id, pricedItems);
  }

  if (!created.replayed && onlinePayment && data.customerId) {
    const { ensurePaymentOrderForBooking } = await import('../payments/payment.service');
    await ensurePaymentOrderForBooking(data.customerId, created.id);
  } else if (!created.replayed && !isPackagePurchase && !onlinePayment) {
    const { planOrDispatchBooking } = await import('../dispatch/dispatch.service');
    setImmediate(() => {
      planOrDispatchBooking(created.id, 'DASHBOARD_CASH_BOOKING_CREATED').catch(() => undefined);
    });
  }

  return prisma.booking.findFirstOrThrow({ where: { id: created.id }, select: bookingDetailSelect });
}

export async function listDashboardBookings(filter: {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  cityId?: number;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  cashSettled?: boolean;
  q?: string;
}) {
  const page = filter.page ?? 1;
  const limit = Math.min(filter.limit ?? 20, 100);
  const where: Prisma.BookingWhereInput = { deletedAt: null };
  if (filter.status) where.status = filter.status;
  if (filter.cityId) where.cityId = filter.cityId;
  if (filter.customerId) where.customerId = filter.customerId;
  if (filter.paymentMethod) where.paymentMethod = filter.paymentMethod;
  if (typeof filter.cashSettled === 'boolean') where.cashSettled = filter.cashSettled;
  if (filter.q?.trim()) {
    const q = filter.q.trim();
    where.OR = [
      { bookingNo: { contains: q } },
      { customerName: { contains: q } },
      { customerPhone: { contains: q } },
    ];
  }
  if (filter.dateFrom || filter.dateTo) {
    where.scheduledDate = {
      ...(filter.dateFrom ? { gte: new Date(`${filter.dateFrom}T00:00:00.000Z`) } : {}),
      ...(filter.dateTo ? { lte: new Date(`${filter.dateTo}T00:00:00.000Z`) } : {}),
    };
  }
  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      select: bookingListSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { total, page, limit, bookings };
}

export async function getDashboardBooking(id: number) {
  const booking = await prisma.booking.findFirst({
    where: { id, deletedAt: null },
    select: bookingDetailSelect,
  });
  if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
  return booking;
}

export async function cancelBooking(
  bookingId: number,
  actor: {
    type: Exclude<BookingActorType, 'HERO'>;
    id?: number;
    expectedCustomerId?: number;
    source: Extract<BookingMutationSource, 'DASHBOARD' | 'CUSTOMER_APP' | 'RECONCILIATION'>;
    reason?: string;
  },
) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      select: {
        id: true,
        status: true,
        customerId: true,
        paymentStatus: true,
        paymentMethod: true,
        startOtpVerifiedAt: true,
        customerServicePackageId: true,
        dispatch: { select: { id: true, version: true } },
      },
    });
    if (!booking) return null;
    if (actor.expectedCustomerId && booking.customerId !== actor.expectedCustomerId) return null;

    const paidOnlineCustomerCancellation =
      actor.type === 'CUSTOMER' && booking.paymentStatus === 'PAID' && isOnlinePaymentMethod(booking.paymentMethod);
    if (paidOnlineCustomerCancellation && (booking.startOtpVerifiedAt != null || booking.status === 'IN_PROGRESS')) {
      throw new BookingCancellationPolicyError('PAID_BOOKING_SERVICE_ALREADY_STARTED');
    }
    if (booking.status === 'CANCELLED') return { changed: false, bookingId: booking.id };

    assertBookingTransition({
      from: booking.status,
      to: 'CANCELLED',
      actorType: actor.type,
      reason: actor.reason,
    });

    const refundRequired = paidOnlineCustomerCancellation;
    const now = new Date();
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        version: { increment: 1 },
        statusHistory: {
          create: {
            fromStatus: booking.status,
            toStatus: 'CANCELLED',
            ...bookingAudit({
              actorType: actor.type,
              actorId: actor.id,
              source: actor.source,
              reasonCode: refundRequired ? 'CUSTOMER_CANCELLED_REFUND_REQUIRED' : `${actor.type}_CANCELLED`,
              reasonText: refundRequired
                ? 'Cancellation requested. Refund pending ops review.'
                : actor.reason ?? `Cancelled by ${actor.type.toLowerCase()}`,
            }),
          },
        },
      },
    });

    await Promise.all([
      tx.bookingTeamRequest.updateMany({
        where: { bookingId, status: 'PENDING' },
        data: { status: 'CANCELLED', respondedAt: now },
      }),
      tx.bookingTeamMember.updateMany({
        where: { bookingId, status: 'ACTIVE' },
        data: { status: 'REMOVED', leftAt: now },
      }),
      tx.bookingAssignment.updateMany({
        where: { bookingId, status: { in: ['ASSIGNED', 'ACCEPTED', 'STARTED'] } },
        data: { status: 'CANCELLED', cancelledAt: now, cancelReason: actor.reason ?? 'Booking cancelled' },
      }),
      tx.bookingRouteReservation.updateMany({
        where: { bookingId, status: 'ACTIVE' },
        data: { status: 'RELEASED', releasedAt: now, releaseReason: 'Booking cancelled' },
      }),
    ]);

    if (booking.dispatch) {
      await Promise.all([
        tx.bookingOfferAttempt.updateMany({
          where: { dispatchId: booking.dispatch.id, status: { in: ['PENDING', 'DELIVERED'] } },
          data: { status: 'CANCELLED', cancelledAt: now, activeKey: null, failureCode: 'BOOKING_CANCELLED' },
        }),
        tx.bookingDispatchParticipant.updateMany({
          where: { dispatchId: booking.dispatch.id },
          data: { participantState: 'CANCELLED', currentOfferAttemptId: null },
        }),
        tx.bookingDispatch.update({
          where: { id: booking.dispatch.id },
          data: {
            dispatchState: 'CANCELLED',
            failureCode: 'BOOKING_CANCELLED',
            nextAttemptAt: null,
            currentOfferAttemptId: null,
            currentCandidateHeroId: null,
            leaseOwner: null,
            leaseExpiresAt: null,
          },
        }),
      ]);
    }

    if (booking.customerServicePackageId) {
      const pkg = await tx.customerServicePackage.findUnique({
        where: { id: booking.customerServicePackageId },
        select: { usedVisits: true, endDate: true },
      });
      if (pkg && pkg.usedVisits > 0) {
        await tx.customerServicePackage.update({
          where: { id: booking.customerServicePackageId },
          data: {
            usedVisits: { decrement: 1 },
            status: pkg.endDate >= now ? 'ACTIVE' : 'EXPIRED',
          },
        });
      }
    }

    return { changed: true, bookingId: booking.id };
  });

  if (!result) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
  return prisma.booking.findFirstOrThrow({ where: { id: result.bookingId }, select: bookingDetailSelect });
}

export async function getDashboardSlotAvailability(
  cityId: number,
  date: string,
  serviceId: number,
  options: { serviceVariantId?: number; quantity?: number; latitude?: number; longitude?: number } = {},
) {
  return getPoolSlotAvailability(cityId, date, serviceId, options);
}
