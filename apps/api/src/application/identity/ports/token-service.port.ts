export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface AccessTokenPayload {
  sub: string;
  role: string;
  email: string;
  academyId: string | null;
  tokenVersion: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenService {
  generateAccessToken(payload: AccessTokenPayload): string;
  generateRefreshToken(): string;
  verifyAccessToken(token: string): AccessTokenPayload | null;
  hashRefreshToken(token: string): string;
  compareRefreshToken(token: string, hash: string): boolean;
}
