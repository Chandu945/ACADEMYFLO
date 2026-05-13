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

    if (input.guardian?.email !== undefined && input.guardian.email !== '') {
      const emailCheck = validateGuardianEmail(input.guardian.email);
      if (!emailCheck.valid) {
        return err(AppErrorClass.validation(emailCheck.reason!));
      }
    }

    // L4 fix: length / format validation for the remaining free-text fields.
    // Each `!== undefined` guard preserves the partial-update contract — a
    // PATCH that doesn't touch a field doesn't have to re-supply it. Empty
    // strings are allowed for the optional name/text fields (they collapse
    // to null on storage); only non-empty values are validated.
    if (input.address?.line1 !== undefined) {
      const c = validateAddressLine(input.address.line1, 'Address line 1');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.address?.line2 !== undefined && input.address.line2 !== null) {
      const c = validateAddressLine(input.address.line2, 'Address line 2');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.address?.city !== undefined) {
      const c = validateCityOrState(input.address.city, 'City');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.address?.state !== undefined) {
      const c = validateCityOrState(input.address.state, 'State');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.guardian?.name !== undefined && input.guardian.name !== '') {
      const c = validateOptionalName(input.guardian.name, 'Guardian name');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.fatherName !== undefined && input.fatherName !== null && input.fatherName !== '') {
      const c = validateOptionalName(input.fatherName, 'Father name');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.motherName !== undefined && input.motherName !== null && input.motherName !== '') {
      const c = validateOptionalName(input.motherName, 'Mother name');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.addressText !== undefined && input.addressText !== null && input.addressText !== '') {
      const c = validateAddressText(input.addressText);
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (input.email !== undefined && input.email !== null && input.email !== '') {
      const c = validateStudentEmail(input.email);
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (
      input.mobileNumber !== undefined &&
      input.mobileNumber !== null &&
      input.mobileNumber !== ''
    ) {
      const c = validateOptionalPhone(input.mobileNumber, 'Mobile number');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }
    if (
      input.whatsappNumber !== undefined &&
      input.whatsappNumber !== null &&
      input.whatsappNumber !== ''
    ) {
      const c = validateOptionalPhone(input.whatsappNumber, 'WhatsApp number');
      if (!c.valid) return err(AppErrorClass.validation(c.reason!));
    }

    // Normalize email-like fields to a single canonical (lowercased, trimmed)
    // representation so dedup, storage, and downstream comparisons all agree.
    const normEmail = (e: string | null | undefined): string | null =>
      e ? e.trim().toLowerCase() : e === '' ? null : (e ?? null);

    const newEmailRaw = input.email !== undefined ? input.email : student.email;
    const newGuardianEmailRaw =
      input.guardian?.email !== undefined ? input.guardian.email : student.guardian?.email;
    const newEmail = normEmail(newEmailRaw);
    const newGuardianEmail = normEmail(newGuardianEmailRaw);
    const emailToCheck = newEmail || newGuardianEmail;
    if (emailToCheck) {
      const existingByEmail = await this.studentRepo.findByEmailInAcademy(
        actor.academyId,
        emailToCheck,
        input.studentId,
      );
      if (existingByEmail) {
        return err(StudentErrors.duplicateEmail());
      }
    }

    // Duplicate phone check (exclude current student)
    const newMobile = input.mobileNumber !== undefined ? input.mobileNumber : student.mobileNumber;
    const newGuardianMobile =
      input.guardian?.mobile !== undefined ? input.guardian.mobile : student.guardian?.mobile;
    const phoneToCheck = newMobile || newGuardianMobile;
    if (phoneToCheck) {
      const existingByPhone = await this.studentRepo.findByPhoneInAcademy(
        actor.academyId,
        phoneToCheck,
        input.studentId,
      );
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
          email:
            input.guardian.email !== undefined
              ? (normEmail(input.guardian.email) ?? '')
              : (student.guardian?.email ?? ''),
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
      whatsappNumber:
        input.whatsappNumber !== undefined
          ? (input.whatsappNumber ?? null)
          : student.whatsappNumber,
      addressText:
        input.addressText !== undefined ? (input.addressText ?? null) : student.addressText,
      status: student.status,
      statusChangedAt: student.statusChangedAt,
      statusChangedBy: student.statusChangedBy,
      statusHistory: student.statusHistory,
      audit: updateAuditFields(student.audit),
      softDelete: student.softDelete,
    });

    // M1 fix: compute the diff between the current student and the merged
    // `updated` entity so the audit log records WHICH fields changed (not
    // just "something changed"). For monthlyFee specifically — the most
    // dispute-prone field — also record old + new values directly in the
    // audit context. Other fields are PII (addresses, phones, emails) and
    // are tracked by name only to avoid long-term PII retention in the
    // audit log.
    const changedFields = diffChangedFields(student, updated);

    // No-op skip: if the request changed nothing (all input fields match
    // current state, or no fields were provided), don't save and don't
    // audit. A noise-free audit log is more useful than one cluttered with
    // "STUDENT_UPDATED" entries that didn't actually update anything.
    if (changedFields.length === 0) {
      return ok(toStudentDto(student));
    }

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

    const auditContext: Record<string, string> = {
      studentId: input.studentId,
      changedFields: changedFields.join(','),
    };
    if (changedFields.includes('monthlyFee')) {
      auditContext['oldMonthlyFee'] = String(student.monthlyFee);
      auditContext['newMonthlyFee'] = String(updated.monthlyFee);
    }

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'STUDENT_UPDATED',
      entityType: 'STUDENT',
      entityId: input.studentId,
      context: auditContext,
    });

    return ok(toStudentDto(updated));
  }
}

/**
 * M1 helper: returns the list of field names that differ between the original
 * student and the merged update. Nested-object sub-fields are flattened with
 * dotted notation (e.g., `address.line1`, `guardian.email`). Optional
 * fields are normalized to `null` before comparison so undefined-vs-null
 * doesn't falsely register as a change.
 */
function diffChangedFields(old: Student, updated: Student): string[] {
  const changed: string[] = [];

  if (updated.fullName !== old.fullName) changed.push('fullName');
  if (updated.dateOfBirth.getTime() !== old.dateOfBirth.getTime()) changed.push('dateOfBirth');
  if (updated.gender !== old.gender) changed.push('gender');

  if (updated.address.line1 !== old.address.line1) changed.push('address.line1');
  if ((updated.address.line2 ?? null) !== (old.address.line2 ?? null))
    changed.push('address.line2');
  if (updated.address.city !== old.address.city) changed.push('address.city');
  if (updated.address.state !== old.address.state) changed.push('address.state');
  if (updated.address.pincode !== old.address.pincode) changed.push('address.pincode');

  const oldG = old.guardian;
  const newG = updated.guardian;
  if ((oldG?.name ?? null) !== (newG?.name ?? null)) changed.push('guardian.name');
  if ((oldG?.mobile ?? null) !== (newG?.mobile ?? null)) changed.push('guardian.mobile');
  if ((oldG?.email ?? null) !== (newG?.email ?? null)) changed.push('guardian.email');

  if (updated.joiningDate.getTime() !== old.joiningDate.getTime()) changed.push('joiningDate');
  if (updated.monthlyFee !== old.monthlyFee) changed.push('monthlyFee');
  if ((updated.mobileNumber ?? null) !== (old.mobileNumber ?? null)) changed.push('mobileNumber');
  if ((updated.email ?? null) !== (old.email ?? null)) changed.push('email');
  if ((updated.fatherName ?? null) !== (old.fatherName ?? null)) changed.push('fatherName');
  if ((updated.motherName ?? null) !== (old.motherName ?? null)) changed.push('motherName');
  if ((updated.whatsappNumber ?? null) !== (old.whatsappNumber ?? null))
    changed.push('whatsappNumber');
  if ((updated.addressText ?? null) !== (old.addressText ?? null)) changed.push('addressText');

  return changed;
}
