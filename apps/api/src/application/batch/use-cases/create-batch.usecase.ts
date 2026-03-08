import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
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
import { randomUUID } from 'crypto';

export interface CreateBatchInput {
  actorUserId: string;
  actorRole: UserRole;
  batchName: string;
  days?: Weekday[];
  notes?: string | null;
}

export class CreateBatchUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly batchRepo: BatchRepository,
  ) {}

  async execute(input: CreateBatchInput): Promise<Result<BatchDto, AppError>> {
    const roleCheck = canManageBatch(input.actorRole);
    if (!roleCheck.allowed) {
      return err(BatchErrors.notAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(BatchErrors.academyRequired());
    }

    const nameCheck = validateBatchName(input.batchName);
    if (!nameCheck.valid) {
      return err(AppErrorClass.validation(nameCheck.reason!));
    }

    if (input.days && input.days.length > 0) {
      const daysCheck = validateDays(input.days);
      if (!daysCheck.valid) {
        return err(AppErrorClass.validation(daysCheck.reason!));
      }
    }

    if (input.notes) {
      const notesCheck = validateNotes(input.notes);
      if (!notesCheck.valid) {
        return err(AppErrorClass.validation(notesCheck.reason!));
      }
    }

    const normalized = input.batchName.trim().toLowerCase();
    const existing = await this.batchRepo.findByAcademyAndName(actor.academyId, normalized);
    if (existing) {
      return err(BatchErrors.nameAlreadyExists());
    }

    const batch = Batch.create({
      id: randomUUID(),
      academyId: actor.academyId,
      batchName: input.batchName,
      days: input.days,
      notes: input.notes,
    });

    await this.batchRepo.save(batch);

    return ok(toBatchDto(batch));
  }
}
