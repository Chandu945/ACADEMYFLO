export const OTP_HASHER = Symbol('OTP_HASHER');

export interface OtpHasher {
  hash(otp: string): Promise<string>;
  compare(otp: string, hash: string): Promise<boolean>;
}
