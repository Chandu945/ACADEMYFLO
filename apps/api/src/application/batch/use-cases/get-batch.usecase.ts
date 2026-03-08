import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canReadBatch } from '@domain/batch/rules/batch.rules';
import { BatchErrors } from '../../common/errors';
import type { BatchDto } from '../dtos/batch.dto';
import { toBatchDto } from '../dtos/batch.dto';
import type { UserRole } from '@playconnect/contracts';

export interface GetBatchInput {
  actorUserId: string;
  actorRole: UserRole;
  batchId: string;
}

export class GetBatchUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly batchRepo: BatchRepository,
  ) {}

  async execute(input: GetBatchInput): Promise<Result<BatchDto, AppError>> {
    const roleCheck = canReadBatch(input.actorRole);
    if (!roleCheck.allowed) {
      return err(BatchErrors.readNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(BatchErrors.academyRequired());
    }

    const batch = await this.batchRepo.findById(input.batchId);
    if (!batch) {
      return err(BatchErrors.notFound(input.batchId));
    }

    if (batch.academyId !== actor.academyId) {
      return err(BatchErrors.notInAcademy());
    }

    return ok(toBatchDto(batch));
  }
}
