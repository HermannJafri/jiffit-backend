import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertProductionOtpSafety, isMasterOtpEnabled } from './otp-safety';

describe('OTP production safety', () => {
  it('forbids test mode in production', () => {
    assert.throws(() => assertProductionOtpSafety('production', '', true, false, () => undefined));
  });

  it('forbids master OTP in production', () => {
    assert.throws(() => assertProductionOtpSafety('production', '123456', false, true, () => undefined));
  });

  it('allows test mode in development', () => {
    assert.doesNotThrow(() => assertProductionOtpSafety('development', '', true, false, () => undefined));
  });

  it('does not enable master OTP in production even if flagged', () => {
    assert.equal(isMasterOtpEnabled('production', '123456', true), false);
  });
});
