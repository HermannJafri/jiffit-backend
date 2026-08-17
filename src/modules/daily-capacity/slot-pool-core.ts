export const DEFAULT_BUFFER_MINUTES = 15;
export const SLOT_INTERVAL = 15;
export const FIRST_SLOT_OFFSET = 30;
export const MIN_ADVANCE_MINUTES = 60;
export const MINUTES_PER_DAY = 24 * 60;

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minToTime(min: number): string {
  const n = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = (h ?? 0) >= 12 ? 'PM' : 'AM';
  const h12 = (h ?? 0) % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, '0')} ${period}`;
}

export function isDayShiftWindow(shiftStart: string, shiftEnd: string): boolean {
  return /^\d{2}:\d{2}$/.test(shiftStart) && /^\d{2}:\d{2}$/.test(shiftEnd) && timeToMin(shiftEnd) > timeToMin(shiftStart);
}

export function indiaNowMinutes(now = new Date()): number {
  const shifted = new Date(now.getTime() + 5.5 * 3_600_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function indiaDateKey(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export function istDate(dateStr: string, time = '00:00:00'): Date {
  return new Date(`${dateStr}T${time}+05:30`);
}

export interface ActiveBooking {
  workerCount: number;
  slotStartMs: number;
  slotEndMs: number;
}

export function heroesLocked(
  slotStartMs: number,
  slotEndMs: number,
  bookings: ActiveBooking[],
  bufferMinutes: number,
): number {
  let locked = 0;
  for (const booking of bookings) {
    const effectiveEnd = booking.slotEndMs + bufferMinutes * 60_000;
    if (slotStartMs < effectiveEnd && slotEndMs > booking.slotStartMs) {
      locked += booking.workerCount;
    }
  }
  return locked;
}

export interface SlotResult {
  time: string;
  endTime: string;
  timeLabel: string;
  shiftName: string;
  slotStartAt: string;
  slotEndAt: string;
  available: boolean;
  heroesAvailable: number;
  heroesNeeded: number;
  heroPool: number;
  heroesLocked: number;
  blockedReason: string | null;
  overtimeFeeAmount: number | null;
  overtimeMinutes: number | null;
}

export function generateRangeSlots(input: {
  fromMin: number;
  toMin: number;
  shiftName: string;
  heroPool: number;
  durationMinutes: number;
  workerCount: number;
  activeBookings: ActiveBooking[];
  baseDateMs: number;
  bufferMinutes: number;
  overtimeRatePerHour?: number | null;
}): SlotResult[] {
  const slots: SlotResult[] = [];
  const service = { durationMinutes: input.durationMinutes, workerCount: input.workerCount };
  const fitsInShiftLastStart = input.toMin - service.durationMinutes;
  const overtimeExtendedLastStart = input.overtimeRatePerHour
    ? Math.max(fitsInShiftLastStart, input.toMin - SLOT_INTERVAL)
    : fitsInShiftLastStart;
  const sameDayLastStart = MINUTES_PER_DAY - service.durationMinutes;
  const lastStart = Math.min(overtimeExtendedLastStart, sameDayLastStart);
  for (let t = input.fromMin; t <= lastStart; t += SLOT_INTERVAL) {
    const endMin = t + service.durationMinutes;
    const slotStartAt = new Date(input.baseDateMs + t * 60_000);
    const slotEndAt = new Date(input.baseDateMs + endMin * 60_000);
    const locked = heroesLocked(slotStartAt.getTime(), slotEndAt.getTime(), input.activeBookings, input.bufferMinutes);
    const free = input.heroPool - locked;
    const available = free >= service.workerCount;
    const overtimeMinutes = Math.max(0, endMin - input.toMin);
    let overtimeFeeAmount: number | null = null;
    if (overtimeMinutes > 0 && input.overtimeRatePerHour) {
      overtimeFeeAmount = Math.round(input.overtimeRatePerHour * (overtimeMinutes / 60) * service.workerCount * 100) / 100;
    }
    const timeStr = minToTime(t % 1440);
    slots.push({
      time: timeStr,
      endTime: minToTime(endMin % 1440),
      timeLabel: formatTime12h(timeStr),
      shiftName: input.shiftName,
      slotStartAt: slotStartAt.toISOString(),
      slotEndAt: slotEndAt.toISOString(),
      available,
      heroesAvailable: Math.max(0, free),
      heroesNeeded: service.workerCount,
      heroPool: input.heroPool,
      heroesLocked: locked,
      blockedReason: available ? null : 'hero_unavailable',
      overtimeFeeAmount,
      overtimeMinutes: overtimeMinutes > 0 ? overtimeMinutes : null,
    });
  }
  return slots;
}

export function clampSameDayHeroPool(heroPool: number, shiftStart: string, nowMin: number, checkedIn: number): number {
  if (nowMin < timeToMin(shiftStart)) return heroPool;
  return Math.min(heroPool, checkedIn);
}

export function bookingsRelevantToShift(
  bookings: ActiveBooking[],
  baseDateMs: number,
  shiftStartMin: number,
): ActiveBooking[] {
  const shiftStartMs = baseDateMs + shiftStartMin * 60_000;
  return bookings.filter((booking) => !(booking.slotStartMs < baseDateMs && booking.slotEndMs < shiftStartMs));
}

export function nextIstDates(count: number, from = new Date()): string[] {
  const start = indiaDateKey(from);
  const [year, month, day] = start.split('-').map(Number);
  const dates: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const utc = Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + i);
    dates.push(new Date(utc).toISOString().slice(0, 10));
  }
  return dates;
}
