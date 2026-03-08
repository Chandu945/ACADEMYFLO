import { IsOptional, IsString, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.query';

export class ListExpensesQueryDto extends PaginationQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
