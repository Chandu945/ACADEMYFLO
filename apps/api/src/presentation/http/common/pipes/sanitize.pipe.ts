import { Injectable, type PipeTransform, type ArgumentMetadata } from '@nestjs/common';

/**
 * Global pipe that trims leading/trailing whitespace from all string values
 * in request body and query DTOs. Runs before ValidationPipe so that trimmed
 * values are validated correctly.
 *
 * NOTE: Despite the name "SanitizePipe", this pipe ONLY performs whitespace
 * trimming. It does NOT strip HTML tags, escape special characters, or
 * perform any XSS/injection sanitization. If full input sanitization is
 * required (e.g. HTML stripping, encoding), a dedicated sanitizer should
 * be added separately.
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
