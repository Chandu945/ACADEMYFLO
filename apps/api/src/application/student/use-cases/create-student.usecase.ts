import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import { Student } from '@domain/student/entities/student.entity';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import {
  canManageStudent,
  validateFullName,
  validatePincode,
  validateMonthlyFee,
  validateGender,
  validateDateOfBirth,
  validateGuardianMobile,
  validateGuardianEmail,
  validateAddressLine,
  validateCityOrState,
  validateAddressText,
  validateOptionalName,
  validateOptionalPhone,
  validateStudentEmail,
} from '@domain/student/rules/student.rules';
import { StudentErrors } from '../../common/errors';
import type { StudentDto } from '../dtos/student.dto';
import { toStudentDto } from '../dtos/student.dto';
import type { Gender, UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { randomUUID } from 'crypto';

export interface CreateStudentAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CreateStudentGuardian {
  name: string;
  mobile: string;
  email: string;
}

export interface CreateStudentInput {
  actorUserId: string;
  actorRole: UserRole;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  address: CreateStudentAddress;
  guardian?: CreateStudentGuardian;
  joiningDate: string;
  monthlyFee: number;
  mobileNumber?: string | null;
  email?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  whatsappNumber?: string | null;
  addressText?: string | null;
  profilePhotoUrl?: string | null;
}

export class CreateStudentUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(input: CreateStudentInput): Promise<Result<StudentDto, AppError>> {
    const roleCheck = canManageStudent(input.actorRole);
    if (!roleCheck.allowed) {
      return err(StudentErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(StudentErrors.academyRequired());
    }

    const nameCheck = validateFullName(input.fullName);
    if (!nameCheck.valid) {
      return err(AppErrorClass.validation(nameCheck.reason!));
    }

    const genderCheck = validateGender(input.gender);
    if (!genderCheck.valid) {
      return err(AppErrorClass.validation(genderCheck.reason!));
    }

    const dob = new Date(input.dateOfBirth);
    const dobCheck = validateDateOfBirth(dob);
    if (!dobCheck.valid) {
      return err(AppErrorClass.validation(dobCheck.reason!));
    }

    const pincodeCheck = validatePincode(input.address.pincode);
    if (!pincodeCheck.valid) {
      return err(AppErrorClass.validation(pincodeCheck.reason!));
    }

    const feeCheck = validateMonthlyFee(input.monthlyFee);
    if (!feeCheck.valid) {
      return err(AppErrorClass.validation(feeCheck.reason!));
    }

    if (input.guardian?.mobile) {
      const guardianMobileCheck = validateGuardianMobile(input.guardian.mobile);
      if (!guardianMobileCheck.valid) {
        return err(AppErrorClass.validation(guardianMobileCheck.reason!));
      }
    }

    // H2b fix: normalize emails to lowercase+trimmed up-front so the format
    // validator sees the canonical form and storage matches the dedup query.
    // Prior code stored email as-typed but `mongo-student.repository.ts`
    // lowercases on query — so a student created with "Rohit@example.com"
    // wouldn't be matched by a subsequent "rohit@example.com" dedup,
    // allowing a duplicate to slip through. `update-student.usecase.ts`
    // already normalizes; this brings create into agreement.
    const normalizedStudentEmail = input.email ? input.email.trim().toLowerCase() : input.email;
    const normalizedGuardianEmail = input.guardian?.email
      ? input.guardian.email.trim().toLowerCase()
      : input.guardian?.email;

    if (normalizedGuardianEmail) {
      const guardianEmailCheck = validateGuardianEmail(normalizedGuardianEmail);
      if (!guardianEmailCheck.valid) {
        return err(AppErrorClass.validation(guardianEmailCheck.reason!));
      }
    }

    // L4 fix: length / format validation for remaining free-text fields.
    // Mirrors the update-student set so neither endpoint is a bypass for
    // the other. Optional fields are only validated if the caller supplied
    // a non-empty value.
    {
      const c = validateAddressLine(input.address.line1, 'Address line 1');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.address.line2 !== undefined && input.address.line2 !== null) {
      const c = validateAddressLine(input.address.line2, 'Address line 2');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    {
      const c = validateCityOrState(input.address.city, 'City');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    {
      const c = validateCityOrState(input.address.state, 'State');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.guardian?.name) {
      const c = validateOptionalName(input.guardian.name, 'Guardian name');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.fatherName) {
      const c = validateOptionalName(input.fatherName, 'Father name');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.motherName) {
      const c = validateOptionalName(input.motherName, 'Mother name');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.addressText) {
      const c = validateAddressText(input.addressText);
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (normalizedStudentEmail) {
      const c = validateStudentEmail(normalizedStudentEmail);
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.mobileNumber) {
      const c = validateOptionalPhone(input.mobileNumber, 'Mobile number');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.whatsappNumber) {
      const c = validateOptionalPhone(input.whatsappNumber, 'WhatsApp number');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }

    // Duplicate email check
    const emailToCheck = normalizedStudentEmail || normalizedGuardianEmail;
    if (emailToCheck) {
      const existingByEmail = await this.studentRepo.findByEmailInAcademy(
        actor.academyId,
        emailToCheck,
      );
      if (existingByEmail) {
        return err(StudentErrors.duplicateEmail());
      }
    }

    // Duplicate phone check
    const phoneToCheck = input.mobileNumber || input.guardian?.mobile;
    if (phoneToCheck) {
      const existingByPhone = await this.studentRepo.findByPhoneInAcademy(
        actor.academyId,
        phoneToCheck,
      );
      if (existingByPhone) {
        return err(StudentErrors.duplicatePhone());
      }
    }

    const student = Student.create({
      id: randomUUID(),
      academyId: actor.academyId,
      fullName: input.fullName,
      dateOfBirth: dob,
      gender: input.gender as Gender,
      address: {
        line1: input.address.line1,
        line2: input.address.line2,
        city: input.address.city,
        state: input.address.state,
        pincode: input.address.pincode,
      },
      guardian: input.guardian
        ? {
            name: input.guardian.name,
            mobile: input.guardian.mobile,
            email: normalizedGuardianEmail ?? input.guardian.email,
          }
        : undefined,
      joiningDate: new Date(input.joiningDate),
      monthlyFee: input.monthlyFee,
      mobileNumber: input.mobileNumber,
      email: normalizedStudentEmail,
      fatherName: input.fatherName,
      motherName: input.motherName,
      whatsappNumber: input.whatsappNumber,
      addressText: input.addressText,
      profilePhotoUrl: input.profilePhotoUrl,
    });

    try {
      await this.studentRepo.save(student);
    } catch (error) {
      // Partial unique indexes on (academyId, email/mobileNumber/guardian.mobile)
      // catch the find-then-save race when two requests pass the dedup check
      // concurrently. Surface a proper 409 instead of a raw 500.
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
      action: 'STUDENT_CREATED',
      entityType: 'STUDENT',
      entityId: student.id.toString(),
      context: { fullName: student.fullName },
    });

    return ok(toStudentDto(student));
  }
}
