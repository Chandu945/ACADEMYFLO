import { Injectable, type PipeTransform, type ArgumentMetadata } from '@nestjs/common';

/**
 * Global pipe that trims all string values in request DTOs.
 * Runs before ValidationPipe so trimmed values are validated correctly.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body' && metadata.type !== 'query') {
      return value;
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return this.sanitizeObject(value as Record<string, unknown>);
    }

    return value;
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string') {
        result[key] = val.trim();
      } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = this.sanitizeObject(val as Record<string, unknown>);
      } else {
        result[key] = val;
      }
    }
    return result;
  }
}
