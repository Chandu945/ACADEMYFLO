import { Injectable } from '@nestjs/common';
import pino from 'pino';
import type { LoggerPort } from './logger.port';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class PinoLoggerService implements LoggerPort {
  private readonly logger: pino.Logger;

  constructor(private readonly configService: AppConfigService) {
    this.logger = pino({
      level: configService.logLevel,
      ...(configService.isDevelopment
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.info(context ?? {}, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(context ?? {}, message);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logger.error(context ?? {}, message);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(context ?? {}, message);
  }
}
