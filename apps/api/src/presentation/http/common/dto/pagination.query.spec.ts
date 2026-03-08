import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto } from './pagination.query';

describe('PaginationQueryDto', () => {
  function toDto(plain: Record<string, unknown>): PaginationQueryDto {
    return plainToInstance(PaginationQueryDto, plain);
  }

  it('should use defaults when no values provided', async () => {
    const dto = toDto({});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
  });

  it('should accept valid page and pageSize', async () => {
    const dto = toDto({ page: '3', pageSize: '50' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.pageSize).toBe(50);
  });

  it('should reject page less than 1', async () => {
    const dto = toDto({ page: '0' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.property).toBe('page');
  });

  it('should reject pageSize greater than 100', async () => {
    const dto = toDto({ pageSize: '101' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.property).toBe('pageSize');
  });

  it('should reject non-integer page', async () => {
    const dto = toDto({ page: '1.5' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept pageSize of exactly 100', async () => {
    const dto = toDto({ pageSize: '100' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.pageSize).toBe(100);
  });
});
