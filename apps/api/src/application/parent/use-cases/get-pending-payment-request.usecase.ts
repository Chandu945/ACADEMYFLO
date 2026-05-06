import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import type { UserRole } from '@academyflo/contracts';

export interface GetPendingPaymentRequestInput {
  actorUserId: string;
  actorRole: UserRole;
  feeDueId: string;
}

/** Lightweight "is anyone already paying for this?" check. Returned to the
 *  parent's payment screen as a pre-flight check so a parent doesn't waste
 *  time uploading a UPI screenshot for a fee a staff member has already
 *  recorded a cash collection for.
 *
 *  This is intentionally a flat shape (no DTO sharing with the staff/owner
 *  payment-request DTOs) — the parent only needs the bare facts: who, when,
 *  how much, what method. The staff name is fetched once here so the mobile
 *  client doesn't need a follow-up request to render "Recorded by Rahul". */
export interface PendingPaymentRequestForParentDto {
  id: string;
  source: 'STAFF' | 'PARENT';
  amount: number;
  /** ISO timestamp. */
  submittedAt: string;
  /** Display name to show the parent. For staff requests this is the staff's
   *  full name; for parent requests it's "You". Avoids leaking other parents'
   *  identities (none of those should ever appear here, but defence in depth). */
  submittedBy: string;
  paymentMethod: 'CASH' | 'UPI' | 'BANK' | 'OTHER' | null;
  proofImageUrl: string | null;
}

export interface GetPendingPaymentRequestOutput {
  pending: PendingPaymentRequestForParentDto | null;
}

export class GetPendingPaymentRequestUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly paymentRequestRepo: PaymentRequestRepository,
  ) {}

  async execute(
    input: GetPendingPaymentRequestInput,
  ): Promise<Result<GetPendingPaymentRequestOutput, AppError>> {
    if (input.actorRole !== 'PARENT') {
      return err(AppError.forbidden('Only parents can read pending requests from this endpoint'));
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) {
      return err(AppError.forbidden('Account not configured'));
    }

    const due = await this.feeDueRepo.findById(input.feeDueId);
    if (!due) {
      // Treat a missing fee as "nothing pending" — the parent's UI just falls
      // through to the regular payment screen, which will surface its own
      // 404 / not-found state on the next API call.
      return ok({ pending: null });
    }

    if (due.academyId !== user.academyId) {
      return err(AppError.forbidden('Fee does not belong to your academy'));
    }

    // Verify parent owns this student. Without this a parent could probe any
    // fee in their academy by its id.
    const link = await this.linkRepo.findByParentAndStudent(input.actorUserId, due.studentId);
    if (!link) {
      return err(AppError.forbidden('You are not linked to this student'));
    }

    const pending = await this.paymentRequestRepo.findPendingByFeeDue(input.feeDueId);
    if (!pending) {
      return ok({ pending: null });
    }

    let submittedBy = 'Academy';
    if (pending.source === 'PARENT') {
      submittedBy = pending.staffUserId === input.actorUserId ? 'You' : 'Family member';
    } else {
      const author = await this.userRepo.findById(pending.staffUserId);
      submittedBy = author?.fullName ?? 'Academy staff';
    }

    return ok({
      pending: {
        id: pending.id.toString(),
        source: pending.source,
        amount: pending.amount,
        submittedAt: pending.audit.createdAt.toISOString(),
        submittedBy,
        paymentMethod: pending.paymentMethod,
        proofImageUrl: pending.proofImageUrl,
      },
    });
  }
}
