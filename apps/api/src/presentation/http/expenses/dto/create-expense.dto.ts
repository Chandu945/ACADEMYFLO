import { IsString, IsNumber, IsOptional, Matches, Min, MaxLength } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  categoryId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
