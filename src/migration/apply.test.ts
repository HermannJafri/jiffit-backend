import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertIsolatedTargetUrl, parseLegacyCoordinate, parseLegacyDate } from './apply';

describe('isolated migration target', () => {
  it('accepts jiffit_migration_target', () => {
    assert.equal(
      assertIsolatedTargetUrl('mysql://root:x@localhost:3306/jiffit_migration_target'),
      'jiffit_migration_target',
    );
  });

  it('refuses jiffit_dev and existing local business schemas', () => {
    assert.throws(() => assertIsolatedTargetUrl('mysql://root:x@localhost:3306/jiffit_dev'));
    assert.throws(() => assertIsolatedTargetUrl('mysql://root:x@localhost:3306/old_import_jiffit'));
    assert.throws(() => assertIsolatedTargetUrl('mysql://root:x@localhost:3306/jiffit_legacy_source'));
  });
});

describe('legacy value normalization', () => {
  it('preserves MySQL zero dates without inventing a timestamp', () => {
    assert.deepEqual(parseLegacyDate('0000-00-00 00:00:00'), {
      date: null,
      raw: '0000-00-00 00:00:00',
    });
    assert.deepEqual(parseLegacyDate('0000-11-30'), {
      date: null,
      raw: '0000-11-30',
    });
  });

  it('parses valid MySQL dates in UTC', () => {
    assert.equal(parseLegacyDate('2025-08-04 00:00:00').date?.toISOString(), '2025-08-04T00:00:00.000Z');
  });

  it('keeps invalid coordinates as raw data only', () => {
    assert.deepEqual(parseLegacyCoordinate('851164262', -180, 180), {
      value: null,
      raw: '851164262',
      invalid: true,
    });
    assert.deepEqual(parseLegacyCoordinate('85.1234567891', -180, 180), {
      value: 85.12345679,
      raw: '85.1234567891',
      invalid: false,
    });
  });
});
