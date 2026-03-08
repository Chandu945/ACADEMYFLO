import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type {
  AdminQueryRepository,
  AcademyDetail,
} from '@domain/admin/ports/admin-query.repository';
import { AdminErrors } from '../../common/errors';

interface GetAcademyDetailInput {
  actorRole: string;
  academyId: string;
}

export class GetAcademyDetailUseCase {
  constructor(private readonly adminQueryRepo: AdminQueryRepository) {}

  async execute(input: GetAcademyDetailInput): Promise<Result<AcademyDetail, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    const detail = await this.adminQueryRepo.getAcademyDetail(input.academyId, new Date());
    if (!detail) {
      return err(AdminErrors.academyNotFound(input.academyId));
    }

    return ok(detail);
  }
}
