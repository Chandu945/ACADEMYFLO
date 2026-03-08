import { IsOptional, IsString, IsIn, IsNumberString, IsBooleanString } from 'class-validator';

export class ListEnquiriesQuery {
  @IsOptional()
  @IsIn(['ACTIVE', 'CLOSED'])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  followUpToday?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
