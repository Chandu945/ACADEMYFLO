import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class FeesMonthQueryDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month!: string;
}

export class StudentFeeRangeQueryDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'from must be in YYYY-MM format' })
  from!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'to must be in YYYY-MM format' })
  to!: string;
}
