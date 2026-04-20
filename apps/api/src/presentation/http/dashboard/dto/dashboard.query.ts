import { IsOptional, IsString, Matches, IsIn, Validate } from 'class-validator';
import type { ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { ValidatorConstraint } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Reject calendar overflow ("2025-02-30") and require both-or-neither, with
// from <= to. Format-only regex passes invalid days like 30 Feb because
// JS `new Date(2025,1,30)` silently rolls forward.
@ValidatorConstraint({ name: 'DashboardDateRange', async: false })
class DashboardDateRangeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as DashboardQueryDto;
    const { from, to } = dto;
    // Both-or-neither
    if ((from && !to) || (!from && to)) return false;
    if (!from || !to) return true;
    // Calendar validity: regex passed; check day in range for the month.
    const isValid = (s: string): boolean => {
      const [y, m, d] = s.split('-').map(Number);
      if (!y || !m || !d) return false;
      const dt = new Date(y, m - 1, d);
      return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
    };
    if (!isValid(from) || !isValid(to)) return false;
    return from <= to;
  }
  defaultMessage(): string {
    return 'from/to must both be present, valid calendar dates, and from <= to';
  }
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: ['THIS_MONTH'] })
  @IsOptional()
  @IsIn(['THIS_MONTH'])
  preset?: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be in YYYY-MM-DD format' })
  from?: string;

  @ApiPropertyOptional({ example: '2025-01-31' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be in YYYY-MM-DD format' })
  // Validator runs against the whole DTO, anchored on `to` because the field
  // value here is irrelevant — the constraint inspects both `from` and `to`.
  @Validate(DashboardDateRangeConstraint)
  to?: string;
}
