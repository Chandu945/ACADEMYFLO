import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type {
  AdminQueryRepository,
  AdminAcademiesFilter,
  AcademyListRow,
} from '@domain/admin/ports/admin-query.repository';
import { AdminErrors } from '../../common/errors';
import type { AdminAcademyStatus, TierKey } from '@playconnect/contracts';

interface ListAcademiesInput {
  actorRole: string;
  page: number;
  pageSize: number;
  status?: AdminAcademyStatus;
  search?: string;
  tierKey?: TierKey;
}

export class ListAcademiesUseCase {
  constructor(private readonly adminQueryRepo: AdminQueryRepository) {}

  async execute(
    input: ListAcademiesInput,
  ): Promise<Result<{ items: AcademyListRow[]; total: number }, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    const filter: AdminAcademiesFilter = {
      page: input.page,
      pageSize: input.pageSize,
      status: input.status,
      search: input.search,
      tierKey: input.tierKey,
    };

    const result = await this.adminQueryRepo.listAcademies(filter, new Date());
    return ok(result);
  }
}
