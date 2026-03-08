import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { AuditLogRepository, AuditLogFilter } from '@domain/audit/ports/audit-log.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AuditActionType, AuditEntityType, Paginated } from '@playconnect/contracts';
import { AdminErrors } from '../../common/errors';
import { isValidLocalDate } from '@domain/attendance/value-objects/local-date.vo';
import type { AuditLogDto } from '../../audit/dto/audit-log.dto';
import { toAuditLogDto } from '../../audit/dto/audit-log.dto';

interface ListAcademyAuditLogsInput {
  actorRole: string;
  academyId: string;
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  action?: AuditActionType;
  entityType?: AuditEntityType;
}

export class ListAcademyAuditLogsUseCase {
  constructor(
    private readonly auditLogRepo: AuditLogRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(
    input: ListAcademyAuditLogsInput,
  ): Promise<Result<Paginated<AuditLogDto>, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    if (input.from && !isValidLocalDate(input.from)) {
      return err(AppError.validation('Invalid from date format. Expected YYYY-MM-DD'));
    }
    if (input.to && !isValidLocalDate(input.to)) {
      return err(AppError.validation('Invalid to date format. Expected YYYY-MM-DD'));
    }

    const filter: AuditLogFilter = {
      page: input.page,
      pageSize: input.pageSize,
      from: input.from,
      to: input.to,
      action: input.action,
      entityType: input.entityType,
    };

    const result = await this.auditLogRepo.listByAcademy(input.academyId, filter);

    // Resolve actor names for display
    const actorIds = [...new Set(result.items.map((l) => l.actorUserId))];
    const actors = await Promise.all(actorIds.map((id) => this.userRepo.findById(id)));
    const nameMap = new Map<string, string>();
    for (const u of actors) {
      if (u) nameMap.set(u.id.toString(), u.fullName);
    }

    return ok({
      items: result.items.map((l) => toAuditLogDto(l, nameMap.get(l.actorUserId))),
      meta: result.meta,
    });
  }
}
