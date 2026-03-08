import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';
import { requestContextStorage } from '@shared/context/request-context';

export const REQUEST_ID_HEADER = 'X-Request-Id';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const requestId = (request.headers[REQUEST_ID_HEADER.toLowerCase()] as string) || uuidv4();

    request.headers[REQUEST_ID_HEADER.toLowerCase()] = requestId;

    return new Observable((subscriber) => {
      requestContextStorage.run({ requestId }, () => {
        next
          .handle()
          .pipe(
            tap(() => {
              response.setHeader(REQUEST_ID_HEADER, requestId);
            }),
          )
          .subscribe(subscriber);
      });
    });
  }
}

/** Helper to extract requestId from the current request */
export function getRequestId(request: Request): string {
  return (request.headers[REQUEST_ID_HEADER.toLowerCase()] as string) || 'unknown';
}
