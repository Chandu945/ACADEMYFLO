import { randomUUID } from 'crypto';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import { Student } from '@domain/student/entities/student.entity';
import type { TransactionPort } from '../../common/transaction.port';
import { EnquiryErrors } from '../../common/errors';
import { toEnquiryDetail } from './get-enquiry-detail.usecase';
import type { EnquiryDetailOutput } from './get-enquiry-detail.usecase';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface ConvertToStudentInput {
  actorUserId: string;
  actorRole: UserRole;
  enquiryId: string;
  joiningDate: string;
  monthlyFee: number;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
}

export interface ConvertToStudentOutput {
  enquiry: EnquiryDetailOutput;
  studentId: string;
}

export class ConvertToStudentUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly enquiryRepo: EnquiryRepository,
    private readonly studentRepo: StudentRepository,
    private readonly transaction: TransactionPort,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(input: ConvertToStudentInput): Promise<Result<ConvertToStudentOutput, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(EnquiryErrors.convertNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(EnquiryErrors.academyRequired());
    }

    const enquiry = await this.enquiryRepo.findById(input.enquiryId);
    if (!enquiry || enquiry.academyId !== actor.academyId) {
      return err(EnquiryErrors.notFound(input.enquiryId));
    }

    if (!enquiry.isActive) {
      // Retry-safe: if this enquiry was previously converted and the resulting
      // student still exists, return the existing conversion instead of
      // erroring. Covers the case where a commit succeeded but the response
      // was lost in transit, so the client's retry gets a clean ok() with the
      // original studentId rather than a confusing alreadyClosed error.
      if (enquiry.closureReason === 'CONVERTED' && enquiry.convertedStudentId) {
        const existingStudent = await this.studentRepo.findById(enquiry.convertedStudentId);
        if (existingStudent && !existingStudent.isDeleted()) {
          return ok({
            enquiry: toEnquiryDetail(enquiry),
            studentId: enquiry.convertedStudentId,
          });
        }
      }
      return err(EnquiryErrors.alreadyClosed());
    }

    // Date sanity: dateOfBirth must be strictly before joiningDate, and
    // joiningDate must not be unreasonably in the future. Without this, a
    // typo can create a student "born after they joined" which breaks
    // attendance/fee schedules silently.
    const dob = new Date(input.dateOfBirth);
    const joining = new Date(input.joiningDate);
    if (Number.isNaN(dob.getTime()) || Number.isNaN(joining.getTime())) {
      return err(AppErrorClass.validation('dateOfBirth and joiningDate must be valid YYYY-MM-DD dates'));
    }
    if (dob.getTime() >= joining.getTime()) {
      return err(AppErrorClass.validation('dateOfBirth must be before joiningDate'));
    }
    // Allow a small slop so a same-day timezone wobble doesn't reject a
    // legitimate "joining today" — but reject "joining 1 year from now".
    const oneYearAhead = new Date();
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
    if (joining.getTime() > oneYearAhead.getTime()) {
      return err(AppErrorClass.validation('joiningDate cannot be more than one year in the future'));
    }
    if (!Number.isFinite(input.monthlyFee) || input.monthlyFee <= 0) {
      return err(AppErrorClass.validation('monthlyFee must be a positive number'));
    }

    const studentId = randomUUID();
    const student = Student.create({
      id: studentId,
      academyId: actor.academyId,
      fullName: enquiry.prospectName,
      dateOfBirth: new Date(input.dateOfBirth),
      gender: input.gender,
      address: {
        line1: input.addressLine1,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
      },
      guardian: {
        name: enquiry.guardianName ?? enquiry.prospectName,
        mobile: enquiry.mobileNumber,
        email: enquiry.email ?? '',
      },
      joiningDate: new Date(input.joiningDate),
      monthlyFee: input.monthlyFee,
      mobileNumber: enquiry.mobileNumber,
      email: enquiry.email,
      whatsappNumber: enquiry.whatsappNumber,
      addressText: enquiry.address,
    });

    const loadedVersion = enquiry.audit.version;
    const closed = enquiry.close('CONVERTED', input.actorUserId, new Date(), studentId);

    let conflicted = false;
    await this.transaction.run(async () => {
      await this.studentRepo.save(student);
      const saved = await this.enquiryRepo.saveWithVersionPrecondition(closed, loadedVersion);
      if (!saved) {
        conflicted = true;
        throw new Error('CONCURRENCY_CONFLICT');
      }
    }).catch((e: unknown) => {
      if (e instanceof Error && e.message === 'CONCURRENCY_CONFLICT') return;
      throw e;
    });

    if (conflicted) return err(EnquiryErrors.concurrencyConflict());

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'ENQUIRY_CONVERTED',
      entityType: 'ENQUIRY',
      entityId: input.enquiryId,
      context: {
        studentId,
        prospectName: enquiry.prospectName,
      },
    });

    return ok({
      enquiry: toEnquiryDetail(closed),
      studentId,
    });
  }
}
