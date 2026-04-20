import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AuditLogRepository, AuditLogFilter } from '@domain/audit/ports/audit-log.repository';
import type { AuditActionType, AuditEntityType, Paginated } from '@academyflo/contracts';
import { canViewAuditLogs } from '@domain/audit/rules/audit.rules';
import { AuditErrors } from '@domain/audit/errors/audit.errors';
import { isValidLocalDate } from '@domain/attendance/value-objects/local-date.vo';
import type { AuditLogDto } from '../dto/audit-log.dto';
import { toAuditLogDto } from '../dto/audit-log.dto';

interface ListAuditLogsInput {
  actorUserId: string;
  actorRole: string;
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  action?: AuditActionType;
  entityType?: AuditEntityType;
}

export class ListAuditLogsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  async execute(input: ListAuditLogsInput): Promise<Result<Paginated<AuditLogDto>, AppError>> {
    if (!canViewAuditLogs(input.actorRole as 'OWNER' | 'STAFF' | 'SUPER_ADMIN')) {
      return err(AuditErrors.viewNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor?.academyId) {
      return err(AuditErrors.academyRequired());
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

    const result = await this.auditLogRepo.listByAcademy(actor.academyId, filter);

    // Resolve actor names for display — single `$in` query instead of N findById
    // round-trips. `findByIds` short-circuits on empty input.
    const actorIds = [...new Set(result.items.map((l) => l.actorUserId))];
    const actors = await this.userRepo.findByIds(actorIds);
    const nameMap = new Map<string, string>();
    for (const u of actors) {
      nameMap.set(u.id.toString(), u.fullName);
    }

    return ok({
      items: result.items.map((l) => toAuditLogDto(l, nameMap.get(l.actorUserId))),
      meta: result.meta,
    });
  }
}
