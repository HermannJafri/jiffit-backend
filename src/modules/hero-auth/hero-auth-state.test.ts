import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertHeroAccountAvailable,
  heroAccessLevel,
  heroAuthContract,
  heroOnboardingStep,
  type HeroAuthStateRecord,
} from './hero-auth-state';

const base = (): HeroAuthStateRecord => ({
  id: 1,
  phone: '9876543210',
  status: 'INCOMPLETE',
  isActive: true,
  isBlacklisted: false,
  deletedAt: null,
  deleteRequestedAt: null,
  language: 'ENGLISH',
  name: 'Ravi',
  _count: { jobRoles: 1 },
  cityId: 1,
  hubId: 1,
  workType: 'BIKE_RIDER',
  vehicleType: 'BIKE',
  earningsType: 'COMMISSION',
});

describe('hero auth gating', () => {
  it('blocks blacklisted heroes', () => {
    assert.throws(() => assertHeroAccountAvailable({ ...base(), isBlacklisted: true }));
  });

  it('treats incomplete profiles as onboarding', () => {
    assert.equal(heroAccessLevel({ ...base(), status: 'INCOMPLETE', name: null }), 'ONBOARDING');
    assert.equal(heroOnboardingStep({ ...base(), name: null }), 'name');
  });

  it('returns a verified contract for operational heroes', () => {
    const contract = heroAuthContract({ ...base(), status: 'VERIFIED' });
    assert.equal(contract.accessLevel, 'VERIFIED');
    assert.equal(contract.profileComplete, true);
    assert.equal(contract.isVerified, true);
  });
});
