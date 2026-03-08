import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { Batch } from '@domain/batch/entities/batch.entity';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import {
  canManageBatch,
  validateBatchName,
  validateDays,
  validateNotes,
} from '@domain/batch/rules/batch.rules';
import { BatchErrors } from '../../common/errors';
import type { BatchDto } from '../dtos/batch.dto';
import { toBatchDto } from '../dtos/batch.dto';
import type { Weekday, UserRole } from '@playconnect/contracts';
import { AppError as AppErrorClass } from '@shared/kernel';

import type { BatchStatus } from '@domain/batch/entities/batch.entity';

export interface UpdateBatchInput {
  actorUserId: string;
  actorRole: UserRole;
  batchId: string;
  batchName?: string;
  days?: Weekday[];
  notes?: string | null;
  status?: BatchStatus;
}

export class UpdateBatchUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly batchRepo: BatchRepository,
  ) {}

  async execute(input: UpdateBatchInput): Promise<Result<BatchDto, AppError>> {
    const roleCheck = canManageBatch(input.actorRole);
    if (!roleCheck.allowed) {
      return err(BatchErrors.notAllowed());
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

    if (input.batchName !== undefined) {
      const nameCheck = validateBatchName(input.batchName);
      if (!nameCheck.valid) {
        return err(AppErrorClass.validation(nameCheck.reason!));
      }
    }

    if (input.days !== undefined && input.days.length > 0) {
      const daysCheck = validateDays(input.days);
      if (!daysCheck.valid) {
        return err(AppErrorClass.validation(daysCheck.reason!));
      }
    }

    if (input.notes !== undefined && input.notes !== null) {
      const notesCheck = validateNotes(input.notes);
      if (!notesCheck.valid) {
        return err(AppErrorClass.validation(notesCheck.reason!));
      }
    }

    // Check name uniqueness if name changed
    const newName = input.batchName ?? batch.batchName;
    const newNormalized = newName.trim().toLowerCase();
    if (newNormalized !== batch.batchNameNormalized) {
      const existing = await this.batchRepo.findByAcademyAndName(actor.academyId, newNormalized);
      if (existing) {
        return err(BatchErrors.nameAlreadyExists());
      }
    }

    const newDays = input.days ?? batch.days;
    const newNotes = input.notes !== undefined ? input.notes : batch.notes;

    const newStatus = input.status ?? batch.status;

    const updated = Batch.reconstitute(input.batchId, {
      academyId: batch.academyId,
      batchName: newName.trim(),
      batchNameNormalized: newNormalized,
      days: [...new Set(newDays)],
      notes: newNotes,
      profilePhotoUrl: batch.profilePhotoUrl,
      status: newStatus,
      audit: updateAuditFields(batch.audit),
    });

    await this.batchRepo.save(updated);

    return ok(toBatchDto(updated));
  }
}
