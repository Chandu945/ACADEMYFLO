import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { USER_ROLES } from '@academyflo/contracts';
import type { UserRole } from '@academyflo/contracts';
import { PaginationQueryDto } from '../../common/dto/pagination.query';

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search query — name, email, or phone (contains)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @IsIn([...USER_ROLES])
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Limit to one academy' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  academyId?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
