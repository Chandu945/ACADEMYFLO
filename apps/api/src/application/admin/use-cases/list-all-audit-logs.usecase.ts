import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { AuditActionType, AuditEntityType, Paginated } from '@academyflo/contracts';
import { AdminErrors } from '../../common/errors';
import { isValidLocalDate } from '@domain/attendance/value-objects/local-date.vo';
import type { AuditLogDto } from '../../audit/dto/audit-log.dto';
import { toAuditLogDto } from '../../audit/dto/audit-log.dto';
import type { AdminAuditLogReader, AdminAuditLogFilter } from '../ports/admin-audit-log-reader.port';

interface ListAllAuditLogsInput {
  actorRole: string;
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  action?: AuditActionType;
  entityType?: AuditEntityType;
  academyId?: string;
  actorUserId?: string;
}

export interface AdminAuditLogDto extends AuditLogDto {
  academyName: string | null;
}

export class ListAllAuditLogsUseCase {
  constructor(
    private readonly reader: AdminAuditLogReader,
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
  ) {}

  async execute(input: ListAllAuditLogsInput): Promise<Result<Paginated<AdminAuditLogDto>, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    if (input.from && !isValidLocalDate(input.from)) {
      return err(AppError.validation('Invalid from date format. Expected YYYY-MM-DD'));
    }
    if (input.to && !isValidLocalDate(input.to)) {
      return err(AppError.validation('Invalid to date format. Expected YYYY-MM-DD'));
    }

    const filter: AdminAuditLogFilter = {
      page: input.page,
      pageSize: input.pageSize,
      from: input.from,
      to: input.to,
      action: input.action,
      entityType: input.entityType,
      academyId: input.academyId,
      actorUserId: input.actorUserId,
    };

    const result = await this.reader.listAll(filter);

    // Resolve actor names + academy names for display in one batched lookup.
    // Cross-academy listings often repeat the same actor/academy, so we
    // de-duplicate before round-tripping the DB.
    const actorIds = [...new Set(result.items.map((l) => l.actorUserId))];
    const academyIds = [...new Set(result.items.map((l) => l.academyId))];

    const [actors, academies] = await Promise.all([
      Promise.all(actorIds.map((id) => this.userRepo.findById(id))),
      Promise.all(academyIds.map((id) => this.academyRepo.findById(id))),
    ]);

    const actorNameMap = new Map<string, string>();
    for (const u of actors) {
      if (u) actorNameMap.set(u.id.toString(), u.fullName);
    }

    const academyNameMap = new Map<string, string>();
    for (const a of academies) {
      if (a) academyNameMap.set(a.id.toString(), a.academyName);
    }

    return ok({
      items: result.items.map((l) => ({
        ...toAuditLogDto(l, actorNameMap.get(l.actorUserId)),
        academyName: academyNameMap.get(l.academyId) ?? null,
      })),
      meta: result.meta,
    });
  }
}
