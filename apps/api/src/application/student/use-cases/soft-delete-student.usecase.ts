import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields, markDeleted } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { Student } from '@domain/student/entities/student.entity';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canDeleteStudent } from '@domain/student/rules/student.rules';
import { StudentErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import type { TransactionPort } from '../../common/transaction.port';

export interface SoftDeleteStudentInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
}

export class SoftDeleteStudentUseCase {
  // Cascade dependencies are required: a soft-delete that silently skips
  // parent-link / attendance / payment-request cleanup leaves orphans that can
  // surface as cross-tenant data leak (parent reuse) or stale dashboard counts.
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly parentLinkRepo: ParentStudentLinkRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly paymentRequestRepo: PaymentRequestRepository,
    private readonly transaction: TransactionPort,
  ) {}

  async execute(input: SoftDeleteStudentInput): Promise<Result<{ id: string }, AppError>> {
    const roleCheck = canDeleteStudent(input.actorRole);
    if (!roleCheck.allowed) {
      return err(StudentErrors.deleteNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(StudentErrors.academyRequired());
    }

    const student = await this.studentRepo.findById(input.studentId);
    if (!student) {
      return err(StudentErrors.notFound(input.studentId));
    }

    if (student.isDeleted()) {
      return err(StudentErrors.alreadyDeleted());
    }

    if (student.academyId !== actor.academyId) {
      return err(StudentErrors.notInAcademy());
    }

    const academyId = actor.academyId;
    const loadedVersion = student.audit.version;

    const deleted = Student.reconstitute(input.studentId, {
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
      status: student.status,
      statusChangedAt: student.statusChangedAt,
      statusChangedBy: student.statusChangedBy,
      statusHistory: student.statusHistory,
      audit: updateAuditFields(student.audit),
      softDelete: markDeleted(input.actorUserId),
    });

    let cascadeCounts = {
      parentLinks: 0,
      attendance: 0,
      paymentRequests: 0,
    };

    try {
      await this.transaction.run(async () => {
        const saved = await this.studentRepo.saveWithVersionPrecondition(deleted, loadedVersion);
        if (!saved) {
          // Throw to abort the transaction; we surface as concurrency conflict below.
          throw new Error('CONCURRENCY_CONFLICT');
        }

        await this.feeDueRepo.deleteUpcomingByStudent(academyId, input.studentId);
        await this.studentBatchRepo.replaceForStudent(input.studentId, []);

        const [parentLinks, attendance, paymentRequests] = await Promise.all([
          this.parentLinkRepo.deleteAllByStudentId(input.studentId),
          this.attendanceRepo.deleteAllByAcademyAndStudent(academyId, input.studentId),
          this.paymentRequestRepo.deleteAllByAcademyAndStudent(academyId, input.studentId),
        ]);

        cascadeCounts = { parentLinks, attendance, paymentRequests };
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'CONCURRENCY_CONFLICT') {
        return err(StudentErrors.concurrencyConflict());
      }
      throw e;
    }

    await this.auditRecorder.record({
      academyId,
      actorUserId: input.actorUserId,
      action: 'STUDENT_DELETED',
      entityType: 'STUDENT',
      entityId: input.studentId,
      context: {
        studentId: input.studentId,
        cascadeParentLinks: String(cascadeCounts.parentLinks),
        cascadeAttendance: String(cascadeCounts.attendance),
        cascadePaymentRequests: String(cascadeCounts.paymentRequests),
      },
    });

    return ok({ id: input.studentId });
  }
}
