import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { TransactionLogRepository } from '@domain/fee/ports/transaction-log.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import type { PaymentRequest } from '@domain/fee/entities/payment-request.entity';
import type { ClockPort } from '../../common/clock.port';
import type { TransactionPort } from '../../common/transaction.port';
import { TransactionLog } from '@domain/fee/entities/transaction-log.entity';
import { canMarkPaid } from '@domain/fee/rules/fee.rules';
import { generateReceiptNumber } from '@domain/fee/rules/payment-request.rules';
import { FeeErrors } from '../../common/errors';
import type { FeeDueDto } from '../dtos/fee-due.dto';
import { toFeeDueDto } from '../dtos/fee-due.dto';
import type { UserRole, PaymentLabel } from '@academyflo/contracts';
import { DEFAULT_RECEIPT_PREFIX, computeLateFee } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { formatLocalDate } from '../../../shared/date-utils';
import { buildLateFeeConfigFromAcademy, buildEffectiveLateFeeConfig } from '../common/late-fee';
import { ConcurrentModificationError } from '@shared/errors/concurrent-modification.error';
import type { PushNotificationService } from '../../notifications/push-notification.service';
import { buildManualPaymentAutoResolvedPush } from '../../notifications/templates/manual-payment-auto-resolved-template';
import { randomUUID } from 'crypto';

export interface MarkFeePaidInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
  monthKey: string;
  paymentLabel?: PaymentLabel;
}

export class MarkFeePaidUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly transactionLogRepo: TransactionLogRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly clock: ClockPort,
    private readonly transaction: TransactionPort,
    private readonly auditRecorder?: AuditRecorderPort,
    /**
     * Used to auto-resolve any pending PaymentRequest for the same fee when
     * the owner records the payment directly (M4 fix). Optional so legacy
     * fixtures keep working — without it the cleanup is skipped.
     */
    private readonly paymentRequestRepo?: PaymentRequestRepository,
    /**
     * Used to notify parents that their proof submission was acknowledged
     * via the direct mark-paid path. Optional; push failures never roll
     * back the mark-paid result.
     */
    private readonly pushService?: PushNotificationService,
  ) {}

  async execute(input: MarkFeePaidInput): Promise<Result<FeeDueDto, AppError>> {
    const check = canMarkPaid(input.actorRole);
    if (!check.allowed) return err(FeeErrors.markPaidNotAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());
    const academyId = user.academyId;

    const student = await this.studentRepo.findById(input.studentId);
    if (!student) return err(FeeErrors.studentNotFound(input.studentId));
    if (student.academyId !== academyId) return err(FeeErrors.studentNotInAcademy());

    const due = await this.feeDueRepo.findByAcademyStudentMonth(
      academyId,
      input.studentId,
      input.monthKey,
    );
    if (!due) return err(FeeErrors.dueNotFound(`${input.studentId}:${input.monthKey}`));

    if (due.status === 'PAID') return err(FeeErrors.alreadyPaid());

    const now = this.clock.now();

    // Generate receipt number
    const academy = await this.academyRepo.findById(academyId);
    const prefix = academy?.receiptPrefix ?? DEFAULT_RECEIPT_PREFIX;

    // Compute late fee. The helper enforces L1 (live disable kills it)
    // and M1 (snapshot locks the amount). Use IST-local date so day math
    // doesn't drift around midnight IST.
    const todayStr = formatLocalDate(now);
    let lateFeeApplied = 0;
    const liveConfig = buildLateFeeConfigFromAcademy(academy);
    const effectiveConfig = buildEffectiveLateFeeConfig(due.lateFeeConfigSnapshot, liveConfig);
    if (effectiveConfig) {
      lateFeeApplied = computeLateFee(due.dueDate, todayStr, effectiveConfig);
    }

    const paid = due.markPaid(input.actorUserId, now, input.paymentLabel, lateFeeApplied);

    // M2 fix (fee/payments audit): the PaymentRequest auto-resolve now runs
    // INSIDE the same transaction as the fee + transaction-log save. Prior
    // code committed the fee first and ran the PR cancel as a separate save
    // afterwards. If the cancel save threw a non-CMC error (network blip,
    // mongo hiccup, etc.) the request errored out AFTER the fee was
    // committed — leaving fee=PAID + orphan PENDING PR + the caller seeing
    // a 500. Atomic semantics now: either both transitions commit or
    // neither does. Side-effects (audit, push) still fire post-commit.
    let resolvedRequest: PaymentRequest | null = null;

    try {
      await this.transaction.run(async () => {
        const next = await this.transactionLogRepo.incrementReceiptCounter(academyId, prefix);
        const receiptNumber = generateReceiptNumber(prefix, next);

        // Owner-direct mark-paid records the full cash they collected: base
        // plus any late fee that applied on the date they marked it. Previously
        // this stored only `due.amount`, which under-reported revenue by the
        // late-fee amount and made TransactionLog.amount disagree with what
        // FeeDue says was paid.
        const txLog = TransactionLog.create({
          id: randomUUID(),
          academyId,
          feeDueId: due.id.toString(),
          paymentRequestId: null,
          studentId: input.studentId,
          monthKey: input.monthKey,
          amount: due.amount + lateFeeApplied,
          baseAmount: due.amount,
          lateFeeAmount: lateFeeApplied,
          source: 'OWNER_DIRECT',
          collectedByUserId: input.actorUserId,
          approvedByUserId: input.actorUserId,
          receiptNumber,
        });

        await this.feeDueRepo.save(paid);
        await this.transactionLogRepo.save(txLog);

        // M4 + M2: auto-resolve any pending PaymentRequest for this fee
        // atomically with the fee save. A pre-existing concurrent transition
        // is the only path that breaks the per-feeDue partial unique index;
        // if that fires here we still want the fee save to roll back so the
        // request and fee can't disagree. The outer catch's CMC handling
        // covers both directions (fee version clash OR PR version clash).
        if (this.paymentRequestRepo) {
          const pending = await this.paymentRequestRepo.findPendingByFeeDue(due.id.toString());
          if (pending) {
            const cancelled = pending.cancel();
            await this.paymentRequestRepo.save(cancelled);
            resolvedRequest = cancelled;
          }
        }
      });
    } catch (e) {
      // M3 fix: a version clash on FeeDue.save inside the transaction means
      // a concurrent path (approve-payment-request, Cashfree webhook, cron
      // snapshot, or another mark-paid on a second device) already mutated
      // the fee. The transaction rolled back cleanly; surface a domain-shaped
      // CONFLICT instead of letting the bare error bubble to the framework
      // and surface as a generic 'ConcurrentModification' 409.
      if (e instanceof ConcurrentModificationError) {
        return err(FeeErrors.alreadyPaid());
      }
      throw e;
    }

    // Side-effects below are intentionally non-transactional — they
    // describe a successful commit, not a state to be rolled back.

    // Audit log
    if (this.auditRecorder) {
      await this.auditRecorder.record({
        academyId,
        actorUserId: input.actorUserId,
        action: 'FEE_MARKED_PAID',
        entityType: 'FEE_DUE',
        entityId: due.id.toString(),
        context: { studentId: input.studentId, monthKey: input.monthKey },
      });
    }

    if (resolvedRequest) {
      const cancelled: PaymentRequest = resolvedRequest;
      if (this.auditRecorder) {
        await this.auditRecorder.record({
          academyId,
          actorUserId: input.actorUserId,
          action: 'PAYMENT_REQUEST_AUTO_RESOLVED',
          entityType: 'PAYMENT_REQUEST',
          entityId: cancelled.id.toString(),
          context: {
            feeDueId: due.id.toString(),
            studentId: input.studentId,
            monthKey: input.monthKey,
            source: cancelled.source,
          },
        });
      }

      // Notify parent only for PARENT-source PRs. STAFF-source requests
      // are visible to staff via the in-app queue and don't need a push.
      // The notification body intentionally avoids "rejected" framing —
      // the parent's payment WAS recorded, just through a different
      // channel.
      if (this.pushService && cancelled.source === 'PARENT') {
        try {
          const message = buildManualPaymentAutoResolvedPush({
            studentName: student.fullName,
            monthKey: cancelled.monthKey,
            academyId: cancelled.academyId,
            paymentRequestId: cancelled.id.toString(),
            studentId: cancelled.studentId,
          });
          // staffUserId stores the parent's userId for PARENT-source PRs.
          await this.pushService.sendToUsers([cancelled.staffUserId], message);
        } catch {
          // Swallow — fee paid, audit recorded, missing a push is recoverable.
        }
      }
    }

    return ok(toFeeDueDto(paid));
  }
}
