import test from 'node:test';
import assert from 'node:assert/strict';
import { mapLegacyTable, REQUIRED_REHEARSAL_TABLES } from './legacy-map';

test('legacy table map', async (t) => {
  await t.test('sends tasks to archived visits, never live assignment', () => {
    assert.equal(mapLegacyTable('tasks').target, 'legacy_booking_visits');
  });
  await t.test('does not migrate settings secrets', () => {
    assert.equal(mapLegacyTable('settings').target, 'skip_secrets');
  });
  await t.test('unknown tables are logged rather than dropped', () => {
    assert.equal(mapLegacyTable('neodove_whatever').target, 'skip_unmapped');
  });
  await t.test('rehearsal tables are listed', () => {
    assert.ok(REQUIRED_REHEARSAL_TABLES.includes('orders'));
  });
});
