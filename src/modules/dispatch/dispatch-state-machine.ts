export function isDispatchReleaseDue(releaseAt: Date, databaseNow: Date): boolean {
  return releaseAt.getTime() <= databaseNow.getTime();
}

export function isOfferAcceptable(input: {
  status: string;
  offerExpiresAt: Date;
  databaseNow: Date;
  expectedHeroId: number;
  actualHeroId: number;
  currentOfferId: number | null;
  actualOfferId: number;
}): 'ACCEPT' | 'IDEMPOTENT' | 'REJECT' {
  if (input.status === 'ACCEPTED' && input.expectedHeroId === input.actualHeroId && input.currentOfferId === input.actualOfferId) {
    return 'IDEMPOTENT';
  }
  if (!['PENDING', 'DELIVERED'].includes(input.status)) return 'REJECT';
  if (input.expectedHeroId !== input.actualHeroId || input.currentOfferId !== input.actualOfferId) return 'REJECT';
  if (input.offerExpiresAt.getTime() <= input.databaseNow.getTime()) return 'REJECT';
  return 'ACCEPT';
}

export function nextRetryState(attemptCount: number, maxAttempts: number): 'RETRY_WAIT' | 'ESCALATED' {
  return attemptCount >= maxAttempts ? 'ESCALATED' : 'RETRY_WAIT';
}

export type DispatchCandidateRank = {
  etaSeconds: number;
  workload: number;
  rating: number;
  distanceMeters: number;
  locationConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
};

export function comparePrimaryHeroCandidates(a: DispatchCandidateRank, b: DispatchCandidateRank): number {
  return (
    a.etaSeconds - b.etaSeconds ||
    a.workload - b.workload ||
    b.rating - a.rating ||
    a.distanceMeters - b.distanceMeters ||
    (a.locationConfidence === b.locationConfidence ? 0 : a.locationConfidence === 'HIGH' ? -1 : b.locationConfidence === 'HIGH' ? 1 : 0)
  );
}

export function isPreviousRouteFeasible(previousEnd: Date, etaSeconds: number, bufferMinutes: number, nextStart: Date): boolean {
  return previousEnd.getTime() + etaSeconds * 1000 + bufferMinutes * 60_000 <= nextStart.getTime();
}

export function isFollowingRouteFeasible(newEnd: Date, etaSeconds: number, bufferMinutes: number, followingStart: Date): boolean {
  return newEnd.getTime() + etaSeconds * 1000 + bufferMinutes * 60_000 <= followingStart.getTime();
}

export function canDispatchBooking(input: {
  isPackagePurchase: boolean;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  status: string;
}): boolean {
  if (input.isPackagePurchase) return false;
  if (!['PENDING_ASSIGNMENT', 'ON_HOLD'].includes(input.status)) return false;
  const online = ['ONLINE', 'UPI', 'CARD', 'ZOHO', 'RAZORPAY'].includes((input.paymentMethod ?? '').toUpperCase());
  if (online) return input.paymentStatus === 'PAID';
  return true;
}
