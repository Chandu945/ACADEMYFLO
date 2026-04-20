import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import { Student } from '@domain/student/entities/student.entity';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import {
  canManageStudent,
  canChangeStudentFee,
  validateFullName,
  validatePincode,
  validateMonthlyFee,
  validateGender,
  validateDateOfBirth,
  validateGuardianMobile,
  validateGuardianEmail,
} from '@domain/student/rules/student.rules';
import { StudentErrors } from '../../common/errors';
import type { StudentDto } from '../dtos/student.dto';
import { toStudentDto } from '../dtos/student.dto';
import type { Gender, UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface UpdateStudentAddress {
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface UpdateStudentGuardian {
  name?: string;
  mobile?: string;
  email?: string;
}

export interface UpdateStudentInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: UpdateStudentAddress;
  guardian?: UpdateStudentGuardian;
  joiningDate?: string;
  monthlyFee?: number;
  mobileNumber?: string | null;
  email?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  whatsappNumber?: string | null;
  addressText?: string | null;
}

export class UpdateStudentUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(input: UpdateStudentInput): Promise<Result<StudentDto, AppError>> {
    const roleCheck = canManageStudent(input.actorRole);
    if (!roleCheck.allowed) {
      return err(StudentErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(StudentErrors.academyRequired());
    }

    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) {
      return err(StudentErrors.notFound(input.studentId));
    }
    const loadedVersion = student.audit.version;

    if (student.academyId !== actor.academyId) {
      return err(StudentErrors.notInAcademy());
    }

    // Owner-only fee change guard
    if (input.monthlyFee !== undefined) {
      const feeGuard = canChangeStudentFee(input.actorRole);
      if (!feeGuard.allowed) {
        return err(StudentErrors.feeChangeNotAllowed());
      }
      const feeCheck = validateMonthlyFee(input.monthlyFee);
      if (!feeCheck.valid) {
        return err(AppErrorClass.validation(feeCheck.reason!));
      }
    }

    if (input.fullName !== undefined) {
      const nameCheck = validateFullName(input.fullName);
      if (!nameCheck.valid) {
        return err(AppErrorClass.validation(nameCheck.reason!));
      }
    }

    if (input.gender !== undefined) {
      const genderCheck = validateGender(input.gender);
      if (!genderCheck.valid) {
        return err(AppErrorClass.validation(genderCheck.reason!));
      }
    }

    if (input.dateOfBirth !== undefined) {
      const dob = new Date(input.dateOfBirth);
      const dobCheck = validateDateOfBirth(dob);
      if (!dobCheck.valid) {
        return err(AppErrorClass.validation(dobCheck.reason!));
      }
    }

    if (input.address?.pincode !== undefined) {
      const pincodeCheck = validatePincode(input.address.pincode);
      if (!pincodeCheck.valid) {
        return err(AppErrorClass.validation(pincodeCheck.reason!));
      }
    }

    if (input.guardian?.mobile !== undefined) {
      const mobileCheck = validateGuardianMobile(input.guardian.mobile);
      if (!mobileCheck.valid) {
        return err(AppErrorClass.validation(mobileCheck.reason!));
      }
    }

    if (input.guardian?.email !== undefined) {
      const emailCheck = validateGuardianEmail(input.guardian.email);
      if (!emailCheck.valid) {
        return err(AppErrorClass.validation(emailCheck.reason!));
      }
    }

    // Normalize email-like fields to a single canonical (lowercased, trimmed)
    // representation so dedup, storage, and downstream comparisons all agree.
    const normEmail = (e: string | null | undefined): string | null =>
      e ? e.trim().toLowerCase() : (e === '' ? null : e ?? null);

    const newEmailRaw = input.email !== undefined ? input.email : student.email;
    const newGuardianEmailRaw =
      input.guardian?.email !== undefined ? input.guardian.email : student.guardian?.email;
    const newEmail = normEmail(newEmailRaw);
    const newGuardianEmail = normEmail(newGuardianEmailRaw);
    const emailToCheck = newEmail || newGuardianEmail;
    if (emailToCheck) {
      const existingByEmail = await this.studentRepo.findByEmailInAcademy(actor.academyId, emailToCheck, input.studentId);
      if (existingByEmail) {
        return err(StudentErrors.duplicateEmail());
      }
    }

    // Duplicate phone check (exclude current student)
    const newMobile = input.mobileNumber !== undefined ? input.mobileNumber : student.mobileNumber;
    const newGuardianMobile = input.guardian?.mobile !== undefined ? input.guardian.mobile : student.guardian?.mobile;
    const phoneToCheck = newMobile || newGuardianMobile;
    if (phoneToCheck) {
      const existingByPhone = await this.studentRepo.findByPhoneInAcademy(actor.academyId, phoneToCheck, input.studentId);
      if (existingByPhone) {
        return err(StudentErrors.duplicatePhone());
      }
    }

    const newAddress = {
      line1: input.address?.line1 ?? student.address.line1,
      line2:
        input.address?.line2 !== undefined
          ? (input.address.line2 ?? undefined)
          : student.address.line2,
      city: input.address?.city ?? student.address.city,
      state: input.address?.state ?? student.address.state,
      pincode: input.address?.pincode ?? student.address.pincode,
    };

    const newGuardian = input.guardian
      ? {
          name: input.guardian.name ?? student.guardian?.name ?? '',
          mobile: input.guardian.mobile ?? student.guardian?.mobile ?? '',
          email: (input.guardian.email !== undefined
            ? normEmail(input.guardian.email) ?? ''
            : student.guardian?.email ?? ''),
        }
      : student.guardian;

    const newName = input.fullName ?? student.fullName;

    const updated = Student.reconstitute(input.studentId, {
      academyId: student.academyId,
      fullName: newName.trim(),
      fullNameNormalized: newName.trim().toLowerCase(),
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : student.dateOfBirth,
      gender: input.gender !== undefined ? (input.gender as Gender) : student.gender,
      address: newAddress,
      guardian: newGuardian,
      joiningDate: input.joiningDate ? new Date(input.joiningDate) : student.joiningDate,
      monthlyFee: input.monthlyFee ?? student.monthlyFee,
      mobileNumber:
        input.mobileNumber !== undefined ? (input.mobileNumber ?? null) : student.mobileNumber,
      email: input.email !== undefined ? normEmail(input.email) : student.email,
      profilePhotoUrl: student.profilePhotoUrl,
      fatherName: input.fatherName !== undefined ? (input.fatherName ?? null) : student.fatherName,
      motherName: input.motherName !== undefined ? (input.motherName ?? null) : student.motherName,
      whatsappNumber: input.whatsappNumber !== undefined ? (input.whatsappNumber ?? null) : student.whatsappNumber,
      addressText: input.addressText !== undefined ? (input.addressText ?? null) : student.addressText,
      status: student.status,
      statusChangedAt: student.statusChangedAt,
      statusChangedBy: student.statusChangedBy,
      statusHistory: student.statusHistory,
      audit: updateAuditFields(student.audit),
      softDelete: student.softDelete,
    });

    try {
      const saved = await this.studentRepo.saveWithVersionPrecondition(updated, loadedVersion);
      if (!saved) return err(StudentErrors.concurrencyConflict());
    } catch (error) {
      // Partial unique index may fire if the mobile/email update collides with
      // another student in the same academy.
      const isDup = (error as { code?: number })?.code === 11000;
      if (isDup) {
        const keyPattern = (error as { keyPattern?: Record<string, unknown> })?.keyPattern ?? {};
        if ('email' in keyPattern) return err(StudentErrors.duplicateEmail());
        return err(StudentErrors.duplicatePhone());
      }
      throw error;
    }

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'STUDENT_UPDATED',
      entityType: 'STUDENT',
      entityId: input.studentId,
      context: { studentId: input.studentId },
    });

    return ok(toStudentDto(updated));
  }
}
