import { BadRequestException } from '@nestjs/common';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

describe('ParseObjectIdPipe', () => {
  const pipe = new ParseObjectIdPipe();

  it('accepts a valid 24-char hex ObjectId', () => {
    const id = '507f1f77bcf86cd799439011';
    expect(pipe.transform(id)).toBe(id);
  });

  it('rejects Mongo operator injection attempts', () => {
    for (const bad of ['{"$ne":null}', '[object Object]', '{$gt:""}', '$where']) {
      expect(() => pipe.transform(bad)).toThrow(BadRequestException);
    }
  });

  it('rejects malformed ids', () => {
    for (const bad of ['', '123', 'not-an-id', '507f1f77bcf86cd79943901', '507f1f77bcf86cd799439011z']) {
      expect(() => pipe.transform(bad)).toThrow(BadRequestException);
    }
  });
});
