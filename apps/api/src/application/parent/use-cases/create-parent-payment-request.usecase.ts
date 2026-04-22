import { randomUUID } from 'crypto';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import {
  PaymentRequest,
  type ParentPaymentMethod,
} from '@domain/fee/entities/payment-request.entity';
import { PaymentRequestErrors } from '../../common/errors';
import {
  toPaymentRequestDto,
  type PaymentRequestDto,
} from '../../fee/dtos/payment-request.dto';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface CreateParentPaymentRequestInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
  feeDueId: string;
  amount: number;
  paymentMethod: ParentPaymentMethod;
  proofImageUrl: string;
  paymentRefNumber?: string | null;
  parentNote?: string | null;
}

const MAX_NOTE_LEN = 500;
const MAX_REF_LEN = 50;
/** Anti-spam cap: a parent may have at most N active (PENDING) requests
 *  across the last 24h. Blocks a parent from flooding the owner's review
 *  queue with near-identical submissions. */
const MAX_PENDING_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export class CreateParentPaymentRequestUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly paymentRequestRepo: PaymentRequestRepository,
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(
    input: CreateParentPaymentRequestInput,
  ): Promise<Result<PaymentRequestDto, AppError>> {
    // Role gate — controller also enforces this but defending the use-case
    // makes it safe from other callers.
    if (input.actorRole !== 'PARENT') {
      return err(AppError.forbidden('Only parents can submit payment requests from this endpoint'));
    }

    // Basic field shape
    if (!input.proofImageUrl || input.proofImageUrl.trim().length === 0) {
      return err(AppError.validation('Payment proof image is required'));
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return err(AppError.validation('Amount must be greater than zero'));
    }
    if (input.paymentMethod === 'UPI' && (!input.paymentRefNumber || !input.paymentRefNumber.trim())) {
      return err(AppError.validation('UPI reference / transaction number is required'));
    }
    if (input.paymentRefNumber && input.paymentRefNumber.length > MAX_REF_LEN) {
      return err(AppError.validation(`Reference number cannot exceed ${MAX_REF_LEN} characters`));
    }
    if (input.parentNote && input.parentNote.length > MAX_NOTE_LEN) {
      return err(AppError.validation(`Note cannot exceed ${MAX_NOTE_LEN} characters`));
    }

    // Parent / academy
    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) {
      return err(PaymentRequestErrors.academyRequired());
    }

    // Parent -> student link. This is the critical permission check: prevents
    // a parent from submitting a request against a student they don't own.
    const link = await this.linkRepo.findByParentAndStudent(input.actorUserId, input.studentId);
    if (!link) {
      return err(AppError.forbidden('You are not linked to this student'));
    }

    // Student must exist in the parent's academy.
    const student = await this.studentRepo.findById(input.studentId);
    if (!student) return err(PaymentRequestErrors.studentNotFound(input.studentId));
    if (student.academyId !== user.academyId) {
      return err(PaymentRequestErrors.studentNotInAcademy());
    }

    // Academy must have manual payments enabled before a parent can submit.
    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) return err(PaymentRequestErrors.academyRequired());
    if (!academy.instituteInfo.manualPaymentsEnabled) {
      return err(AppError.forbidden('This academy is not accepting manual payments right now'));
    }

    // FeeDue must exist, belong to the student, and not already be paid.
    const due = await this.feeDueRepo.findById(input.feeDueId);
    if (!due) return err(PaymentRequestErrors.dueNotFound(input.feeDueId));
    if (due.academyId !== user.academyId || due.studentId !== input.studentId) {
      return err(AppError.forbidden('Fee does not belong to this student'));
    }
    if (due.status === 'PAID') return err(PaymentRequestErrors.alreadyPaid());

    // Amount sanity — must not exceed base + late fee.
    const maxPayable = due.amount + (due.lateFeeApplied ?? 0);
    if (input.amount > maxPayable) {
      return err(AppError.validation(`Amount cannot exceed the payable amount of \u20B9${maxPayable}`));
    }

    // Don't allow stacking requests for the same fee.
    const existingPending = await this.paymentRequestRepo.findPendingByFeeDue(due.id.toString());
    if (existingPending) return err(PaymentRequestErrors.duplicatePending());

    // Rate limit — cap concurrent PENDING parent requests in a rolling 24h
    // window. Uses listByStaffAndAcademy (staffUserId stores the parent's
    // userId for PARENT-sourced requests), filtered in memory; the per-parent
    // record count is always tiny so a dedicated index/count is overkill.
    const recent = await this.paymentRequestRepo.listByStaffAndAcademy(
      input.actorUserId,
      user.academyId,
    );
    const cutoff = Date.now() - DAY_MS;
    const recentPending = recent.filter(
      (pr) => pr.status === 'PENDING' && pr.audit.createdAt.getTime() >= cutoff,
    );
    if (recentPending.length >= MAX_PENDING_PER_DAY) {
      return err(
        AppError.validation(
          `You already have ${recentPending.length} pending payment requests. Please wait for the owner to review them before submitting another.`,
        ),
      );
    }

    const pr = PaymentRequest.create({
      id: randomUUID(),
      academyId: user.academyId,
      studentId: input.studentId,
      feeDueId: due.id.toString(),
      monthKey: due.monthKey,
      amount: input.amount,
      staffUserId: input.actorUserId, // author — parent in this case
      staffNotes: (input.parentNote ?? '').trim(),
      source: 'PARENT',
      paymentMethod: input.paymentMethod,
      proofImageUrl: input.proofImageUrl.trim(),
      paymentRefNumber: input.paymentRefNumber?.trim() || null,
    });

    await this.paymentRequestRepo.save(pr);

    await this.auditRecorder.record({
      academyId: user.academyId,
      actorUserId: input.actorUserId,
      action: 'PAYMENT_REQUEST_CREATED',
      entityType: 'PAYMENT_REQUEST',
      entityId: pr.id.toString(),
      context: {
        source: 'PARENT',
        studentId: input.studentId,
        monthKey: due.monthKey,
        amount: String(input.amount),
        paymentMethod: input.paymentMethod,
      },
    });

    return ok(
      toPaymentRequestDto(pr, {
        staffName: user.fullName,
        studentName: student.fullName,
      }),
    );
  }
}
