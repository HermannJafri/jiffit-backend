import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { normalizeIndianMobile } from '../utils/phone';
import { mapLegacyTable } from './legacy-map';

const FORBIDDEN_TARGET_DBS = new Set([
  'jiffit_dev',
  'jiffit-db',
  'jiffit_backend',
  'jiffit_db',
  'jiffit_old_backup',
  'jiffit_test',
  'jiffit_v2_local_test',
  'jiffit_v2_staging',
  'old_import_jiffit',
  'old_import_staging',
  'jiffit_legacy_source',
  'mysql',
  'sys',
  'performance_schema',
  'information_schema',
  'sakila',
  'world',
]);

const CITY_COORDS: Record<string, { lat: string; lng: string }> = {
  Patna: { lat: '25.5941', lng: '85.1376' },
  Ranchi: { lat: '23.3441', lng: '85.3096' },
  Lucknow: { lat: '26.8467', lng: '80.9462' },
};

type Fail = { table: string; sourceId: number; reason: string };
type Warning = { table: string; sourceId: number; reason: string; rawValue?: string | null };

function databaseName(url: string): string {
  const db = url.split('/').pop()?.split('?')[0] ?? '';
  return decodeURIComponent(db);
}

export function assertIsolatedTargetUrl(url: string): string {
  const name = databaseName(url);
  if (!name || FORBIDDEN_TARGET_DBS.has(name) || !name.startsWith('jiffit_migration')) {
    throw new Error(`Refusing to apply migration to database '${name || '(empty)'}'. Use jiffit_migration_target (or jiffit_migration_*).`);
  }
  return name;
}

function num(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function clip(value: unknown, max: number): string {
  return String(value ?? '').slice(0, max);
}

function parseJson(value: unknown): unknown {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function jsonForStorage(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'object') return value as Prisma.InputJsonValue;
  try {
    return JSON.parse(String(value)) as Prisma.InputJsonValue;
  } catch {
    return String(value);
  }
}

export function parseLegacyDate(value: unknown): { date: Date | null; raw: string | null } {
  if (value == null || value === '') return { date: null, raw: null };
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? { date: null, raw: String(value) } : { date: value, raw: null };
  }
  const raw = String(value).trim();
  if (!raw || raw.startsWith('0000-')) return { date: null, raw: raw || null };
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : `${raw.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? { date: null, raw } : { date, raw: null };
}

export function parseLegacyCoordinate(
  value: unknown,
  min: number,
  max: number,
): { value: number | null; raw: string | null; invalid: boolean } {
  if (value == null || value === '') return { value: null, raw: null, invalid: false };
  const raw = String(value).trim();
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return { value: null, raw, invalid: true };
  return { value: Number(parsed.toFixed(8)), raw, invalid: false };
}

async function createManyIsolated<T>(
  table: string,
  rows: T[],
  sourceId: (row: T) => number,
  create: (chunk: T[]) => Promise<number>,
  failed: Fail[],
): Promise<number> {
  if (!rows.length) return 0;
  try {
    return await create(rows);
  } catch (error) {
    if (rows.length === 1) {
      failed.push({
        table,
        sourceId: sourceId(rows[0]!),
        reason: error instanceof Error ? error.message : 'record create failed',
      });
      return 0;
    }
    const middle = Math.floor(rows.length / 2);
    return (
      (await createManyIsolated(table, rows.slice(0, middle), sourceId, create, failed)) +
      (await createManyIsolated(table, rows.slice(middle), sourceId, create, failed))
    );
  }
}

function mapOrderStatus(raw: unknown): { status: 'COMPLETED' | 'CANCELLED' | 'LEGACY_ARCHIVED'; original: string } {
  const original = String(raw ?? '').trim();
  const key = original.toUpperCase();
  if (key === '10' || key === 'COMPLETED' || key === 'COMPLETE') return { status: 'COMPLETED', original };
  if (key === '7' || key === 'CANCELED' || key === 'CANCELLED' || key === 'CANCEL') return { status: 'CANCELLED', original };
  return { status: 'LEGACY_ARCHIVED', original: original || 'UNKNOWN' };
}

function mapWalletType(raw: unknown): 'RECEIPT' | 'CHARGE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' {
  const n = Number(raw);
  if (n === 2) return 'CHARGE';
  if (n === 3) return 'CREDIT_NOTE';
  if (n === 4) return 'DEBIT_NOTE';
  return 'RECEIPT';
}

function mapTaskStatus(raw: unknown): { status: 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'CONFIRMED' | 'IN_PROGRESS' | 'UNKNOWN'; raw: string } {
  const value = String(raw ?? '').trim();
  const key = value.toUpperCase();
  if (['COMPLETED', 'COMPLETE', 'DONE', '10'].includes(key)) return { status: 'COMPLETED', raw: value };
  if (['CANCELLED', 'CANCELED', 'CANCEL', '7'].includes(key)) return { status: 'CANCELLED', raw: value };
  if (['FAILED', 'FAIL'].includes(key)) return { status: 'FAILED', raw: value };
  if (['CONFIRMED', 'CONFIRM'].includes(key)) return { status: 'CONFIRMED', raw: value };
  if (['IN_PROGRESS', 'RUNNING', 'STARTED', '5'].includes(key)) return { status: 'IN_PROGRESS', raw: value };
  return { status: 'UNKNOWN', raw: value || 'UNKNOWN' };
}

async function pagedQuery<T extends Record<string, unknown>>(
  source: PrismaClient,
  sql: string,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const rows = await source.$queryRawUnsafe<T[]>(`${sql} LIMIT ${pageSize} OFFSET ${offset}`);
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

export async function applyLegacyImport(input: { sourceUrl: string; targetUrl: string; dump?: string }) {
  const targetName = assertIsolatedTargetUrl(input.targetUrl);
  const sourceName = databaseName(input.sourceUrl);
  if (sourceName === targetName) throw new Error('Source and target databases must be different');

  const source = new PrismaClient({ datasources: { db: { url: input.sourceUrl } } });
  const target = new PrismaClient({ datasources: { db: { url: input.targetUrl } } });
  const failed: Fail[] = [];
  const warnings: Warning[] = [];
  const startedAt = new Date().toISOString();

  try {
    await source.$connect();
    await target.$connect();

    const sourceCounts = await source.$queryRaw<Array<{ table_name: string; c: bigint }>>`
      SELECT 'users' AS table_name, COUNT(*) AS c FROM users
      UNION ALL SELECT 'orders', COUNT(*) FROM orders
      UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
      UNION ALL SELECT 'address', COUNT(*) FROM address
      UNION ALL SELECT 'wallet_trn', COUNT(*) FROM wallet_trn
      UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
      UNION ALL SELECT 'cities', COUNT(*) FROM cities
      UNION ALL SELECT 'admin', COUNT(*) FROM admin
      UNION ALL SELECT 'tags', COUNT(*) FROM tags
      UNION ALL SELECT 'vendor_rates', COUNT(*) FROM vendor_rates
      UNION ALL SELECT 'payments', COUNT(*) FROM payments
    `;
    const sourceCount = Object.fromEntries(sourceCounts.map((row) => [row.table_name, num(row.c)]));
    const walletSumRows = await source.$queryRaw<Array<{ s: unknown; c: bigint }>>`
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL(20, 2))), 0) AS s, COUNT(*) AS c FROM wallet_trn
    `;
    const userRoleCounts = await source.$queryRaw<Array<{ role: unknown; c: bigint }>>`
      SELECT role, COUNT(*) AS c FROM users GROUP BY role ORDER BY role
    `;

    const existingLegacy = await target.booking.count({ where: { bookingNo: { startsWith: 'LEGACY-' } } });
    if (existingLegacy > 0) {
      throw new Error(`Target already has ${existingLegacy} LEGACY-* bookings. Use a fresh jiffit_migration_* database.`);
    }

    const state = await target.state.upsert({
      where: { code: 'LEG' },
      update: {},
      create: { name: 'Legacy import', code: 'LEG' },
    });

    const cities = (await source.$queryRaw<Array<{ id: number; city: string; photo: string | null; status: number }>>`SELECT id, city, photo, status FROM cities`).map(
      (city) => ({ ...city, id: num(city.id), status: num(city.status) }),
    );
    const cityMap = new Map<number, number>();
    for (const city of cities) {
      const coords = CITY_COORDS[city.city] ?? { lat: '0', lng: '0' };
      const created = await target.city.create({
        data: {
          stateId: state.id,
          name: city.city,
          imageUrl: city.photo,
          isActive: city.status === 1,
          hubs: {
            create: {
              name: `${city.city} default hub`,
              address: `${city.city} (legacy default hub)`,
              latitude: coords.lat,
              longitude: coords.lng,
              checkinRadiusMeters: 5000,
              serviceRadiusMeters: 15000,
            },
          },
        },
      });
      cityMap.set(city.id, created.id);
    }
    const fallbackCityId = [...cityMap.values()][0];
    if (!fallbackCityId) throw new Error('No cities imported; cannot continue');

    const disabledPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    const legacyAdmins = await pagedQuery<{
      id: number;
      username: string | null;
      email: string | null;
      full_name: string | null;
      address: string | null;
      city_id: number | null;
      mobile: string | null;
      alt_mobile: string | null;
      bank_ac_name: string | null;
      bank_ac_no: string | null;
      bank_ac_ifsc: string | null;
      status: number;
      created_at_raw: string | null;
    }>(
      source,
      'SELECT id, username, email, full_name, address, city_id, mobile, alt_mobile, bank_ac_name, bank_ac_no, bank_ac_ifsc, status, CAST(created_at AS CHAR) AS created_at_raw FROM admin ORDER BY id',
    );
    const usedAdminEmails = new Set<string>();
    const usedAdminPhones = new Set<string>();
    const adminRows = legacyAdmins.map((row) => {
      const sourceId = num(row.id);
      const created = parseLegacyDate(row.created_at_raw);
      if (created.raw) warnings.push({ table: 'admin', sourceId, reason: 'invalid created_at preserved as warning', rawValue: created.raw });
      const emailCandidate = clip(row.email?.trim(), 100) || null;
      const email = emailCandidate && !usedAdminEmails.has(emailCandidate.toLowerCase()) ? emailCandidate : null;
      if (email) usedAdminEmails.add(email.toLowerCase());
      const phoneCandidate = normalizeIndianMobile(row.mobile ?? '');
      const phone = phoneCandidate && !usedAdminPhones.has(phoneCandidate) ? phoneCandidate : null;
      if (phone) usedAdminPhones.add(phone);
      return {
        sourceId,
        data: {
          legacyAdminId: sourceId,
          username: `legacy-${sourceId}-${clip(row.username || 'admin', 30)}`,
          passwordHash: disabledPasswordHash,
          name: clip(row.full_name || row.username || `Legacy admin ${sourceId}`, 100),
          email,
          phone,
          alternatePhone: normalizeIndianMobile(row.alt_mobile ?? ''),
          role: 'OPERATIONS',
          cityId: cityMap.get(num(row.city_id)) ?? null,
          address: row.address,
          bankAccountNumber: clip(row.bank_ac_no, 30) || null,
          bankIfsc: clip(row.bank_ac_ifsc, 15) || null,
          mustResetPassword: true,
          isActive: false,
          createdAt: created.date ?? undefined,
        },
      };
    });
    let adminsImported = 0;
    for (let i = 0; i < adminRows.length; i += 200) {
      adminsImported += await createManyIsolated(
        'admin',
        adminRows.slice(i, i + 200),
        (row) => row.sourceId,
        async (chunk) => (await target.dashboardUser.createMany({ data: chunk.map((row) => row.data) })).count,
        failed,
      );
    }

    const users = await pagedQuery<{
      id: number;
      role: number;
      mobile: string | null;
      username: string | null;
      name: string | null;
      email: string | null;
      photo: string | null;
      city: number;
      status: number;
      created_at_raw: string | null;
    }>(source, 'SELECT id, role, mobile, username, name, email, photo, city, status, CAST(created_at AS CHAR) AS created_at_raw FROM users ORDER BY id');
    const normalizedUsers = users.map((user) => ({
      ...user,
      id: num(user.id),
      role: num(user.role),
      city: num(user.city),
      status: num(user.status),
    }));

    const usedCustomerPhones = new Set<string>();
    const usedHeroPhones = new Set<string>();
    const usedEmails = new Set<string>();
    const customerRows: Array<{
      phone: string;
      legacyUserId: number;
      name: string | null;
      email: string | null;
      profilePhotoUrl: string | null;
      createdAt?: Date;
    }> = [];
    const heroRows: Array<{
      phone: string;
      legacyUserId: number;
      name: string | null;
      email: string | null;
      profilePhotoUrl: string | null;
      cityId: number;
      status: 'VERIFIED' | 'INCOMPLETE';
      needsSpotCheck: boolean;
      createdAt?: Date;
    }> = [];

    for (const user of normalizedUsers) {
      const phone = normalizeIndianMobile(user.mobile ?? user.username ?? '');
      if (!phone) {
        failed.push({ table: 'users', sourceId: user.id, reason: 'invalid mobile' });
        continue;
      }
      const emailRaw = user.email?.trim() || null;
      const email = emailRaw && !usedEmails.has(emailRaw.toLowerCase()) ? emailRaw : null;
      if (email) usedEmails.add(email.toLowerCase());
      const cityId = cityMap.get(user.city) ?? fallbackCityId;
      const created = parseLegacyDate(user.created_at_raw);
      if (created.raw) warnings.push({ table: 'users', sourceId: user.id, reason: 'invalid created_at', rawValue: created.raw });
      if (Number(user.role) === 1) {
        if (usedHeroPhones.has(phone)) {
          failed.push({ table: 'users', sourceId: user.id, reason: 'duplicate hero phone' });
          continue;
        }
        usedHeroPhones.add(phone);
        heroRows.push({
          phone,
          legacyUserId: user.id,
          name: user.name,
          email,
          profilePhotoUrl: user.photo,
          cityId,
          status: user.status === 1 ? 'VERIFIED' : 'INCOMPLETE',
          needsSpotCheck: user.status === 1,
          createdAt: created.date ?? undefined,
        });
      } else {
        if (usedCustomerPhones.has(phone)) {
          failed.push({ table: 'users', sourceId: user.id, reason: 'duplicate customer phone' });
          continue;
        }
        usedCustomerPhones.add(phone);
        customerRows.push({
          phone,
          legacyUserId: user.id,
          name: user.name,
          email,
          profilePhotoUrl: user.photo,
          createdAt: created.date ?? undefined,
        });
      }
    }
    for (let i = 0; i < customerRows.length; i += 500) {
      await target.customer.createMany({ data: customerRows.slice(i, i + 500), skipDuplicates: true });
    }
    for (let i = 0; i < heroRows.length; i += 500) {
      await target.hero.createMany({ data: heroRows.slice(i, i + 500), skipDuplicates: true });
    }
    const customerMap = new Map<number, number>();
    const heroMap = new Map<number, number>();
    const importedCustomers = await target.customer.findMany({
      where: { legacyUserId: { not: null } },
      select: { id: true, legacyUserId: true },
    });
    for (const row of importedCustomers) {
      if (row.legacyUserId != null) customerMap.set(row.legacyUserId, row.id);
    }
    const importedHeroes = await target.hero.findMany({
      where: { legacyUserId: { not: null } },
      select: { id: true, legacyUserId: true },
    });
    for (const row of importedHeroes) {
      if (row.legacyUserId != null) heroMap.set(row.legacyUserId, row.id);
    }
    const customersImported = customerMap.size;
    const heroesImported = heroMap.size;

    const addresses = (await pagedQuery<{
      id: number;
      user_id: number;
      add_type: string;
      address: string;
      pincode: string | null;
      lat: string | null;
      lng: string | null;
      city_id: number | null;
      created_at_raw: string | null;
    }>(source, 'SELECT id, user_id, add_type, address, pincode, lat, lng, city_id, CAST(created_at AS CHAR) AS created_at_raw FROM address ORDER BY id')).map((row) => ({
      ...row,
      id: num(row.id),
      user_id: num(row.user_id),
      city_id: row.city_id == null ? null : num(row.city_id),
    }));
    let addressesImported = 0;
    for (let i = 0; i < addresses.length; i += 500) {
      const chunk = addresses.slice(i, i + 500);
      const result = await target.legacyCustomerAddress.createMany({
        data: chunk.map((row) => ({
          customerId: customerMap.get(row.user_id) ?? null,
          rawAddressText: row.address || '(empty)',
          rawAddType: clip(row.add_type, 200),
          rawCity: row.city_id != null ? String(row.city_id) : null,
          rawPincode: clip(row.pincode, 200) || null,
          rawLat: clip(row.lat, 50) || null,
          rawLng: clip(row.lng, 50) || null,
          sourceAddressId: row.id,
          legacyUserId: row.user_id,
          sourceCreatedAt: parseLegacyDate(row.created_at_raw).date,
        })),
        skipDuplicates: true,
      });
      addressesImported += result.count;
    }

    const orders = (await pagedQuery<{
      id: number;
      name: string;
      address: string | null;
      city_id: number;
      mobile: string;
      mobile_alt: string | null;
      email: string | null;
      user_id: number | null;
      items: string | null;
      order_total: number | null;
      discount: number;
      tax_total: number;
      sub_total: number;
      coupon_code: string | null;
      advance_payment: number;
      final_payment: number;
      payment_method: string | null;
      notes: string | null;
      admin_notes: string | null;
      pickup_date: string | null;
      pickup_time: string | null;
      delivery_date_raw: string | null;
      delivery_agent: number | null;
      lat: string | null;
      lng: string | null;
      status: string | null;
      pay_status: string | null;
      is_subscription: number | null;
      created_at_raw: string | null;
    }>(
      source,
      `SELECT id, name, address, city_id, mobile, mobile_alt, email, user_id, items, CAST(order_total AS DECIMAL(20,2)) AS order_total, CAST(discount AS DECIMAL(20,2)) AS discount, CAST(tax_total AS DECIMAL(20,2)) AS tax_total, CAST(sub_total AS DECIMAL(20,2)) AS sub_total, coupon_code, CAST(advance_payment AS DECIMAL(20,2)) AS advance_payment, CAST(final_payment AS DECIMAL(20,2)) AS final_payment, payment_method, notes, admin_notes, pickup_date, pickup_time, CAST(delivery_date AS CHAR) AS delivery_date_raw, delivery_agent, lat, lng, status, pay_status, is_subscription, CAST(created_at AS CHAR) AS created_at_raw FROM orders ORDER BY id`,
    )).map((order) => ({
      ...order,
      id: num(order.id),
      city_id: num(order.city_id),
      user_id: order.user_id == null ? null : num(order.user_id),
      delivery_agent: order.delivery_agent == null ? null : num(order.delivery_agent),
      order_total: order.order_total == null ? null : num(order.order_total),
      discount: num(order.discount),
      tax_total: num(order.tax_total),
      sub_total: num(order.sub_total),
      advance_payment: num(order.advance_payment),
      final_payment: num(order.final_payment),
      is_subscription: num(order.is_subscription),
    }));

    const bookingRows: Array<{ sourceId: number; data: Prisma.BookingCreateManyInput }> = [];
    const pendingItems: Array<{ sourceOrderId: number; items: Array<{ name: string; description?: string; quantity: number; unitPrice: number; totalAmount: number }> }> = [];
    for (const order of orders) {
      const mapped = mapOrderStatus(order.status);
      const cityId = cityMap.get(order.city_id) ?? fallbackCityId;
      const customerId = order.user_id ? customerMap.get(order.user_id) ?? null : null;
      const parsedItems = parseJson(order.items);
      const itemRows = Array.isArray(parsedItems) ? parsedItems : [];
      const subtotal = money(order.sub_total);
      const taxTotal = money(order.tax_total);
      const payableTotal = money(order.order_total ?? subtotal + taxTotal);
      const scheduled = parseLegacyDate(order.delivery_date_raw || order.pickup_date);
      const created = parseLegacyDate(order.created_at_raw);
      const latitude = parseLegacyCoordinate(order.lat, -90, 90);
      const longitude = parseLegacyCoordinate(order.lng, -180, 180);
      if (scheduled.raw) warnings.push({ table: 'orders', sourceId: order.id, reason: 'invalid scheduled date', rawValue: scheduled.raw });
      if (created.raw) warnings.push({ table: 'orders', sourceId: order.id, reason: 'invalid created_at', rawValue: created.raw });
      if (latitude.invalid) warnings.push({ table: 'orders', sourceId: order.id, reason: 'invalid latitude stored only as raw value', rawValue: latitude.raw });
      if (longitude.invalid) warnings.push({ table: 'orders', sourceId: order.id, reason: 'invalid longitude stored only as raw value', rawValue: longitude.raw });
      bookingRows.push({ sourceId: order.id, data: {
        bookingNo: `LEGACY-${order.id}`,
        legacyOrderId: order.id,
        customerId,
        cityId,
        status: mapped.status,
        creationSource: 'LEGACY',
        legacyOriginalStatus: mapped.status === 'LEGACY_ARCHIVED' ? clip(mapped.original, 30) : null,
        legacyAssignedHeroId: order.delivery_agent ? heroMap.get(order.delivery_agent) ?? null : null,
        legacyTimeSlotLabel: clip(order.pickup_time, 30) || null,
        customerName: clip(order.name, 100) || 'Legacy customer',
        customerPhone: normalizeIndianMobile(order.mobile) ?? (clip(order.mobile, 15) || '0000000000'),
        customerAltPhone: order.mobile_alt ? clip(order.mobile_alt, 15) : null,
        customerEmail: clip(order.email, 100) || null,
        serviceAddress: order.address || 'Legacy address',
        latitude: latitude.value,
        longitude: longitude.value,
        legacyRawLatitude: latitude.raw,
        legacyRawLongitude: longitude.raw,
        legacyRawItems: jsonForStorage(order.items),
        scheduledDate: scheduled.date,
        subtotal,
        discountTotal: money(order.discount),
        taxTotal,
        payableTotal,
        advancePaid: money(order.advance_payment),
        finalPaid: money(order.final_payment),
        couponCode: clip(order.coupon_code, 50) || null,
        paymentStatus: mapped.status === 'COMPLETED' || Number(order.final_payment) > 0 ? ('PAID' as const) : ('UNPAID' as const),
        paymentMethod: clip(order.payment_method, 50) || null,
        customerNotes: order.notes,
        adminNotes: order.admin_notes,
        isPackagePurchase: Boolean(order.is_subscription),
        completedAt: mapped.status === 'COMPLETED' ? created.date : null,
        createdAt: created.date ?? undefined,
      } });
      pendingItems.push({
        sourceOrderId: order.id,
        items:
          itemRows.length > 0
            ? itemRows.slice(0, 20).map((item) => {
                const row = item as Record<string, unknown>;
                const qty = Math.max(1, Number(row.qty ?? row.quantity ?? 1) || 1);
                const rate = money(row.rate ?? row.unitPrice ?? row.price ?? 0);
                return {
                  name: clip(row.name ?? row.item ?? 'Legacy item', 150) || 'Legacy item',
                  description: row.description ? String(row.description) : undefined,
                  quantity: qty,
                  unitPrice: rate,
                  totalAmount: money(row.total ?? rate * qty),
                };
              })
            : [{ name: 'Legacy booking', quantity: 1, unitPrice: payableTotal, totalAmount: payableTotal }],
      });
    }
    for (let i = 0; i < bookingRows.length; i += 200) {
      await createManyIsolated(
        'orders',
        bookingRows.slice(i, i + 200),
        (row) => row.sourceId,
        async (chunk) => (await target.booking.createMany({ data: chunk.map((row) => row.data) })).count,
        failed,
      );
    }
    const importedBookings = await target.booking.findMany({
      where: { legacyOrderId: { not: null } },
      select: { id: true, legacyOrderId: true },
    });
    const bookingMap = new Map<number, number>();
    for (const row of importedBookings) {
      if (row.legacyOrderId != null) bookingMap.set(row.legacyOrderId, row.id);
    }
    const orderCustomerMap = new Map<number, number>();
    for (const order of orders) {
      const customerId = order.user_id ? customerMap.get(order.user_id) : undefined;
      if (customerId) orderCustomerMap.set(order.id, customerId);
    }
    const bookingsImported = bookingMap.size;
    const itemData = [];
    for (const pending of pendingItems) {
      const bookingId = bookingMap.get(pending.sourceOrderId);
      if (!bookingId) continue;
      for (const item of pending.items) itemData.push({ bookingId, ...item });
    }
    for (let i = 0; i < itemData.length; i += 500) {
      await target.bookingItem.createMany({ data: itemData.slice(i, i + 500) });
    }

    let visitsImported = 0;
    let visitsOrphaned = 0;
    let lastTaskId = 0;
    let visitsComplete = true;
    try {
      for (;;) {
        const chunk = (
          await source.$queryRawUnsafe<
            Array<{
              task_id: number;
              order_id: number;
              driver_id: number | null;
              task_description: string;
              trans_type: string;
              su_type: string | null;
              delivery_date_raw: string | null;
              status: string | null;
            }>
          >(
            `SELECT task_id, order_id, driver_id, task_description, trans_type, su_type, CAST(delivery_date AS CHAR) AS delivery_date_raw, status FROM tasks WHERE task_id > ${lastTaskId} ORDER BY task_id LIMIT 2000`,
          )
        ).map((task) => ({
          ...task,
          task_id: num(task.task_id),
          order_id: num(task.order_id),
          driver_id: task.driver_id == null ? null : num(task.driver_id),
        }));
        if (!chunk.length) break;
        lastTaskId = chunk[chunk.length - 1]!.task_id;
        const data = [];
        for (const task of chunk) {
          const bookingId = bookingMap.get(task.order_id);
          if (!bookingId) visitsOrphaned += 1;
          const mapped = mapTaskStatus(task.status);
          const visitDate = parseLegacyDate(task.delivery_date_raw);
          if (visitDate.raw) warnings.push({ table: 'tasks', sourceId: task.task_id, reason: 'invalid delivery_date preserved', rawValue: visitDate.raw });
          data.push({
            bookingId: bookingId ?? null,
            legacyOrderId: task.order_id,
            sourceTaskId: task.task_id,
            visitDate: visitDate.date,
            rawVisitDate: visitDate.raw,
            status: mapped.status,
            rawStatus: clip(mapped.raw, 30),
            transType: clip(task.trans_type, 10) || null,
            suType: clip(task.su_type, 10) || null,
            legacyDriverId: task.driver_id,
            matchedHeroId: task.driver_id ? heroMap.get(task.driver_id) ?? null : null,
            taskDescription: clip(task.task_description, 255) || null,
            isHistorical: true,
          });
        }
        if (data.length) {
          visitsImported += await createManyIsolated(
            'tasks',
            data,
            (row) => row.sourceTaskId,
            async (rows) => (await target.legacyBookingVisit.createMany({ data: rows, skipDuplicates: true })).count,
            failed,
          );
        }
      }
    } catch (error) {
      visitsComplete = false;
      failed.push({
        table: 'tasks',
        sourceId: lastTaskId,
        reason: error instanceof Error ? error.message : 'task import interrupted',
      });
    }

    let walletImported = 0;
    let walletAmountImported = 0;
    let lastWalletId = 0;
    for (;;) {
      const chunk = (
        await source.$queryRawUnsafe<
          Array<{
            id: number;
            trn_type: number | null;
            order_id: string | null;
            task_id: number | null;
            amount: number | null;
            datetime_raw: string | null;
            deleted_at: Date | null;
            msg: string | null;
            action: string | null;
            driver_id: number | null;
          }>
        >(
          `SELECT id, trn_type, order_id, task_id, CAST(amount AS DECIMAL(20,2)) AS amount, CAST(datetime AS CHAR) AS datetime_raw, deleted_at, msg, action, driver_id FROM wallet_trn WHERE id > ${lastWalletId} ORDER BY id LIMIT 2000`,
        )
      ).map((row) => ({
        ...row,
        id: num(row.id),
        trn_type: row.trn_type == null ? null : num(row.trn_type),
        task_id: row.task_id == null ? null : num(row.task_id),
        amount: row.amount == null ? null : num(row.amount),
        driver_id: row.driver_id == null ? null : num(row.driver_id),
      }));
      if (!chunk.length) break;
      lastWalletId = chunk[chunk.length - 1]!.id;
      const data = chunk.map((row) => {
        const amount = money(row.amount);
        const legacyOrderId = Number(row.order_id);
        const occurredAt = parseLegacyDate(row.datetime_raw);
        if (occurredAt.raw) warnings.push({ table: 'wallet_trn', sourceId: row.id, reason: 'invalid datetime preserved', rawValue: occurredAt.raw });
        return {
          customerId: Number.isInteger(legacyOrderId) ? orderCustomerMap.get(legacyOrderId) ?? null : null,
          attributedHeroId: row.driver_id ? heroMap.get(row.driver_id) ?? null : null,
          sourceTrnId: row.id,
          trnType: mapWalletType(row.trn_type),
          action: clip(row.action || (amount >= 0 ? 'CR' : 'DR'), 2) || 'CR',
          amount,
          occurredAt: occurredAt.date,
          rawOccurredAt: occurredAt.raw,
          legacyOrderId: Number.isInteger(legacyOrderId) ? legacyOrderId : null,
          legacyTaskId: row.task_id,
          legacyDriverId: row.driver_id,
          wasSoftDeleted: Boolean(row.deleted_at),
          description: row.msg,
        };
      });
      walletImported += await createManyIsolated(
        'wallet_trn',
        data,
        (row) => row.sourceTrnId,
        async (rows) => (await target.legacyWalletTransaction.createMany({ data: rows, skipDuplicates: true })).count,
        failed,
      );
    }

    const invoices = (await pagedQuery<{
      id: number;
      prefix: string | null;
      items: string | null;
      extras: string | null;
      sub_total: unknown;
      discount_total: unknown;
      discounted_total: unknown;
      total_tax: unknown;
      payable_total: unknown;
      total_paid: unknown;
      billing_name: string | null;
      billing_address: string | null;
      order_id: number | null;
      invoice_date_raw: string | null;
      logs: string | null;
    }>(
      source,
      'SELECT id, prefix, items, extras, CAST(sub_total AS DECIMAL(20,2)) AS sub_total, CAST(discount_total AS DECIMAL(20,2)) AS discount_total, CAST(discounted_total AS DECIMAL(20,2)) AS discounted_total, CAST(total_tax AS DECIMAL(20,2)) AS total_tax, CAST(payable_total AS DECIMAL(20,2)) AS payable_total, CAST(total_paid AS DECIMAL(20,2)) AS total_paid, billing_name, billing_address, order_id, CAST(invoice_date AS CHAR) AS invoice_date_raw, logs FROM invoices ORDER BY id',
    )).map((invoice) => ({
      ...invoice,
      id: num(invoice.id),
      order_id: invoice.order_id == null ? null : num(invoice.order_id),
    }));
    let invoicesImported = 0;
    let invoicesUnmapped = 0;
    for (let i = 0; i < invoices.length; i += 200) {
      const chunk = invoices.slice(i, i + 200);
      const data = [];
      for (const invoice of chunk) {
        const bookingId = invoice.order_id ? bookingMap.get(invoice.order_id) : undefined;
        if (!bookingId) invoicesUnmapped += 1;
        const invoiceDate = parseLegacyDate(invoice.invoice_date_raw);
        if (invoiceDate.raw) warnings.push({ table: 'invoices', sourceId: invoice.id, reason: 'invalid invoice_date preserved', rawValue: invoiceDate.raw });
        data.push({
          bookingId: bookingId ?? null,
          legacyOrderId: invoice.order_id,
          sourceInvoiceId: invoice.id,
          legacyInvoiceNumber: invoice.prefix,
          subTotal: money(invoice.sub_total),
          discountTotal: money(invoice.discount_total),
          discountedTotal: money(invoice.discounted_total),
          gstAmount: money(invoice.total_tax),
          payableTotal: money(invoice.payable_total),
          totalPaid: money(invoice.total_paid),
          invoiceDate: invoiceDate.date,
          rawInvoiceDate: invoiceDate.raw,
          billingName: clip(invoice.billing_name, 255) || null,
          billingAddress: invoice.billing_address,
          rawItems: jsonForStorage(invoice.items),
          rawActivityLog: jsonForStorage(invoice.logs),
        });
      }
      if (data.length) {
        invoicesImported += await createManyIsolated(
          'invoices',
          data,
          (row) => row.sourceInvoiceId,
          async (rows) => (await target.legacyInvoiceSnapshot.createMany({ data: rows, skipDuplicates: true })).count,
          failed,
        );
      }
    }

    const targetWallet = await target.legacyWalletTransaction.aggregate({ _sum: { amount: true }, _count: true });
    walletAmountImported = Number(targetWallet._sum.amount ?? 0);
    const sourceOrderTotals = (await source.$queryRawUnsafe<Array<Record<string, unknown>>>(
      'SELECT SUM(CAST(sub_total AS DECIMAL(20,2))) subtotal, SUM(CAST(discount AS DECIMAL(20,2))) discount_total, SUM(CAST(tax_total AS DECIMAL(20,2))) tax_total, SUM(CAST(order_total AS DECIMAL(20,2))) raw_payable_total, SUM(CAST(COALESCE(order_total, sub_total + tax_total) AS DECIMAL(20,2))) effective_payable_total, SUM(CAST(advance_payment AS DECIMAL(20,2))) advance_paid, SUM(CAST(final_payment AS DECIMAL(20,2))) final_paid FROM orders',
    ))[0] ?? {};
    const sourceInvoiceTotals = (await source.$queryRawUnsafe<Array<Record<string, unknown>>>(
      'SELECT SUM(CAST(sub_total AS DECIMAL(20,2))) sub_total, SUM(CAST(discount_total AS DECIMAL(20,2))) discount_total, SUM(CAST(discounted_total AS DECIMAL(20,2))) discounted_total, SUM(CAST(total_tax AS DECIMAL(20,2))) gst_amount, SUM(CAST(payable_total AS DECIMAL(20,2))) payable_total, SUM(CAST(total_paid AS DECIMAL(20,2))) total_paid FROM invoices',
    ))[0] ?? {};
    const targetOrderTotals = await target.booking.aggregate({
      where: { bookingNo: { startsWith: 'LEGACY-' } },
      _sum: { subtotal: true, discountTotal: true, taxTotal: true, payableTotal: true, advancePaid: true, finalPaid: true },
    });
    const targetInvoiceTotals = await target.legacyInvoiceSnapshot.aggregate({
      _sum: { subTotal: true, discountTotal: true, discountedTotal: true, gstAmount: true, payableTotal: true, totalPaid: true },
    });
    const sourceTables = await source.$queryRaw<Array<{ tableName: string }>>`
      SELECT table_name AS tableName FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    const sourceInventory: Record<string, number> = {};
    for (const { tableName } of sourceTables) {
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) throw new Error(`Unsafe source table name '${tableName}'`);
      const countRows = await source.$queryRawUnsafe<Array<{ c: bigint }>>(`SELECT COUNT(*) AS c FROM \`${tableName}\``);
      sourceInventory[tableName] = num(countRows[0]?.c);
    }
    const importedSourceTables = new Set(['cities', 'admin', 'users', 'address', 'orders', 'tasks', 'wallet_trn', 'invoices']);
    const excludedTables = Object.entries(sourceInventory)
      .filter(([table, count]) => count > 0 && !importedSourceTables.has(table))
      .map(([table, count]) => ({ table, count, reason: mapLegacyTable(table).notes }));
    const sourceHeroes = userRoleCounts.find((row) => num(row.role) === 1);
    const sourceHeroCount = num(sourceHeroes?.c);
    const sourceCustomerCount = (sourceCount.users ?? 0) - sourceHeroCount;
    const targetPayments = await target.payment.count();
    const targetCategories = await target.serviceCategory.count();
    const targetServices = await target.service.count();
    const targetTriggers = await target.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*) AS c FROM information_schema.triggers WHERE trigger_schema = DATABASE()
    `;
    const [
      addressesWithoutCustomer,
      bookingsWithoutCustomer,
      visitsWithoutBooking,
      walletWithoutCustomer,
      walletDriversUnmatched,
      invoicesWithoutBooking,
      activeLegacyAdmins,
      dispatchRows,
      dispatchOutboxRows,
      pushLogRows,
      otpRows,
      paymentOrderRows,
    ] = await Promise.all([
      target.legacyCustomerAddress.count({ where: { customerId: null } }),
      target.booking.count({ where: { legacyOrderId: { not: null }, customerId: null } }),
      target.legacyBookingVisit.count({ where: { bookingId: null } }),
      target.legacyWalletTransaction.count({ where: { customerId: null } }),
      target.legacyWalletTransaction.count({ where: { legacyDriverId: { not: null }, attributedHeroId: null } }),
      target.legacyInvoiceSnapshot.count({ where: { bookingId: null } }),
      target.dashboardUser.count({ where: { legacyAdminId: { not: null }, isActive: true } }),
      target.bookingDispatch.count(),
      target.dispatchOutboxEvent.count(),
      target.pushNotificationLog.count(),
      target.otpChallenge.count(),
      target.paymentOrder.count(),
    ]);
    const relationshipReconciliation = {
      addresses: { linked: addressesImported - addressesWithoutCustomer, unlinked: addressesWithoutCustomer, reason: 'Unlinked rows retain legacy_user_id and source_address_id.' },
      bookings: { linked: bookingsImported - bookingsWithoutCustomer, unlinked: bookingsWithoutCustomer, reason: 'Unlinked rows retain legacy_order_id and denormalized customer identity.' },
      visits: { linked: visitsImported - visitsWithoutBooking, unlinked: visitsWithoutBooking, reason: 'Every row retains legacy_order_id and source_task_id.' },
      walletCustomers: { linked: walletImported - walletWithoutCustomer, unlinked: walletWithoutCustomer, reason: 'Every row retains source_trn_id plus legacy order/task/driver identifiers.' },
      walletHeroes: { unmatchedLegacyDrivers: walletDriversUnmatched, reason: 'Unmatched attribution retains legacy_driver_id.' },
      invoices: { linked: invoicesImported - invoicesWithoutBooking, unlinked: invoicesWithoutBooking, reason: 'Every row retains source_invoice_id and legacy_order_id.' },
    };
    const operationalSideEffectRows = {
      activeLegacyAdmins,
      bookingDispatches: dispatchRows,
      dispatchOutboxEvents: dispatchOutboxRows,
      pushNotificationLogs: pushLogRows,
      otpChallenges: otpRows,
      paymentOrders: paymentOrderRows,
    };
    const orderFinancials = {
      source: {
        subtotal: money(sourceOrderTotals.subtotal),
        discountTotal: money(sourceOrderTotals.discount_total),
        taxTotal: money(sourceOrderTotals.tax_total),
        rawPayableTotal: money(sourceOrderTotals.raw_payable_total),
        effectivePayableTotal: money(sourceOrderTotals.effective_payable_total),
        advancePaid: money(sourceOrderTotals.advance_paid),
        finalPaid: money(sourceOrderTotals.final_paid),
      },
      target: {
        subtotal: money(targetOrderTotals._sum.subtotal),
        discountTotal: money(targetOrderTotals._sum.discountTotal),
        taxTotal: money(targetOrderTotals._sum.taxTotal),
        payableTotal: money(targetOrderTotals._sum.payableTotal),
        advancePaid: money(targetOrderTotals._sum.advancePaid),
        finalPaid: money(targetOrderTotals._sum.finalPaid),
      },
    };
    const invoiceFinancials = {
      source: Object.fromEntries(Object.entries(sourceInvoiceTotals).map(([key, value]) => [key, money(value)])),
      target: {
        subTotal: money(targetInvoiceTotals._sum.subTotal),
        discountTotal: money(targetInvoiceTotals._sum.discountTotal),
        discountedTotal: money(targetInvoiceTotals._sum.discountedTotal),
        gstAmount: money(targetInvoiceTotals._sum.gstAmount),
        payableTotal: money(targetInvoiceTotals._sum.payableTotal),
        totalPaid: money(targetInvoiceTotals._sum.totalPaid),
      },
    };
    const financialDifferences = {
      orders: {
        subtotal: money(orderFinancials.target.subtotal - orderFinancials.source.subtotal),
        discountTotal: money(orderFinancials.target.discountTotal - orderFinancials.source.discountTotal),
        taxTotal: money(orderFinancials.target.taxTotal - orderFinancials.source.taxTotal),
        payableTotal: money(orderFinancials.target.payableTotal - orderFinancials.source.effectivePayableTotal),
        advancePaid: money(orderFinancials.target.advancePaid - orderFinancials.source.advancePaid),
        finalPaid: money(orderFinancials.target.finalPaid - orderFinancials.source.finalPaid),
      },
      invoices: {
        subTotal: money(invoiceFinancials.target.subTotal - Number(invoiceFinancials.source.sub_total ?? 0)),
        discountTotal: money(invoiceFinancials.target.discountTotal - Number(invoiceFinancials.source.discount_total ?? 0)),
        discountedTotal: money(invoiceFinancials.target.discountedTotal - Number(invoiceFinancials.source.discounted_total ?? 0)),
        gstAmount: money(invoiceFinancials.target.gstAmount - Number(invoiceFinancials.source.gst_amount ?? 0)),
        payableTotal: money(invoiceFinancials.target.payableTotal - Number(invoiceFinancials.source.payable_total ?? 0)),
        totalPaid: money(invoiceFinancials.target.totalPaid - Number(invoiceFinancials.source.total_paid ?? 0)),
      },
      wallet: money(Number(targetWallet._sum.amount ?? 0) - Number(walletSumRows[0]?.s ?? 0)),
    };
    const moneyReconciled = [
      ...Object.values(financialDifferences.orders),
      ...Object.values(financialDifferences.invoices),
      financialDifferences.wallet,
    ].every((difference) => difference === 0);
    const noOperationalSideEffects = Object.values(operationalSideEffectRows).every((count) => count === 0);
    const reconciliation = [
      { entity: 'cities', source: sourceCount.cities, target: cityMap.size, difference: cityMap.size - sourceCount.cities, reason: 'All legacy cities imported with inactive-safe default hubs.' },
      { entity: 'legacy admins', source: sourceCount.admin, target: adminsImported, difference: adminsImported - sourceCount.admin, reason: 'Imported disabled with an unknown random password and mandatory reset; no legacy credentials reused.' },
      { entity: 'customers', source: sourceCustomerCount, target: customersImported, difference: customersImported - sourceCustomerCount, reason: 'Difference is invalid or duplicate phone identities listed in failed records.' },
      { entity: 'heroes', source: sourceHeroCount, target: heroesImported, difference: heroesImported - sourceHeroCount, reason: 'Difference is invalid or duplicate phone identities listed in failed records.' },
      { entity: 'addresses', source: sourceCount.address, target: addressesImported, difference: addressesImported - sourceCount.address, reason: 'All rows retained in the historical address table; unresolved customer links remain null.' },
      { entity: 'bookings/orders', source: sourceCount.orders, target: bookingsImported, difference: bookingsImported - sourceCount.orders, reason: 'Invalid coordinates are retained raw and excluded only from typed latitude/longitude.' },
      { entity: 'tasks/visits', source: sourceCount.tasks, target: visitsImported, difference: visitsImported - sourceCount.tasks, reason: `${visitsOrphaned} source order references are unmatched but rows are retained with null booking_id.` },
      { entity: 'wallet', source: sourceCount.wallet_trn, target: walletImported, difference: walletImported - sourceCount.wallet_trn, reason: 'Historical-only; never included in spendable balances.' },
      { entity: 'invoices', source: sourceCount.invoices, target: invoicesImported, difference: invoicesImported - sourceCount.invoices, reason: `${invoicesUnmapped} source order references are unmatched but snapshots are retained.` },
      { entity: 'payments', source: sourceCount.payments, target: targetPayments, difference: targetPayments - sourceCount.payments, reason: 'The legacy payments table is empty; order, invoice, and wallet financial history is reconciled separately.' },
      { entity: 'catalog tags', source: sourceCount.tags, target: targetCategories, difference: targetCategories - sourceCount.tags, reason: 'Intentionally not activated: legacy tag hierarchy does not map safely to the reconstructed live catalog.' },
      { entity: 'catalog vendor rates', source: sourceCount.vendor_rates, target: targetServices, difference: targetServices - sourceCount.vendor_rates, reason: 'Intentionally not activated: preserved in the source dump as catalog reconstruction reference.' },
    ];
    const complete =
      visitsComplete &&
      adminsImported === sourceCount.admin &&
      addressesImported === sourceCount.address &&
      bookingsImported === sourceCount.orders &&
      visitsImported === sourceCount.tasks &&
      walletImported === sourceCount.wallet_trn &&
      invoicesImported === sourceCount.invoices &&
      moneyReconciled &&
      noOperationalSideEffects;
    const report = {
      generatedAt: new Date().toISOString(),
      startedAt,
      dump: input.dump ?? null,
      sourceDatabase: sourceName,
      targetDatabase: targetName,
      complete,
      sideEffects: {
        fcm: false,
        otp: false,
        zoho: false,
        sms: false,
        paymentRequests: false,
        autoDispatch: false,
        mechanism: 'Importer writes directly with Prisma and never calls application services; imported bookings never use live dispatch states.',
        targetDatabaseTriggers: num(targetTriggers[0]?.c),
        targetOperationalRows: operationalSideEffectRows,
      },
      source: {
        ...sourceCount,
        walletAmount: Number(walletSumRows[0]?.s ?? 0),
        userRoles: Object.fromEntries(userRoleCounts.map((row) => [String(row.role), num(row.c)])),
      },
      sourceInventory,
      excludedTables,
      imported: {
        cities: cityMap.size,
        admins: adminsImported,
        customers: customersImported,
        heroes: heroesImported,
        addresses: addressesImported,
        bookings: bookingsImported,
        visits: visitsImported,
        visitsOrphaned,
        visitsComplete,
        wallet: walletImported,
        walletAmountImported,
        invoices: invoicesImported,
        invoicesUnmapped,
      },
      targetWallet: {
        count: targetWallet._count,
        amount: Number(targetWallet._sum.amount ?? 0),
      },
      reconciliation,
      relationshipReconciliation,
      financialReconciliation: {
        orders: orderFinancials,
        invoices: invoiceFinancials,
        differences: financialDifferences,
        wallet: {
          sourceAmount: money(walletSumRows[0]?.s),
          targetAmount: money(targetWallet._sum.amount),
          difference: money(Number(targetWallet._sum.amount ?? 0) - Number(walletSumRows[0]?.s ?? 0)),
        },
      },
      failedCount: failed.length,
      failed,
      warningCount: warnings.length,
      warnings,
    };

    const outDir = join(process.cwd(), 'docs', 'migration-reports');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'legacy-apply.json'), JSON.stringify(report, null, 2));
    writeFileSync(
      join(outDir, 'legacy-apply.md'),
      [
        '# Legacy apply (isolated staging)',
        '',
        `- Source: \`${sourceName}\``,
        `- Target: \`${targetName}\``,
        `- Complete: **${complete ? 'YES' : 'NO'}**`,
        `- Side effects: none (FCM/OTP/Zoho/SMS/payment requests/dispatch are not called)`,
        `- Target database triggers: ${num(targetTriggers[0]?.c)}`,
        `- Failed records: ${failed.length}`,
        `- Data-quality warnings retained: ${warnings.length}`,
        '',
        '| Entity | Source | Target | Difference | Reason |',
        '|--------|-------:|-------:|-----------:|--------|',
        ...reconciliation.map((row) => `| ${row.entity} | ${row.source} | ${row.target} | ${row.difference} | ${row.reason} |`),
        '',
        '## Relationship reconciliation',
        '',
        `- Addresses: ${relationshipReconciliation.addresses.linked} linked; ${relationshipReconciliation.addresses.unlinked} unlinked. ${relationshipReconciliation.addresses.reason}`,
        `- Bookings: ${relationshipReconciliation.bookings.linked} linked; ${relationshipReconciliation.bookings.unlinked} unlinked. ${relationshipReconciliation.bookings.reason}`,
        `- Visits: ${relationshipReconciliation.visits.linked} linked; ${relationshipReconciliation.visits.unlinked} unlinked. ${relationshipReconciliation.visits.reason}`,
        `- Wallet/customer: ${relationshipReconciliation.walletCustomers.linked} linked; ${relationshipReconciliation.walletCustomers.unlinked} unlinked. ${relationshipReconciliation.walletCustomers.reason}`,
        `- Wallet/hero: ${relationshipReconciliation.walletHeroes.unmatchedLegacyDrivers} legacy driver references unmatched. ${relationshipReconciliation.walletHeroes.reason}`,
        `- Invoices: ${relationshipReconciliation.invoices.linked} linked; ${relationshipReconciliation.invoices.unlinked} unlinked. ${relationshipReconciliation.invoices.reason}`,
        '',
        '## Financial reconciliation',
        '',
        `- Wallet SUM(amount): source ${report.financialReconciliation.wallet.sourceAmount}; target ${report.financialReconciliation.wallet.targetAmount}; difference ${report.financialReconciliation.wallet.difference}.`,
        `- Orders payable total (effective): source ${orderFinancials.source.effectivePayableTotal}; target ${orderFinancials.target.payableTotal}.`,
        `- Invoices payable total: source ${invoiceFinancials.source.payable_total}; target ${invoiceFinancials.target.payableTotal}.`,
        `- All monetary field differences: ${moneyReconciled ? '0' : JSON.stringify(financialDifferences)}.`,
        '',
        '## Side-effect safety',
        '',
        `- Operational rows created: ${JSON.stringify(operationalSideEffectRows)}.`,
        '- The importer uses direct database writes only; it never invokes SMS, FCM, Zoho, payment, notification, or dispatch services.',
        '',
        '## Intentionally excluded source tables',
        '',
        ...excludedTables.map((row) => `- \`${row.table}\`: ${row.count} rows — ${row.reason}`),
        '',
        'Live dispatch was not run. Imported non-terminal orders are `LEGACY_ARCHIVED`; historical wallet and invoices remain read-only shadow data.',
        '',
      ].join('\n'),
    );
    if (!complete) throw new Error(`Legacy migration reconciliation failed; see ${join(outDir, 'legacy-apply.json')}`);
    return report;
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}
