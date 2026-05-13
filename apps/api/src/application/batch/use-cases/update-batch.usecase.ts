import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { Batch } from '@domain/batch/entities/batch.entity';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import {
  canManageBatch,
  validateBatchName,
  validateDays,
  validateNotes,
  validateTime,
  validateTimeRange,
  validateMaxStudents,
} from '@domain/batch/rules/batch.rules';
import { BatchErrors } from '../../common/errors';
import type { BatchDto } from '../dtos/batch.dto';
import { toBatchDto } from '../dtos/batch.dto';
import { requireBatchInAcademy } from '../common/require-batch';
import type { Weekday, UserRole } from '@academyflo/contracts';
import { AppError as AppErrorClass } from '@shared/kernel';

import type { BatchStatus } from '@domain/batch/entities/batch.entity';

export interface UpdateBatchInput {
  actorUserId: string;
  actorRole: UserRole;
  batchId: string;
  batchName?: string;
  days?: Weekday[];
  notes?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  maxStudents?: number | null;
  status?: BatchStatus;
}

export class UpdateBatchUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly batchRepo: BatchRepository,
    /**
     * Used to count current students when owner reduces maxStudents
     * (M8 fix). Optional.
     */
    private readonly studentBatchRepo?: StudentBatchRepository,
    /**
     * Used to record BATCH_UPDATED audit (M1 fix). Optional.
     */
    private readonly auditRecorder?: AuditRecorderPort,
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

    const batchResult = await requireBatchInAcademy(this.batchRepo, input.batchId, actor.academyId);
    if (!batchResult.ok) return err(batchResult.error);
    const batch = batchResult.value;

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

    const newStartTime = input.startTime !== undefined ? input.startTime : batch.startTime;
    const newEndTime = input.endTime !== undefined ? input.endTime : batch.endTime;

    if (newStartTime) {
      const startCheck = validateTime(newStartTime);
      if (!startCheck.valid) {
        return err(AppErrorClass.validation(startCheck.reason!));
      }
    }

    if (newEndTime) {
      const endCheck = validateTime(newEndTime);
      if (!endCheck.valid) {
        return err(AppErrorClass.validation(endCheck.reason!));
      }
    }

    // endTime without startTime is invalid; startTime alone is allowed.
    if (newEndTime && !newStartTime) {
      return err(AppErrorClass.validation('startTime is required when endTime is provided'));
    }
    if (newStartTime && newEndTime) {
      const rangeCheck = validateTimeRange(newStartTime, newEndTime);
      if (!rangeCheck.valid) {
        return err(AppErrorClass.validation(rangeCheck.reason!));
      }
    }

    const newMaxStudents = input.maxStudents !== undefined ? input.maxStudents : batch.maxStudents;
    if (newMaxStudents !== null) {
      const maxCheck = validateMaxStudents(newMaxStudents);
      if (!maxCheck.valid) {
        return err(AppErrorClass.validation(maxCheck.reason!));
      }
    }

    // M8 fix: when owner reduces maxStudents below the current enrolled
    // count, reject with a clear error. Prior behavior silently accepted
    // the reduction, leaving the batch in an inconsistent "over capacity"
    // state where existing students stay but new adds fail. Owner needs
    // to remove students first or pick a higher cap.
    if (newMaxStudents !== null && newMaxStudents !== batch.maxStudents && this.studentBatchRepo) {
      const currentCount = await this.studentBatchRepo.countByBatchId(input.batchId);
      if (currentCount > newMaxStudents) {
        return err(
          AppErrorClass.validation(
            `Cannot reduce capacity to ${newMaxStudents}: batch currently has ${currentCount} students. Remove students first or pick a higher cap.`,
          ),
        );
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
      startTime: newStartTime,
      endTime: newEndTime,
      maxStudents: newMaxStudents,
      status: newStatus,
      audit: updateAuditFields(batch.audit),
    });

    // M2 fix: diff the original vs merged update so the audit log records
    // WHICH fields changed (not just "something changed"). No-op skip if
    // nothing actually changed — matches update-student / update-event /
    // update-enquiry / update-staff pattern.
    const changedFields = diffChangedBatchFields(batch, updated);
    if (changedFields.length === 0) {
      return ok(toBatchDto(batch));
    }

    // M3 fix: catch E11000 from the unique partial index when a concurrent
    // edit racing past our findByAcademyAndName check would collide.
    try {
      await this.batchRepo.save(updated);
    } catch (error) {
      const err11000 = error as { code?: number; keyPattern?: Record<string, unknown> };
      if (err11000?.code === 11000) {
        return err(BatchErrors.nameAlreadyExists());
      }
      throw error;
    }

    // M1 fix: record BATCH_UPDATED with the diff so owners can answer
    // "who changed this batch's schedule and what did they change".
    if (this.auditRecorder) {
      await this.auditRecorder.record({
        academyId: actor.academyId,
        actorUserId: input.actorUserId,
        action: 'BATCH_UPDATED',
        entityType: 'BATCH',
        entityId: input.batchId,
        context: {
          batchName: batch.batchName,
          changedFields: changedFields.join(','),
        },
      });
    }

    return ok(toBatchDto(updated));
  }
}

/**
 * M2 helper: returns the list of fields that differ between the original
 * batch and the merged update. Used to drive the diff-based audit + no-op
 * skip. Days are compared sorted (order-insensitive) since the entity
 * dedups them via `new Set`.
 */
function diffChangedBatchFields(oldB: Batch, newB: Batch): string[] {
  const changed: string[] = [];
  if (oldB.batchName !== newB.batchName) changed.push('batchName');
  const oldDays = [...oldB.days].sort();
  const newDays = [...newB.days].sort();
  if (oldDays.length !== newDays.length || oldDays.some((d, i) => d !== newDays[i])) {
    changed.push('days');
  }
  if ((oldB.notes ?? null) !== (newB.notes ?? null)) changed.push('notes');
  if ((oldB.startTime ?? null) !== (newB.startTime ?? null)) changed.push('startTime');
  if ((oldB.endTime ?? null) !== (newB.endTime ?? null)) changed.push('endTime');
  if ((oldB.maxStudents ?? null) !== (newB.maxStudents ?? null)) changed.push('maxStudents');
  if (oldB.status !== newB.status) changed.push('status');
  return changed;
}
