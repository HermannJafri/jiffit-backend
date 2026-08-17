import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { haversineDistance, pickServiceableHub, missingServiceIdsAtLocation } from './haversine';

describe('haversineDistance', () => {
  it('is ~0 for the same point', () => {
    assert.ok(haversineDistance(25.5941, 85.1376, 25.5941, 85.1376) < 1);
  });

  it('measures Patna to a nearby point in hundreds of meters, not kilometers', () => {
    const meters = haversineDistance(25.5941, 85.1376, 25.6, 85.14);
    assert.ok(meters > 500);
    assert.ok(meters < 2000);
  });
});

describe('pickServiceableHub', () => {
  const hubs = [
    { id: 1, name: 'Far', cityId: 1, latitude: 28.6139, longitude: 77.209, serviceRadiusMeters: 8000 },
    { id: 2, name: 'Near', cityId: 1, latitude: 25.5941, longitude: 85.1376, serviceRadiusMeters: 10000 },
  ];

  it('returns the nearest hub inside its service radius', () => {
    const picked = pickServiceableHub(25.595, 85.138, hubs);
    assert.equal(picked?.id, 2);
  });

  it('returns null when no hub covers the point', () => {
    assert.equal(pickServiceableHub(19.076, 72.8777, hubs), null);
  });
});

describe('missingServiceIdsAtLocation', () => {
  it('uses the nearest hub that actually offers the service', () => {
    const hubs = [
      { id: 1, name: 'Near without sofa', cityId: 1, latitude: 25.5941, longitude: 85.1376, serviceRadiusMeters: 15000, offeredServiceIds: [10] },
      { id: 2, name: 'Same point with sofa', cityId: 1, latitude: 25.5941, longitude: 85.1376, serviceRadiusMeters: 15000, offeredServiceIds: [20] },
    ];
    assert.deepEqual(missingServiceIdsAtLocation(25.5941, 85.1376, hubs, [20]), []);
    assert.deepEqual(missingServiceIdsAtLocation(25.5941, 85.1376, hubs, [99]), [99]);
  });
});
