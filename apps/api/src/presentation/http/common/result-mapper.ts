import {
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import type { Result } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { getRequestId } from '@shared/logging/request-id.interceptor';
import type { Request } from 'express';

const ERROR_STATUS_MAP: Record<string, HttpStatus> = {
  VALIDATION: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  ACADEMY_SETUP_REQUIRED: HttpStatus.CONFLICT,
  SUBSCRIPTION_BLOCKED: HttpStatus.FORBIDDEN,
  PAYMENT_PROVIDER_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
  FEATURE_DISABLED: HttpStatus.SERVICE_UNAVAILABLE,
  COOLDOWN_ACTIVE: HttpStatus.TOO_MANY_REQUESTS,
  // G1 mobile-alignment fix: storage failures get 503 (Service Unavailable)
  // — the storage backend is what failed, not the request. The mobile
  // error-mapper now reads body `code` so the upload screen surfaces the
  // real "Failed to upload..." copy rather than a generic 500. NETWORK is
  // the transient/retryable storage variant and also maps to 503; the
  // body code lets the client distinguish retryable vs terminal.
  UPLOAD_FAILED: HttpStatus.SERVICE_UNAVAILABLE,
  NETWORK: HttpStatus.SERVICE_UNAVAILABLE,
};

export function throwMappedError(error: AppError): never {
  const status = ERROR_STATUS_MAP[error.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
  // G1 mobile-alignment fix: pass an object response (not a bare string) so
  // the typed AppError code travels with the message. The GlobalExceptionFilter
  // reads `code` and emits it in the envelope; the mobile error-mapper
  // prefers `body.code` over status-code mapping. Without this, codes like
  // UPLOAD_FAILED collapsed to status 503 → mobile UNKNOWN → generic copy.
  const body = { message: error.message, code: error.code };
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      throw new BadRequestException(body);
    case HttpStatus.UNAUTHORIZED:
      throw new UnauthorizedException(body);
    case HttpStatus.FORBIDDEN:
      throw new ForbiddenException(body);
    case HttpStatus.NOT_FOUND:
      throw new NotFoundException(body);
    case HttpStatus.CONFLICT:
      throw new ConflictException(body);
    case HttpStatus.TOO_MANY_REQUESTS:
      throw new HttpException(body, HttpStatus.TOO_MANY_REQUESTS);
    case HttpStatus.SERVICE_UNAVAILABLE:
      throw new ServiceUnavailableException(body);
    default:
      throw new InternalServerErrorException(body);
  }
}

export function mapResultToResponse<T>(
  result: Result<T, AppError>,
  req: Request,
  _successStatus: HttpStatus = HttpStatus.OK,
): { success: true; data: T; requestId: string; timestamp: string } {
  if (!result.ok) {
    throwMappedError(result.error);
  }

  // If we need to set a non-200 status we can do so via the response object,
  // but NestJS infers from @HttpCode or @Post defaults.
  // For 201 we handle it in the controller with @HttpCode.

  return {
    success: true,
    data: result.value,
    requestId: getRequestId(req),
    timestamp: new Date().toISOString(),
  };
}
