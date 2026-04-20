import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { ClockPort } from '../../common/clock.port';
import type { TransactionPort } from '../../common/transaction.port';
import {
  canReviewPaymentRequest,
  validateRejectionReason,
} from '@domain/fee/rules/payment-request.rules';
import { PaymentRequestErrors } from '../../common/errors';
import type { PaymentRequestDto } from '../dtos/payment-request.dto';
import { toPaymentRequestDto } from '../dtos/payment-request.dto';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface RejectPaymentRequestInput {
  actorUserId: string;
  actorRole: UserRole;
  requestId: string;
  reason: string;
}

export class RejectPaymentRequestUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly paymentRequestRepo: PaymentRequestRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly clock: ClockPort,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly transaction: TransactionPort,
  ) {}

  async execute(input: RejectPaymentRequestInput): Promise<Result<PaymentRequestDto, AppError>> {
    const check = canReviewPaymentRequest(input.actorRole);
    if (!check.allowed) return err(PaymentRequestErrors.reviewNotAllowed());

    if (!input.reason || !input.reason.trim()) {
      return err(PaymentRequestErrors.rejectionReasonRequired());
    }

    const reasonCheck = validateRejectionReason(input.reason);
    if (!reasonCheck.valid) {
      return err(PaymentRequestErrors.rejectionReasonRequired());
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(PaymentRequestErrors.academyRequired());

    const request = await this.paymentRequestRepo.findById(input.requestId);
    if (!request) return err(PaymentRequestErrors.requestNotFound(input.requestId));
    if (request.academyId !== user.academyId)
      return err(PaymentRequestErrors.requestNotInAcademy());
    if (request.status !== 'PENDING') return err(PaymentRequestErrors.notPending());

    const now = this.clock.now();
    const rejected = request.reject(input.actorUserId, now, input.reason.trim());
    const academyId = user.academyId;

    // Revert the fee due status back to DUE in the same transaction as the
    // rejected-request save so concurrent rejects can't leave an orphaned
    // AWAITING fee due (or double-revert it).
    await this.transaction.run(async () => {
      await this.paymentRequestRepo.save(rejected);

      const feeDue = await this.feeDueRepo.findByAcademyStudentMonth(
        academyId,
        request.studentId,
        request.monthKey,
      );
      if (feeDue && feeDue.status !== 'PAID') {
        const reverted = feeDue.revertToDue();
        await this.feeDueRepo.save(reverted);
      }
    });

    // Audit is recorded outside the transaction per codebase convention for
    // reject/others (fail-the-action semantics apply to the main save only).
    await this.auditRecorder.record({
      academyId: user.academyId,
      actorUserId: input.actorUserId,
      action: 'PAYMENT_REQUEST_REJECTED',
      entityType: 'PAYMENT_REQUEST',
      entityId: input.requestId,
      context: { paymentRequestId: input.requestId },
    });

    // Resolve names for response
    const [staffUser, student] = await Promise.all([
      this.userRepo.findById(rejected.staffUserId),
      this.studentRepo.findById(rejected.studentId),
    ]);

    return ok(toPaymentRequestDto(rejected, {
      staffName: staffUser?.fullName,
      studentName: student?.fullName,
      reviewedByName: user.fullName,
    }));
  }
}
