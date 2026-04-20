import { BadRequestException } from '@nestjs/common';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

describe('ParseObjectIdPipe', () => {
  const pipe = new ParseObjectIdPipe();

  it('accepts a valid 24-char hex ObjectId', () => {
    const id = '507f1f77bcf86cd799439011';
    expect(pipe.transform(id)).toBe(id);
  });

  it('accepts a UUID (the system-generated id format)', () => {
    for (const id of [
      '123e4567-e89b-12d3-a456-426614174000',
      'A1B2C3D4-E5F6-7890-ABCD-EF1234567890',
    ]) {
      expect(pipe.transform(id)).toBe(id);
    }
  });

  it('rejects Mongo operator injection attempts', () => {
    for (const bad of ['{"$ne":null}', '[object Object]', '{$gt:""}', '$where']) {
      expect(() => pipe.transform(bad)).toThrow(BadRequestException);
    }
  });

  it('rejects malformed ids', () => {
    for (const bad of [
      '',
      '123',
      'not-an-id',
      '507f1f77bcf86cd79943901', // 23 chars
      '507f1f77bcf86cd799439011z', // trailing junk
      '123e4567-e89b-12d3-a456-42661417400', // UUID missing 1 char
      '123e4567_e89b_12d3_a456_426614174000', // wrong separator
    ]) {
      expect(() => pipe.transform(bad)).toThrow(BadRequestException);
    }
  });
});
