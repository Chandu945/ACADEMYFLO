import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AUDIT_ACTION_TYPES, AUDIT_ENTITY_TYPES } from '@playconnect/contracts';
import type { AuditActionType, AuditEntityType } from '@playconnect/contracts';
import { PaginationQueryDto } from '../../common/dto/pagination.query';

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  override pageSize: number = 50;

  @ApiPropertyOptional({ example: '2024-03-01', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be YYYY-MM-DD format' })
  from?: string;

  @ApiPropertyOptional({ example: '2024-03-31', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be YYYY-MM-DD format' })
  to?: string;

  @ApiPropertyOptional({ enum: AUDIT_ACTION_TYPES })
  @IsOptional()
  @IsIn([...AUDIT_ACTION_TYPES])
  action?: AuditActionType;

  @ApiPropertyOptional({ enum: AUDIT_ENTITY_TYPES })
  @IsOptional()
  @IsIn([...AUDIT_ENTITY_TYPES])
  entityType?: AuditEntityType;
}
