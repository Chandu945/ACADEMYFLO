import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Validates that a route parameter is a 24-char hex ObjectId string.
 *
 * Uses a strict regex (not mongoose.Types.ObjectId.isValid) to:
 *   1. Keep the presentation layer free of vendor SDK imports.
 *   2. Reject Mongoose's looser 12-char-string form, which is an
 *      undocumented quirk that lets non-ObjectId strings through.
 *
 * Usage: @Param('id', ParseObjectIdPipe) id: string
 */
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!OBJECT_ID_RE.test(value)) {
      throw new BadRequestException('Invalid ID format');
    }
    return value;
  }
}
