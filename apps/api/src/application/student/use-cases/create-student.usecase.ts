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
} from '@domain/student/rules/student.rules';
import { StudentErrors } from '../../common/errors';
import type { StudentDto } from '../dtos/student.dto';
import { toStudentDto } from '../dtos/student.dto';
import type { Gender, UserRole } from '@playconnect/contracts';
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

    if (input.guardian?.email) {
      const guardianEmailCheck = validateGuardianEmail(input.guardian.email);
      if (!guardianEmailCheck.valid) {
        return err(AppErrorClass.validation(guardianEmailCheck.reason!));
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
            email: input.guardian.email,
          }
        : undefined,
      joiningDate: new Date(input.joiningDate),
      monthlyFee: input.monthlyFee,
      mobileNumber: input.mobileNumber,
      email: input.email,
      fatherName: input.fatherName,
      motherName: input.motherName,
      whatsappNumber: input.whatsappNumber,
      addressText: input.addressText,
      profilePhotoUrl: input.profilePhotoUrl,
    });

    await this.studentRepo.save(student);

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
