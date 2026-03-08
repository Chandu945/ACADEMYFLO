import { SanitizePipe } from './sanitize.pipe';
import type { ArgumentMetadata } from '@nestjs/common';

describe('SanitizePipe', () => {
  const pipe = new SanitizePipe();

  const bodyMeta: ArgumentMetadata = { type: 'body', metatype: Object, data: '' };
  const queryMeta: ArgumentMetadata = { type: 'query', metatype: Object, data: '' };
  const paramMeta: ArgumentMetadata = { type: 'param', metatype: String, data: 'id' };

  it('trims string body values', () => {
    expect(pipe.transform('  hello  ', bodyMeta)).toBe('hello');
  });

  it('trims string query values', () => {
    expect(pipe.transform('  hello  ', queryMeta)).toBe('hello');
  });

  it('does not trim param values', () => {
    expect(pipe.transform('  hello  ', paramMeta)).toBe('  hello  ');
  });

  it('trims nested object string values', () => {
    const input = { name: '  John  ', age: 25, address: { city: '  Mumbai  ' } };
    const result = pipe.transform(input, bodyMeta);
    expect(result).toEqual({ name: 'John', age: 25, address: { city: 'Mumbai' } });
  });

  it('passes through null and undefined', () => {
    expect(pipe.transform(null, bodyMeta)).toBeNull();
    expect(pipe.transform(undefined, bodyMeta)).toBeUndefined();
  });

  it('passes through arrays unchanged', () => {
    const arr = ['  hello  ', '  world  '];
    expect(pipe.transform(arr, bodyMeta)).toEqual(arr);
  });

  it('passes through numbers unchanged', () => {
    expect(pipe.transform(42, bodyMeta)).toBe(42);
  });
});
