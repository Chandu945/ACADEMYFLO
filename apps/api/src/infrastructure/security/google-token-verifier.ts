import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type {
  GoogleTokenVerifierPort,
  GoogleUserInfo,
} from '@application/identity/ports/google-token-verifier.port';
import { AppConfigService } from '@shared/config/config.service';

@Injectable()
export class GoogleTokenVerifier implements GoogleTokenVerifierPort {
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(config: AppConfigService) {
    this.clientId = config.googleClientId;
    this.client = new OAuth2Client(this.clientId);
  }

  async verify(idToken: string): Promise<Result<GoogleUserInfo, AppError>> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return err({ code: 'GOOGLE_TOKEN_INVALID', message: 'Invalid Google token payload' });
      }
      return ok({
        email: payload.email,
        name: payload.name ?? payload.email,
        sub: payload.sub,
      });
    } catch {
      return err({ code: 'GOOGLE_TOKEN_INVALID', message: 'Failed to verify Google ID token' });
    }
  }
}
