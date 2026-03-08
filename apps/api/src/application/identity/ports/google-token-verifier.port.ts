import type { Result } from '@shared/kernel';
import type { AppError } from '@shared/kernel';

export const GOOGLE_TOKEN_VERIFIER = Symbol('GOOGLE_TOKEN_VERIFIER');

export interface GoogleUserInfo {
  email: string;
  name: string;
  sub: string;
}

export interface GoogleTokenVerifierPort {
  verify(idToken: string): Promise<Result<GoogleUserInfo, AppError>>;
}
