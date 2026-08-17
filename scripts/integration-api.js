/**
 * Live MySQL API integration checks against jiffit_dev.
 * Requires the API to be running (npm run start) with OTP_TEST_MODE_ENABLED=true.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const BASE = process.env.JIFFIT_API_ORIGIN ?? 'http://127.0.0.1:5000';

function todayIst() {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

async function req(method, path, body, token) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function api(method, path, body, token) {
  const { status, payload } = await req(method, path, body, token);
  if (status >= 400 || payload.success === false) {
    throw new Error(`${method} ${path} -> ${status} ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

async function expectFail(method, path, body, token, label) {
  const { status } = await req(method, path, body, token);
  if (status < 400) throw new Error(`Expected failure: ${label} (${method} ${path} was ${status})`);
}

async function main() {
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  if (!health.success) throw new Error('health failed');
  console.log('ok health', health.environment);

  await expectFail('POST', '/api/v1/auth/dashboard/login', { username: 'admin', password: 'wrong' }, null, 'bad password');

  const dash = await api('POST', '/api/v1/auth/dashboard/login', { username: 'admin', password: 'ChangeMeNow!123' });
  const dt = dash.accessToken;
  const me = await api('GET', '/api/v1/auth/dashboard/me', undefined, dt);
  if (me.username !== 'admin') throw new Error('dashboard me mismatch');
  console.log('ok dashboard login', me.role);

  const tag = Date.now().toString(36).slice(-4).toUpperCase();
  const state = await api('POST', '/api/v1/geography/states', { name: `Bihar ${tag}`, code: tag.slice(0, 5) }, dt);
  const city = await api('POST', '/api/v1/geography/cities', { name: `Patna ${tag}`, stateId: state.id }, dt);
  const hub = await api(
    'POST',
    '/api/v1/geography/hubs',
    {
      cityId: city.id,
      name: `Patna Hub ${tag}`,
      address: 'Boring Road, Patna',
      latitude: '25.5941',
      longitude: '85.1376',
      checkinRadiusMeters: 5000,
      serviceRadiusMeters: 15000,
    },
    dt,
  );
  console.log('ok geography', city.name, hub.name);

  const category = await api('POST', '/api/v1/catalog/categories', { name: `Home Cleaning ${tag}` }, dt);
  const service = await api(
    'POST',
    '/api/v1/catalog/services',
    { name: `Sofa Cleaning ${tag}`, categoryId: category.id, price: 499, duration: 60, workerCount: 1 },
    dt,
  );
  const variant = await api(
    'POST',
    '/api/v1/catalog/variants',
    { serviceId: service.id, name: '1 Seater', singlePrice: 499, durationMinutes: 60 },
    dt,
  );
  await api('PUT', `/api/v1/catalog/hub-availability/${hub.id}`, { items: [{ serviceId: service.id, isActive: true }] }, dt);
  const schedules = await api('GET', '/api/v1/capacity/schedules', undefined, dt);
  const dayShift = schedules.find((row) => row.name === 'Day shift') ?? schedules[0];
  if (!dayShift) throw new Error('Day shift missing from seed');
  const group = await api(
    'POST',
    '/api/v1/capacity/groups',
    { hubId: hub.id, name: 'Cleaning pool', serviceIds: [service.id], workScheduleIds: [dayShift.id] },
    dt,
  );
  const date = todayIst();
  await api(
    'PUT',
    '/api/v1/capacity/daily',
    { groupId: group.id, capacityDate: date, workScheduleId: dayShift.id, heroCount: 3 },
    dt,
  );
  console.log('ok catalog + capacity', service.name, date);

  const custPhone = `98${String(Date.now()).slice(-8)}`;
  const custOtp = await api('POST', '/api/v1/auth/customer/send-otp', { phone: custPhone });
  if (!custOtp.devOtp) throw new Error('dev OTP not returned');
  await expectFail('POST', '/api/v1/auth/customer/verify-otp', { phone: custPhone, otp: '000000' }, null, 'bad customer otp');
  const customerAuth = await api('POST', '/api/v1/auth/customer/verify-otp', { phone: custPhone, otp: custOtp.devOtp });
  const ct = customerAuth.accessToken;
  const address = await api(
    'POST',
    '/api/v1/customer/me/addresses',
    {
      label: 'Home',
      addressLine1: 'Kankarbagh',
      cityId: city.id,
      pincode: '800020',
      latitude: 25.5941,
      longitude: 85.1376,
      isDefault: true,
    },
    ct,
  );
  console.log('ok customer auth + address', customerAuth.customer.id);

  const heroPhone = `97${String(Date.now()).slice(-8)}`;
  const heroOtp = await api('POST', '/api/v1/auth/hero/send-otp', { phone: heroPhone });
  const heroAuth = await api('POST', '/api/v1/auth/hero/verify-otp', { phone: heroPhone, otp: heroOtp.devOtp });
  const ht = heroAuth.accessToken;
  const heroId = heroAuth.hero.id;
  await api(
    'PATCH',
    `/api/v1/heroes/${heroId}`,
    {
      name: 'Test Hero',
      cityId: city.id,
      hubId: hub.id,
      language: 'HINDI',
      workType: 'BIKE_RIDER',
      vehicleType: 'BIKE',
      earningsType: 'COMMISSION',
      skillServiceIds: [service.id],
    },
    dt,
  );
  await api('PATCH', `/api/v1/heroes/${heroId}/verify`, {}, dt);
  const prisma = new PrismaClient();
  await prisma.hero.update({ where: { id: heroId }, data: { deviceToken: 'dev-integration-token' } });
  await prisma.$disconnect();
  await api(
    'POST',
    '/api/v1/hero/me/attendance/check-in',
    { hubId: hub.id, latitude: 25.5941, longitude: 85.1376 },
    ht,
  );
  console.log('ok hero verified + checked in', heroId);

  const slots = await api(
    'POST',
    '/api/v1/customer/me/booking-slots/calculate',
    { customerAddressId: address.id, serviceId: service.id, serviceVariantId: variant.id, date },
    ct,
  );
  const available = (slots.dates?.[0]?.slots ?? []).filter((slot) => slot.available);
  if (available.length === 0) throw new Error(`no slots for ${date}: ${JSON.stringify(slots).slice(0, 500)}`);
  const slot = available[0];
  console.log('ok slots', slot.time);

  await expectFail(
    'POST',
    '/api/v1/customer/me/bookings',
    {
      addressId: address.id,
      scheduledDate: date,
      scheduledFromTime: slot.time,
      paymentMethod: 'CASH',
      coinsToRedeem: 10,
      items: [{ serviceId: service.id, serviceVariantId: variant.id, name: 'Sofa', quantity: 1, unitPrice: 0, totalAmount: 0 }],
    },
    ct,
    'coins fail closed',
  );

  const cashCreated = await api(
    'POST',
    '/api/v1/customer/me/bookings',
    {
      idempotencyKey: `itest-cash-${Date.now()}`,
      addressId: address.id,
      scheduledDate: date,
      scheduledFromTime: slot.time,
      paymentMethod: 'CASH',
      items: [{ serviceId: service.id, serviceVariantId: variant.id, name: 'Sofa Cleaning', quantity: 1, unitPrice: 0, totalAmount: 0 }],
    },
    ct,
  );
  const cash = cashCreated.booking;
  if (Number(cash.payableTotal) <= 0) throw new Error('catalog price not applied');
  console.log('ok cash booking', cash.bookingNo, cash.status, cash.payableTotal);

  await new Promise((resolve) => setTimeout(resolve, 1500));
  const eligible = await api('GET', `/api/v1/bookings/${cash.id}/eligible-heroes`, undefined, dt);
  console.log('ok eligible heroes', Array.isArray(eligible) ? eligible.length : eligible);
  if (Array.isArray(eligible) && eligible.length) {
    await api('PATCH', `/api/v1/bookings/${cash.id}/assign`, { heroId, reason: 'Integration assign' }, dt);
  } else {
    await api('POST', `/api/v1/bookings/${cash.id}/dispatch`, {}, dt);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const offers = await api('GET', '/api/v1/hero/me/offers', undefined, ht);
  const assigned = await api('GET', `/api/v1/bookings/${cash.id}`, undefined, dt);
  console.log('ok dashboard booking', assigned.status, 'offers', offers.length);
  if (assigned.status === 'ASSIGNED' || offers.length) {
    await api('POST', `/api/v1/hero/me/jobs/${cash.id}/accept`, {}, ht);
  }

  await api('POST', `/api/v1/hero/me/jobs/${cash.id}/advance`, { to: 'ON_THE_WAY' }, ht);
  await api('POST', `/api/v1/hero/me/jobs/${cash.id}/advance`, { to: 'ARRIVED' }, ht);
  const job = await api('GET', `/api/v1/hero/me/jobs/${cash.id}`, undefined, ht);
  await api('POST', `/api/v1/hero/me/jobs/${cash.id}/advance`, { to: 'IN_PROGRESS', startOtp: job.startOtp }, ht);
  await api(
    'POST',
    `/api/v1/hero/me/jobs/${cash.id}/photos`,
    { kind: 'after', dataBase64: Buffer.from('dev-photo-placeholder-ok').toString('base64'), filename: 'after.jpg', contentType: 'image/jpeg' },
    ht,
  );
  await api('POST', `/api/v1/hero/me/jobs/${cash.id}/advance`, { to: 'COMPLETED' }, ht);
  const done = await api('GET', `/api/v1/customer/me/bookings/${cash.id}`, undefined, ct);
  if (done.status !== 'COMPLETED') throw new Error(`expected COMPLETED, got ${done.status}`);
  console.log('ok cash job completed');

  await expectFail(
    'PATCH',
    `/api/v1/customer/me/bookings/${cash.id}/cancel`,
    { reason: 'too late' },
    ct,
    'cancel completed',
  );

  const later = (slots.dates?.[0]?.slots ?? []).filter((row) => row.available && row.time !== slot.time)[0]
    ?? available[Math.min(1, available.length - 1)];
  const onlineCreated = await api(
    'POST',
    '/api/v1/customer/me/bookings',
    {
      idempotencyKey: `itest-online-${Date.now()}`,
      addressId: address.id,
      scheduledDate: date,
      scheduledFromTime: later.time,
      paymentMethod: 'ONLINE',
      items: [{ serviceId: service.id, serviceVariantId: variant.id, name: 'Sofa Cleaning', quantity: 1, unitPrice: 0, totalAmount: 0 }],
    },
    ct,
  );
  const online = onlineCreated.booking;
  if (online.status !== 'PENDING_PAYMENT') throw new Error(`expected PENDING_PAYMENT, got ${online.status}`);
  await api('POST', `/api/v1/customer/me/bookings/${online.id}/mock-payment`, {}, ct);
  const paid = await api('GET', `/api/v1/customer/me/bookings/${online.id}`, undefined, ct);
  if (paid.paymentStatus !== 'PAID') throw new Error(`expected PAID, got ${paid.paymentStatus}`);
  await expectFail('POST', `/api/v1/customer/me/bookings/${online.id}/mock-payment`, {}, ct, 'duplicate mock pay');
  await api('PATCH', `/api/v1/customer/me/bookings/${online.id}/cancel`, { reason: 'changed plans' }, ct);
  const cancelled = await api('GET', `/api/v1/customer/me/bookings/${online.id}`, undefined, ct);
  if (cancelled.status !== 'CANCELLED') throw new Error(`expected CANCELLED, got ${cancelled.status}`);
  console.log('ok online mock pay + cancel', online.bookingNo);

  const leave = await api(
    'POST',
    '/api/v1/hero/me/leaves',
    { type: 'CASUAL', fromDate: date, toDate: date, reason: 'Integration leave' },
    ht,
  );
  await api('PATCH', `/api/v1/heroes/leaves/${leave.id}`, { status: 'APPROVED' }, dt);
  await api('POST', '/api/v1/payments/cash-collection/settle', { bookingId: cash.id }, dt);
  const history = await api('GET', '/api/v1/customer/me/bookings', undefined, ct);
  const dashList = await api('GET', '/api/v1/bookings?limit=20', undefined, dt);
  if (!history.bookings?.length || !dashList.bookings?.length) throw new Error('history empty');
  console.log('ok leave, cash settle, histories', history.total, dashList.total);
  console.log('INTEGRATION_OK');
}

main().catch((error) => {
  console.error('INTEGRATION_FAILED', error);
  process.exit(1);
});
