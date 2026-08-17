import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeIndianMobile } from './phone';

describe('normalizeIndianMobile', () => {
  it('accepts a 10-digit Indian mobile', () => {
    assert.equal(normalizeIndianMobile('9876543210'), '9876543210');
  });

  it('strips +91', () => {
    assert.equal(normalizeIndianMobile('+91 98765 43210'), '9876543210');
  });

  it('rejects landlines and short numbers', () => {
    assert.equal(normalizeIndianMobile('12345'), null);
    assert.equal(normalizeIndianMobile('0876543210'), null);
  });
});
