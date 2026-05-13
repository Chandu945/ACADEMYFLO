import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import {
  canUpdateSettings,
  validateDefaultDueDateDay,
  validateReceiptPrefix,
  validateGracePeriodDays,
  validateLateFeeAmountInr,
  validateLateFeeRepeatIntervalDays,
} from '@domain/academy/rules/academy.rules';
import { FeeErrors, InstituteInfoErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import {
  DEFAULT_DUE_DATE_DAY,
  DEFAULT_RECEIPT_PREFIX,
  DEFAULT_LATE_FEE_ENABLED,
  DEFAULT_GRACE_PERIOD_DAYS,
  DEFAULT_LATE_FEE_AMOUNT_INR,
  DEFAULT_LATE_FEE_REPEAT_INTERVAL_DAYS,
} from '@academyflo/contracts';

export interface UpdateAcademySettingsInput {
  actorUserId: string;
  actorRole: UserRole;
  defaultDueDateDay?: number;
  receiptPrefix?: string;
  lateFeeEnabled?: boolean;
  gracePeriodDays?: number;
  lateFeeAmountInr?: number;
  lateFeeRepeatIntervalDays?: number;
}

export interface AcademySettingsDto {
  defaultDueDateDay: number;
  receiptPrefix: string;
  lateFeeEnabled: boolean;
  gracePeriodDays: number;
  lateFeeAmountInr: number;
  lateFeeRepeatIntervalDays: number;
}

export class UpdateAcademySettingsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
    /** M3 academy-onboarding fix: records ACADEMY_SETTINGS_UPDATED. */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: UpdateAcademySettingsInput): Promise<Result<AcademySettingsDto, AppError>> {
    const check = canUpdateSettings(input.actorRole);
    if (!check.allowed) return err(FeeErrors.settingsNotAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) return err(FeeErrors.academyRequired());

    if (input.defaultDueDateDay !== undefined) {
      const dayCheck = validateDefaultDueDateDay(input.defaultDueDateDay);
      if (!dayCheck.valid) return err(AppErrorClass.validation(dayCheck.reason!));
    }

    if (input.receiptPrefix !== undefined) {
      const prefixCheck = validateReceiptPrefix(input.receiptPrefix);
      if (!prefixCheck.valid) return err(AppErrorClass.validation(prefixCheck.reason!));
    }

    if (input.gracePeriodDays !== undefined) {
      const check = validateGracePeriodDays(input.gracePeriodDays);
      if (!check.valid) return err(AppErrorClass.validation(check.reason!));
    }

    if (input.lateFeeAmountInr !== undefined) {
      const check = validateLateFeeAmountInr(input.lateFeeAmountInr);
      if (!check.valid) return err(AppErrorClass.validation(check.reason!));
    }

    if (input.lateFeeRepeatIntervalDays !== undefined) {
      const check = validateLateFeeRepeatIntervalDays(input.lateFeeRepeatIntervalDays);
      if (!check.valid) return err(AppErrorClass.validation(check.reason!));
    }

    // M5 academy-onboarding fix: capture the version BEFORE mutation for
    // the CAS save, and snapshot the previous values so the audit row can
    // report a real diff. Late-fee config changes are policy-grade — a
    // silent lost-write here could revert a deliberate rate change.
    const loadedVersion = academy.audit.version;
    const previous = {
      defaultDueDateDay: academy.defaultDueDateDay,
      receiptPrefix: academy.receiptPrefix,
      lateFeeEnabled: academy.lateFeeEnabled,
      gracePeriodDays: academy.gracePeriodDays,
      lateFeeAmountInr: academy.lateFeeAmountInr,
      lateFeeRepeatIntervalDays: academy.lateFeeRepeatIntervalDays,
    };

    const updated = academy.updateSettings({
      defaultDueDateDay: input.defaultDueDateDay,
      receiptPrefix: input.receiptPrefix,
      lateFeeEnabled: input.lateFeeEnabled,
      gracePeriodDays: input.gracePeriodDays,
      lateFeeAmountInr: input.lateFeeAmountInr,
      lateFeeRepeatIntervalDays: input.lateFeeRepeatIntervalDays,
    });

    // M5: CAS write — same shape as update-institute-info. The version
    // race here is more dangerous because the affected fields drive late-
    // fee billing for every active student.
    const saved = await this.academyRepo.saveWithVersionPrecondition(updated, loadedVersion);
    if (!saved) return err(InstituteInfoErrors.concurrencyConflict());

    // M3 audit: record the change with a self-describing context. Late-fee
    // policy changes are the most forensically interesting writes in the
    // section ("when did the rate flip to ₹50/day?"), so the new values
    // are included directly rather than just a changed-fields list.
    if (this.auditRecorder) {
      await this.auditRecorder
        .record({
          academyId: user.academyId,
          actorUserId: input.actorUserId,
          action: 'ACADEMY_SETTINGS_UPDATED',
          entityType: 'ACADEMY',
          entityId: user.academyId,
          context: {
            defaultDueDateDay: String(updated.defaultDueDateDay ?? DEFAULT_DUE_DATE_DAY),
            receiptPrefix: updated.receiptPrefix ?? DEFAULT_RECEIPT_PREFIX,
            lateFeeEnabled: String(updated.lateFeeEnabled ?? DEFAULT_LATE_FEE_ENABLED),
            gracePeriodDays: String(updated.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS),
            lateFeeAmountInr: String(updated.lateFeeAmountInr ?? DEFAULT_LATE_FEE_AMOUNT_INR),
            lateFeeRepeatIntervalDays: String(
              updated.lateFeeRepeatIntervalDays ?? DEFAULT_LATE_FEE_REPEAT_INTERVAL_DAYS,
            ),
            previousLateFeeAmountInr: String(
              previous.lateFeeAmountInr ?? DEFAULT_LATE_FEE_AMOUNT_INR,
            ),
            previousLateFeeEnabled: String(previous.lateFeeEnabled ?? DEFAULT_LATE_FEE_ENABLED),
          },
        })
        .catch(() => {});
    }

    return ok({
      defaultDueDateDay: updated.defaultDueDateDay ?? DEFAULT_DUE_DATE_DAY,
      receiptPrefix: updated.receiptPrefix ?? DEFAULT_RECEIPT_PREFIX,
      lateFeeEnabled: updated.lateFeeEnabled ?? DEFAULT_LATE_FEE_ENABLED,
      gracePeriodDays: updated.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS,
      lateFeeAmountInr: updated.lateFeeAmountInr ?? DEFAULT_LATE_FEE_AMOUNT_INR,
      lateFeeRepeatIntervalDays:
        updated.lateFeeRepeatIntervalDays ?? DEFAULT_LATE_FEE_REPEAT_INTERVAL_DAYS,
    });
  }
}
