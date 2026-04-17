import { IsString, MinLength, MaxLength, IsOptional, IsIn, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { PAYMENT_REQUEST_STATUSES } from '@playconnect/contracts';
import { PaginationQueryDto } from '../../common/dto/pagination.query';
import { sanitizeNotes } from '../../common/sanitizers/notes-sanitizer';

export class CreatePaymentRequestDto {
  @IsString()
  studentId!: string;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be in YYYY-MM format' })
  monthKey!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeNotes(value) : value))
  staffNotes!: string;
}

export class RejectPaymentRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeNotes(value) : value))
  reason!: string;
}

export class ListPaymentRequestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(PAYMENT_REQUEST_STATUSES)
  status?: string;
}

export class EditPaymentRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeNotes(value) : value))
  staffNotes!: string;
}

export class ListTransactionLogsQueryDto extends PaginationQueryDto {}
