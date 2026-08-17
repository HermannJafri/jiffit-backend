export function isMasterOtpEnabled(
  nodeEnv: string,
  masterOtp: string,
  allowTemporarily: boolean,
): boolean {
  return allowTemporarily && masterOtp.trim().length > 0 && nodeEnv !== 'production';
}

export function assertProductionOtpSafety(
  nodeEnv: string,
  masterOtp: string,
  testModeEnabled: boolean,
  allowMasterOtpTemporarily: boolean,
  warn: (message: string) => void,
): void {
  if (nodeEnv === 'production' && testModeEnabled) {
    throw new Error('Unsafe OTP test configuration is forbidden in production');
  }
  if (nodeEnv === 'production' && allowMasterOtpTemporarily) {
    throw new Error('Master OTP is forbidden in production');
  }
  if (nodeEnv !== 'production' && allowMasterOtpTemporarily && masterOtp.trim().length > 0) {
    warn('Master OTP temporary bridge is enabled — never use this in production');
  }
}
