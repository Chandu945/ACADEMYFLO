import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import { PaymentRequest } from '@domain/fee/entities/payment-request.entity';
import {
  canCreatePaymentRequest,
  validateStaffNotes,
} from '@domain/fee/rules/payment-request.rules';
import { PaymentRequestErrors } from '../../common/errors';
import type { PaymentRequestDto } from '../dtos/payment-request.dto';
import { toPaymentRequestDto } from '../dtos/payment-request.dto';
import type { UserRole } from '@academyflo/contracts';
import { computeLateFee } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { ClockPort } from '../../common/clock.port';
import type { PushNotificationService } from '../../notifications/push-notification.service';
import { buildPaymentRequestPendingPush } from '../../notifications/templates/payment-request-pending-template';
import { formatLocalDate } from '../../../shared/date-utils';
import { buildLateFeeConfigFromAcademy, buildEffectiveLateFeeConfig } from '../common/late-fee';
import { randomUUID } from 'crypto';

export interface CreatePaymentRequestInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
  monthKey: string;
  staffNotes: string;
}

export class CreatePaymentRequestUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly paymentRequestRepo: PaymentRequestRepository,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly clock: ClockPort,
    /**
     * Optional so legacy fixtures keep working. Production wiring always
     * passes the push service; absence is treated as "no notification" —
     * the request is still created and the audit log is written.
     */
    private readonly pushService?: PushNotificationService,
  ) {}

  async execute(input: CreatePaymentRequestInput): Promise<Result<PaymentRequestDto, AppError>> {
    const check = canCreatePaymentRequest(input.actorRole);
    if (!check.allowed) return err(PaymentRequestErrors.createNotAllowed());

    const notesCheck = validateStaffNotes(input.staffNotes);
    if (!notesCheck.valid) return err(PaymentRequestErrors.invalidNotes(notesCheck.reason!));

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(PaymentRequestErrors.academyRequired());

    const student = await this.studentRepo.findById(input.studentId);
    if (!student) return err(PaymentRequestErrors.studentNotFound(input.studentId));
    if (student.academyId !== user.academyId)
      return err(PaymentRequestErrors.studentNotInAcademy());

    const due = await this.feeDueRepo.findByAcademyStudentMonth(
      user.academyId,
      input.studentId,
      input.monthKey,
    );
    if (!due) return err(PaymentRequestErrors.dueNotFound(`${input.studentId}:${input.monthKey}`));
    if (due.status === 'PAID') return err(PaymentRequestErrors.alreadyPaid());

    const existingPending = await this.paymentRequestRepo.findPendingByFeeDue(due.id.toString());
    if (existingPending) return err(PaymentRequestErrors.duplicatePending());

    // Staff cash collection records the full amount the parent handed over —
    // base + current late fee. Previously this captured only `due.amount`,
    // leaving the late fee uncollected even though the parent had paid it.
    // Computed dynamically from the same config the parent's screen uses, so
    // staff and parent see the same total.
    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) return err(PaymentRequestErrors.academyRequired());
    const liveConfig = buildLateFeeConfigFromAcademy(academy);
    const effectiveConfig = buildEffectiveLateFeeConfig(due.lateFeeConfigSnapshot, liveConfig);
    let lateFee = 0;
    if (effectiveConfig) {
      const todayStr = formatLocalDate(this.clock.now());
      const computed = computeLateFee(due.dueDate, todayStr, effectiveConfig);
      if (Number.isFinite(computed)) lateFee = computed;
    }
    const totalPayable = due.amount + lateFee;

    const pr = PaymentRequest.create({
      id: randomUUID(),
      academyId: user.academyId,
      studentId: input.studentId,
      feeDueId: due.id.toString(),
      monthKey: input.monthKey,
      amount: totalPayable,
      staffUserId: input.actorUserId,
      staffNotes: input.staffNotes.trim(),
    });

    try {
      await this.paymentRequestRepo.save(pr);
    } catch (e) {
      if ((e as { code?: number })?.code === 11000) {
        return err(PaymentRequestErrors.duplicatePending());
      }
      throw e;
    }

    await this.auditRecorder.record({
      academyId: user.academyId,
      actorUserId: input.actorUserId,
      action: 'PAYMENT_REQUEST_CREATED',
      entityType: 'PAYMENT_REQUEST',
      entityId: pr.id.toString(),
      context: {
        studentId: input.studentId,
        monthKey: input.monthKey,
        amount: String(totalPayable),
      },
    });

    // Notify the academy's owners that a request is awaiting their approval.
    // Best-effort — a push outage must not fail the request creation, since
    // the request is already durable and visible in the approval queue.
    if (this.pushService) {
      try {
        const { users: owners } = await this.userRepo.listByAcademyAndRole(
          user.academyId,
          'OWNER',
          1,
          100,
        );
        const ownerIds = owners.map((o) => o.id.toString());
        if (ownerIds.length > 0) {
          const message = buildPaymentRequestPendingPush({
            staffName: user.fullName,
            studentName: student.fullName,
            monthKey: input.monthKey,
            amount: totalPayable,
            academyId: user.academyId,
            paymentRequestId: pr.id.toString(),
            studentId: input.studentId,
          });
          await this.pushService.sendToUsers(ownerIds, message);
        }
      } catch {
        // Swallow — the request is created and audit-logged. The push
        // service logs internally; missing a notification is recoverable
        // (owner sees the queue next time they open the app).
      }
    }

    return ok(
      toPaymentRequestDto(pr, {
        staffName: user.fullName,
        studentName: student.fullName,
      }),
    );
  }
}
