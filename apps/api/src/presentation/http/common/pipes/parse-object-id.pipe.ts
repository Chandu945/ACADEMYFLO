import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Validates that a route parameter is a safe entity id: either a UUID
 * (the format this system actually generates via `randomUUID()`) or a
 * 24-char hex ObjectId (legacy/compat).
 *
 * The strict regex shape keeps the presentation layer free of vendor
 * SDK imports and blocks Mongo operator injection (braces, $, quotes,
 * `[object Object]`, etc.) at the HTTP boundary.
 *
 * Usage: @Param('id', ParseObjectIdPipe) id: string
 */
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || (!UUID_RE.test(value) && !OBJECT_ID_RE.test(value))) {
      throw new BadRequestException('Invalid ID format');
    }
    return value;
  }
}
