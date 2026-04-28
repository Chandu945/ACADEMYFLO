import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { Paginated, UserRole } from '@academyflo/contracts';
import { AdminErrors } from '../../common/errors';
import type {
  AdminUserReader,
  AdminUserSearchFilter,
} from '../ports/admin-user-reader.port';

export interface AdminUserSearchDto {
  id: string;
  fullName: string;
  emailNormalized: string;
  phoneE164: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  academyId: string | null;
  academyName: string | null;
  createdAt: string;
}

interface Input {
  actorRole: string;
  page: number;
  pageSize: number;
  q?: string;
  role?: UserRole;
  academyId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export class SearchAdminUsersUseCase {
  constructor(
    private readonly reader: AdminUserReader,
    private readonly academyRepo: AcademyRepository,
  ) {}

  async execute(input: Input): Promise<Result<Paginated<AdminUserSearchDto>, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    const filter: AdminUserSearchFilter = {
      page: input.page,
      pageSize: input.pageSize,
      q: input.q,
      role: input.role,
      academyId: input.academyId,
      status: input.status,
    };

    const result = await this.reader.search(filter);

    const academyIds = [
      ...new Set(result.items.map((r) => r.academyId).filter((id): id is string => !!id)),
    ];
    const academies = await Promise.all(academyIds.map((id) => this.academyRepo.findById(id)));
    const academyMap = new Map<string, string>();
    for (const a of academies) {
      if (a) academyMap.set(a.id.toString(), a.academyName);
    }

    return ok({
      items: result.items.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        emailNormalized: r.emailNormalized,
        phoneE164: r.phoneE164,
        role: r.role,
        status: r.status,
        academyId: r.academyId,
        academyName: r.academyId ? academyMap.get(r.academyId) ?? null : null,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: result.meta,
    });
  }
}
