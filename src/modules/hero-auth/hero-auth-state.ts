import type { HeroStatus } from '@prisma/client';

export type HeroAccessLevel = 'ONBOARDING' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface HeroAuthStateRecord {
  id: number;
  phone: string;
  status: HeroStatus;
  isActive: boolean;
  isBlacklisted: boolean;
  deletedAt: Date | null;
  deleteRequestedAt: Date | null;
  language?: unknown;
  name?: string | null;
  _count?: { jobRoles: number };
  cityId?: number | null;
  hubId?: number | null;
  workType?: unknown;
  vehicleType?: unknown;
  earningsType?: unknown;
}

export class HeroAccountStateError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 403,
  ) {
    super(message);
  }
}

export const heroAuthStateSelect = {
  id: true,
  phone: true,
  status: true,
  isActive: true,
  isBlacklisted: true,
  deletedAt: true,
  deleteRequestedAt: true,
  language: true,
  name: true,
  _count: { select: { jobRoles: true } },
  cityId: true,
  hubId: true,
  workType: true,
  vehicleType: true,
  earningsType: true,
} as const;

export function assertHeroAccountAvailable(hero: HeroAuthStateRecord): void {
  if (hero.deletedAt || hero.deleteRequestedAt) {
    throw new HeroAccountStateError('HERO_DELETED', 'This Hero account is unavailable', 410);
  }
  if (hero.isBlacklisted) {
    throw new HeroAccountStateError('HERO_BLACKLISTED', 'This Hero account is blocked');
  }
  if (hero.status === 'SUSPENDED') {
    throw new HeroAccountStateError('HERO_SUSPENDED', 'This Hero account is suspended');
  }
  if (!hero.isActive) {
    throw new HeroAccountStateError('HERO_INACTIVE', 'This Hero account is inactive');
  }
}

export function heroAccessLevel(hero: HeroAuthStateRecord): HeroAccessLevel {
  assertHeroAccountAvailable(hero);
  switch (hero.status) {
    case 'INCOMPLETE':
      return 'ONBOARDING';
    case 'PENDING_APPROVAL':
      return 'PENDING';
    case 'VERIFIED':
      return 'VERIFIED';
    case 'REJECTED':
      return 'REJECTED';
    default:
      throw new HeroAccountStateError('HERO_UNAVAILABLE', 'This Hero account is unavailable');
  }
}

export function heroOnboardingStep(hero: HeroAuthStateRecord): string | null {
  if (!hero.language) return 'language';
  if (!hero.name?.trim()) return 'name';
  if (!hero._count?.jobRoles) return 'job-role';
  if (!hero.cityId) return 'city';
  if (!hero.hubId) return 'hub';
  if (!hero.workType) return 'work-type';
  if (!hero.vehicleType) return 'vehicle';
  if (!hero.earningsType) return 'earnings';
  return null;
}

export function heroAuthContract(hero: HeroAuthStateRecord) {
  const accessLevel = heroAccessLevel(hero);
  const onboardingStep = heroOnboardingStep(hero);
  return {
    applicationStatus: hero.status,
    requiresOnboarding: accessLevel === 'ONBOARDING',
    onboardingStep,
    profileComplete: onboardingStep === null,
    accessLevel,
    isVerified: accessLevel === 'VERIFIED',
    isActive: hero.isActive,
    isBlacklisted: hero.isBlacklisted,
  };
}

export function isOperationalHero(hero: HeroAuthStateRecord): boolean {
  try {
    return heroAccessLevel(hero) === 'VERIFIED';
  } catch {
    return false;
  }
}
