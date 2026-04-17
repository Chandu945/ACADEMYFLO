import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { Student } from '@domain/student/entities/student.entity';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canChangeStudentStatus } from '@domain/student/rules/student.rules';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderStudentStatusChangedEmail } from '../../notifications/templates/student-status-changed-template';
import { StudentErrors } from '../../common/errors';
import type { StudentDto } from '../dtos/student.dto';
import { toStudentDto } from '../dtos/student.dto';

export interface ChangeStudentStatusOutput {
  student: StudentDto;
  deletedUpcomingDuesCount: number;
}
import type { StudentStatus, UserRole } from '@playconnect/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { TransactionPort } from '../../common/transaction.port';

export interface ChangeStudentStatusInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
  status: StudentStatus;
  reason?: string;
}

export class ChangeStudentStatusUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly feeDueRepo?: FeeDueRepository,
    private readonly transaction?: TransactionPort,
    private readonly emailSender?: EmailSenderPort,
    private readonly academyRepo?: AcademyRepository,
  ) {}

  async execute(input: ChangeStudentStatusInput): Promise<Result<ChangeStudentStatusOutput, AppError>> {
    const roleCheck = canChangeStudentStatus(input.actorRole);
    if (!roleCheck.allowed) {
      return err(StudentErrors.statusChangeNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(StudentErrors.academyRequired());
    }

    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) {
      return err(StudentErrors.notFound(input.studentId));
    }

    if (student.academyId !== actor.academyId) {
      return err(StudentErrors.notInAcademy());
    }

    if (input.status === student.status) {
      return ok({ student: toStudentDto(student), deletedUpcomingDuesCount: 0 });
    }

    const loadedVersion = student.audit.version;

    const academyId = actor.academyId;

    const now = new Date();
    const historyEntry = {
      fromStatus: student.status,
      toStatus: input.status,
      changedBy: input.actorUserId,
      changedAt: now,
      reason: input.reason?.trim().slice(0, 500) ?? null,
    };

    const updated = Student.reconstitute(input.studentId, {
      academyId: student.academyId,
      fullName: student.fullName,
      fullNameNormalized: student.fullNameNormalized,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      address: student.address,
      guardian: student.guardian,
      joiningDate: student.joiningDate,
      monthlyFee: student.monthlyFee,
      mobileNumber: student.mobileNumber,
      email: student.email,
      profilePhotoUrl: student.profilePhotoUrl,
      fatherName: student.fatherName,
      motherName: student.motherName,
      whatsappNumber: student.whatsappNumber,
      addressText: student.addressText,
      status: input.status,
      statusChangedAt: now,
      statusChangedBy: input.actorUserId,
      statusHistory: [...student.statusHistory, historyEntry],
      audit: updateAuditFields(student.audit),
      softDelete: student.softDelete,
    });

    const needsFeeCleanup =
      (input.status === 'INACTIVE' || input.status === 'LEFT') && this.feeDueRepo;

    // SAFETY: If fee cleanup is needed, a transaction is required to keep
    // student status and fee-due deletion atomic. Without a transaction,
    // a failure after save but before delete (or vice-versa) leaves data inconsistent.
    if (needsFeeCleanup && !this.transaction) {
      console.warn(
        `[ChangeStudentStatusUseCase] Transaction is missing but fee cleanup is needed for student ${input.studentId}. ` +
        `This risks partial updates — ensure TransactionPort is injected.`,
      );
    }

    let conflicted = false;
    let deletedDues = 0;
    const saveOps = async () => {
      const saved = await this.studentRepo.saveWithVersionPrecondition(updated, loadedVersion);
      if (!saved) {
        conflicted = true;
        return;
      }

      if (needsFeeCleanup) {
        deletedDues = await this.feeDueRepo!.deleteUpcomingByStudent(academyId, input.studentId);
      }
    };

    if (this.transaction) {
      await this.transaction.run(saveOps);
    } else {
      await saveOps();
    }

    if (conflicted) return err(StudentErrors.concurrencyConflict());

    await this.auditRecorder.record({
      academyId,
      actorUserId: input.actorUserId,
      action: 'STUDENT_STATUS_CHANGED',
      entityType: 'STUDENT',
      entityId: input.studentId,
      context: {
        fromStatus: student.status,
        newStatus: input.status,
        deletedUpcomingDuesCount: String(deletedDues),
        ...(input.reason ? { reason: input.reason } : {}),
      },
    });

    // Fire-and-forget: notify parent/guardian about student status change
    if (this.emailSender && this.academyRepo) {
      const parentEmail = student.guardian?.email || student.email;
      if (parentEmail) {
        const academy = await this.academyRepo.findById(actor.academyId ?? '');
        this.emailSender.send({
          to: parentEmail,
          subject: `Student Status Update - ${student.fullName}`,
          html: renderStudentStatusChangedEmail({
            parentName: student.guardian?.name ?? 'Parent/Guardian',
            studentName: student.fullName,
            academyName: academy?.academyName ?? 'Your Academy',
            newStatus: input.status,
            reason: input.reason ?? null,
          }),
        }).catch(() => {});
      }
    }

    return ok({ student: toStudentDto(updated), deletedUpcomingDuesCount: deletedDues });
  }
}
