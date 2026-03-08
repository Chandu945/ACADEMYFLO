export const OTP_SERVICE = Symbol('OTP_SERVICE');

/**
 * @deprecated Use OtpGenerator and OtpHasher ports instead.
 * See: otp-generator.port.ts and otp-hasher.port.ts
 */
export interface OtpService {
  sendOtp(target: string): Promise<void>;
  verifyOtp(target: string, code: string): Promise<boolean>;
}
