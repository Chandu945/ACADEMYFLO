import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type {
  AdminQueryRepository,
  DashboardTiles,
} from '@domain/admin/ports/admin-query.repository';
import { AdminErrors } from '../../common/errors';

interface GetAdminDashboardInput {
  actorRole: string;
}

export class GetAdminDashboardUseCase {
  constructor(private readonly adminQueryRepo: AdminQueryRepository) {}

  async execute(input: GetAdminDashboardInput): Promise<Result<DashboardTiles, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    const tiles = await this.adminQueryRepo.getDashboardTiles(new Date());
    return ok(tiles);
  }
}
