export const OTP_GENERATOR = Symbol('OTP_GENERATOR');

export interface OtpGenerator {
  generate(): string;
}
