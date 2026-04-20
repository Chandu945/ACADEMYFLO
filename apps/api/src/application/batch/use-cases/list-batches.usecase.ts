import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import { canReadBatch } from '@domain/batch/rules/batch.rules';
import { BatchErrors } from '../../common/errors';
import type { BatchDto } from '../dtos/batch.dto';
import { toBatchDto } from '../dtos/batch.dto';
import type { UserRole } from '@academyflo/contracts';

export interface ListBatchesInput {
  actorUserId: string;
  actorRole: UserRole;
  page: number;
  pageSize: number;
  search?: string;
}

export interface BatchListItemDto extends BatchDto {
  studentCount: number;
}

export interface ListBatchesOutput {
  data: BatchListItemDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export class ListBatchesUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly batchRepo: BatchRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
  ) {}

  async execute(input: ListBatchesInput): Promise<Result<ListBatchesOutput, AppError>> {
    const roleCheck = canReadBatch(input.actorRole);
    if (!roleCheck.allowed) {
      return err(BatchErrors.readNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(BatchErrors.academyRequired());
    }

    const { batches, total } = await this.batchRepo.listByAcademy(
      actor.academyId,
      input.page,
      input.pageSize,
      input.search,
    );

    // Single aggregation for all batch counts on the page (was N per-batch round-trips).
    const batchIds = batches.map((b) => b.id.toString());
    const countByBatch = await this.studentBatchRepo.countByBatchIds(batchIds);
    const data: BatchListItemDto[] = batches.map((batch) => ({
      ...toBatchDto(batch),
      studentCount: countByBatch.get(batch.id.toString()) ?? 0,
    }));

    return ok({
      data,
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / input.pageSize),
      },
    });
  }
}
