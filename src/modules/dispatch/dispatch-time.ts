export const INDIA_OFFSET = '+05:30';

export class DispatchTimeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DispatchTimeError';
  }
}

export function legacyIndiaInstant(date: Date | null, hhmm: string | null): Date | null {
  if (!date || !hhmm || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return null;
  const dateKey = date.toISOString().slice(0, 10);
  const value = new Date(`${dateKey}T${hhmm}:00.000${INDIA_OFFSET}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function canonicalBookingWindow(input: {
  slotStartAt: Date | null;
  slotEndAt: Date | null;
  scheduledDate?: Date | null;
  scheduledFromTime?: string | null;
  scheduledToTime?: string | null;
}): { start: Date; end: Date; usedLegacyFallback: boolean } {
  const start = input.slotStartAt ?? legacyIndiaInstant(input.scheduledDate ?? null, input.scheduledFromTime ?? null);
  const end = input.slotEndAt ?? legacyIndiaInstant(input.scheduledDate ?? null, input.scheduledToTime ?? null);
  if (!start) throw new DispatchTimeError('SCHEDULED_START_MISSING', 'Canonical scheduled start is missing');
  if (!end) throw new DispatchTimeError('SCHEDULED_END_MISSING', 'Canonical scheduled end is missing');
  if (end.getTime() <= start.getTime()) {
    throw new DispatchTimeError('SCHEDULED_WINDOW_INVALID', 'Scheduled end must be after scheduled start');
  }
  return { start, end, usedLegacyFallback: input.slotStartAt == null || input.slotEndAt == null };
}

export function assertFutureScheduledStart(start: Date, now = new Date(), minimumNoticeMinutes = 0): void {
  if (start.getTime() <= now.getTime() + minimumNoticeMinutes * 60_000) {
    throw new DispatchTimeError('SCHEDULED_START_TOO_SOON', 'Scheduled start does not satisfy the minimum notice period');
  }
}

export function calculateOfferReleaseAt(input: {
  scheduledStartAt: Date;
  routeEtaSeconds: number;
  acceptanceWindowSeconds: number;
  reassignmentBufferMinutes: number;
  arrivalBufferMinutes: number;
}): Date {
  const leadSeconds =
    Math.max(0, input.routeEtaSeconds) +
    Math.max(0, input.acceptanceWindowSeconds) +
    Math.max(0, input.reassignmentBufferMinutes) * 60 +
    Math.max(0, input.arrivalBufferMinutes) * 60;
  return new Date(input.scheduledStartAt.getTime() - leadSeconds * 1000);
}

export function calculateReminderAt(scheduledStartAt: Date, reminderMinutes: number): Date {
  return new Date(scheduledStartAt.getTime() - Math.max(0, reminderMinutes) * 60_000);
}

export function calculateOnTheWayAt(scheduledStartAt: Date, routeEtaSeconds: number, arrivalBufferMinutes: number): Date {
  return new Date(
    scheduledStartAt.getTime() - Math.max(0, routeEtaSeconds) * 1000 - Math.max(0, arrivalBufferMinutes) * 60_000,
  );
}
