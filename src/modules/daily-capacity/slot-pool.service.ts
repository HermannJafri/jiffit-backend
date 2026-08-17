import type { BookingStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { pickServiceableHub } from '../../utils/haversine';
import { logger } from '../../utils/logger';
import {
  bookingsRelevantToShift,
  clampSameDayHeroPool,
  DEFAULT_BUFFER_MINUTES,
  FIRST_SLOT_OFFSET,
  generateRangeSlots,
  indiaDateKey,
  indiaNowMinutes,
  isDayShiftWindow,
  MIN_ADVANCE_MINUTES,
  SLOT_INTERVAL,
  timeToMin,
  type SlotResult,
} from './slot-pool-core';

const ACTIVE_STATUSES: BookingStatus[] = [
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'ACCEPTED',
  'ON_THE_WAY',
  'ARRIVED',
  'IN_PROGRESS',
];

export type { SlotResult };

export interface PoolAvailabilityResult {
  service: { id: number; name: string; duration: number; workerCount: number };
  hub: { id: number; cityId: number } | null;
  totalCheckedIn: number;
  shifts: Array<{ name: string; heroPool: number }>;
  slots: SlotResult[];
}

async function getBufferMinutes(): Promise<number> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: 'booking.bufferMinutes' },
    select: { value: true },
  });
  const parsed = Number(setting?.value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_BUFFER_MINUTES;
}

async function getServiceInfo(serviceId: number, serviceVariantId?: number, quantity = 1) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, name: true, duration: true, workerCount: true },
  });
  if (!service) throw new Error(`Service ${serviceId} not found`);

  let durationMinutes = service.duration ?? 60;
  if (serviceVariantId) {
    const variant = await prisma.serviceVariant.findFirst({
      where: { id: serviceVariantId, serviceId },
      select: { durationMinutes: true },
    });
    if (variant) durationMinutes = variant.durationMinutes;
  }

  return {
    id: service.id,
    name: service.name,
    durationMinutes: durationMinutes * Math.max(1, Math.trunc(quantity)),
    workerCount: service.workerCount ?? 1,
  };
}

interface ShiftPool {
  scheduleId: number;
  name: string;
  shiftStart: string;
  shiftEnd: string;
  heroPool: number;
}

async function getShiftPoolsForGroup(groupId: number, capacityDate: Date): Promise<ShiftPool[]> {
  const entries = await prisma.bookingCapacityDaily.findMany({
    where: { groupId, capacityDate },
    select: {
      heroCount: true,
      workSchedule: { select: { id: true, name: true, shiftStart: true, shiftEnd: true, isActive: true, bookingEnabled: true } },
    },
  });

  if (entries.length > 0) {
    return entries
      .filter(
        (entry) =>
          entry.workSchedule.isActive &&
          entry.workSchedule.bookingEnabled &&
          isDayShiftWindow(entry.workSchedule.shiftStart, entry.workSchedule.shiftEnd),
      )
      .map((entry) => ({
        scheduleId: entry.workSchedule.id,
        name: entry.workSchedule.name,
        shiftStart: entry.workSchedule.shiftStart,
        shiftEnd: entry.workSchedule.shiftEnd,
        heroPool: entry.heroCount,
      }));
  }

  const globalShifts = await prisma.workSchedule.findMany({
    where: { scope: 'GLOBAL', isActive: true, bookingEnabled: true },
    select: { id: true, name: true, shiftStart: true, shiftEnd: true },
    orderBy: { shiftStart: 'asc' },
  });

  return globalShifts
    .map((shift) => ({
      scheduleId: shift.id,
      name: shift.name,
      shiftStart: shift.shiftStart,
      shiftEnd: shift.shiftEnd,
      heroPool: 0,
    }))
    .filter((shift) => isDayShiftWindow(shift.shiftStart, shift.shiftEnd));
}

async function getCapacityGroupIdForService(serviceId: number, hubId: number): Promise<number | null> {
  const group = await prisma.bookingCapacityGroup.findFirst({
    where: { hubId, isActive: true, services: { some: { serviceId } } },
    select: { id: true },
  });
  return group?.id ?? null;
}

async function getServiceIdsInGroup(groupId: number): Promise<number[]> {
  const links = await prisma.bookingCapacityGroupService.findMany({
    where: { groupId },
    select: { serviceId: true },
  });
  return links.map((link) => link.serviceId);
}

async function getActualCheckins(hubId: number, dateStr: string): Promise<number> {
  const dayStart = new Date(`${dateStr}T00:00:00+05:30`);
  const dayEnd = new Date(`${dateStr}T23:59:59+05:30`);
  return prisma.heroAttendance.count({
    where: {
      hubId,
      checkedInAt: { gte: dayStart, lte: dayEnd },
      checkedOutAt: null,
    },
  });
}

async function getActiveBookings(hubId: number, groupId: number, dateStr: string) {
  const hub = await prisma.hub.findUnique({ where: { id: hubId }, select: { cityId: true } });
  if (!hub) return [];

  const groupServiceIds = await getServiceIdsInGroup(groupId);
  if (groupServiceIds.length === 0) return [];

  const groupServices = await prisma.service.findMany({
    where: { id: { in: groupServiceIds }, isActive: true },
    select: { id: true, workerCount: true },
  });
  if (groupServices.length === 0) return [];

  const serviceIds = groupServices.map((service) => service.id);
  const workerByService = new Map(groupServices.map((service) => [service.id, service.workerCount ?? 1]));
  const capacityDate = new Date(`${dateStr}T00:00:00.000Z`);

  const bookings = await prisma.booking.findMany({
    where: {
      cityId: hub.cityId,
      scheduledDate: capacityDate,
      status: { in: ACTIVE_STATUSES },
      deletedAt: null,
      items: { some: { serviceId: { in: serviceIds } } },
    },
    select: {
      slotStartAt: true,
      slotEndAt: true,
      scheduledFromTime: true,
      scheduledToTime: true,
      serviceDurationMinutes: true,
      items: { select: { serviceId: true, service: { select: { workerCount: true } } } },
    },
  });

  return bookings.flatMap((booking) => {
    let slotStartMs: number | null = null;
    if (booking.slotStartAt) slotStartMs = booking.slotStartAt.getTime();
    else if (booking.scheduledFromTime) slotStartMs = new Date(`${dateStr}T${booking.scheduledFromTime}:00+05:30`).getTime();
    if (slotStartMs === null) return [];

    let slotEndMs: number;
    if (booking.slotEndAt) {
      slotEndMs = booking.slotEndAt.getTime();
    } else if (booking.scheduledToTime) {
      let endMs = new Date(`${dateStr}T${booking.scheduledToTime}:00+05:30`).getTime();
      if (endMs <= slotStartMs) endMs += 24 * 60 * 60_000;
      slotEndMs = endMs;
    } else {
      slotEndMs = slotStartMs + (booking.serviceDurationMinutes ?? 60) * 60_000;
    }

    const workerCount = Math.max(
      1,
      ...booking.items.map((item) => item.service?.workerCount ?? (item.serviceId != null ? (workerByService.get(item.serviceId) ?? 1) : 1)),
    );
    return [{ workerCount, slotStartMs, slotEndMs }];
  });
}

export async function getPoolSlotAvailability(
  cityId: number,
  dateStr: string,
  serviceId: number,
  options: {
    serviceVariantId?: number;
    quantity?: number;
    latitude?: number;
    longitude?: number;
    minAdvanceMinutes?: number;
    overtimeRatePerHour?: number | null;
  } = {},
): Promise<PoolAvailabilityResult> {
  const service = await getServiceInfo(serviceId, options.serviceVariantId, options.quantity);
  const bufferMinutes = await getBufferMinutes();

  const hubRows = await prisma.hub.findMany({
    where: {
      cityId,
      isActive: true,
      serviceAvailability: { some: { serviceId, isActive: true } },
    },
    select: {
      id: true,
      name: true,
      cityId: true,
      latitude: true,
      longitude: true,
      serviceRadiusMeters: true,
    },
    orderBy: { id: 'asc' },
  });

  const hasCustomerLocation = Number.isFinite(options.latitude) && Number.isFinite(options.longitude);
  const selectedHub = hasCustomerLocation
    ? pickServiceableHub(options.latitude!, options.longitude!, hubRows)
    : hubRows[0] ?? null;
  const hub = selectedHub ? { id: selectedHub.id, cityId: selectedHub.cityId } : null;

  const emptyResult: PoolAvailabilityResult = {
    service: { id: service.id, name: service.name, duration: service.durationMinutes, workerCount: service.workerCount },
    hub,
    totalCheckedIn: 0,
    shifts: [],
    slots: [],
  };
  if (!hub) return emptyResult;

  const groupId = await getCapacityGroupIdForService(serviceId, hub.id);
  if (!groupId) return emptyResult;

  const todayStr = indiaDateKey();
  const isSameDay = dateStr === todayStr;
  const nowMin = isSameDay ? indiaNowMinutes() : 0;
  const capacityDate = new Date(`${dateStr}T00:00:00.000Z`);
  const shiftPools = await getShiftPoolsForGroup(groupId, capacityDate);
  const configuredShifts = shiftPools.filter((shift) => shift.heroPool > 0);

  let totalCheckedIn = 0;
  let effectiveShifts = configuredShifts;
  if (isSameDay) {
    totalCheckedIn = await getActualCheckins(hub.id, dateStr);
    effectiveShifts = configuredShifts
      .map((shift) => ({
        ...shift,
        heroPool: clampSameDayHeroPool(shift.heroPool, shift.shiftStart, nowMin, totalCheckedIn),
      }))
      .filter((shift) => shift.heroPool > 0);
  }

  const activeBookings = await getActiveBookings(hub.id, groupId, dateStr);
  const baseDateMs = new Date(`${dateStr}T00:00:00+05:30`).getTime();
  const allSlots: SlotResult[] = [];

  for (const shift of effectiveShifts) {
    const shiftStartMin = timeToMin(shift.shiftStart);
    const shiftEndMin = timeToMin(shift.shiftEnd);
    let from = shiftStartMin + FIRST_SLOT_OFFSET;
    if (isSameDay) {
      const minAdvanceMinutes = Math.max(0, options.minAdvanceMinutes ?? MIN_ADVANCE_MINUTES);
      const earliest = Math.ceil((nowMin + minAdvanceMinutes) / SLOT_INTERVAL) * SLOT_INTERVAL;
      from = Math.max(from, earliest);
    }
    allSlots.push(
      ...generateRangeSlots({
        fromMin: from,
        toMin: shiftEndMin,
        shiftName: shift.name,
        heroPool: shift.heroPool,
        durationMinutes: service.durationMinutes,
        workerCount: service.workerCount,
        activeBookings: bookingsRelevantToShift(activeBookings, baseDateMs, shiftStartMin),
        baseDateMs,
        bufferMinutes,
        overtimeRatePerHour: options.overtimeRatePerHour,
      }),
    );
  }

  allSlots.sort((a, b) => a.slotStartAt.localeCompare(b.slotStartAt));
  logger.info('[slot-pool] slots generated', {
    dateStr,
    hubId: hub.id,
    totalSlots: allSlots.length,
    availableSlots: allSlots.filter((slot) => slot.available).length,
  });

  return {
    service: { id: service.id, name: service.name, duration: service.durationMinutes, workerCount: service.workerCount },
    hub,
    totalCheckedIn,
    shifts: effectiveShifts.map((shift) => ({ name: shift.name, heroPool: shift.heroPool })),
    slots: allSlots,
  };
}
