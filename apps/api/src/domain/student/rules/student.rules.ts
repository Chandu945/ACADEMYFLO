import type { UserRole } from '@academyflo/contracts';
import { GENDERS } from '@academyflo/contracts';
import type { Gender } from '@academyflo/contracts';

export function validateFullName(name: string): { valid: boolean; reason?: string } {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, reason: 'Full name must be at least 2 characters' };
  }
  if (trimmed.length > 100) {
    return { valid: false, reason: 'Full name must not exceed 100 characters' };
  }
  return { valid: true };
}

export function validatePincode(pincode: string): { valid: boolean; reason?: string } {
  if (!/^[0-9]{6}$/.test(pincode)) {
    return { valid: false, reason: 'Pincode must be exactly 6 digits' };
  }
  return { valid: true };
}

export function validateMonthlyFee(fee: number): { valid: boolean; reason?: string } {
  if (!Number.isInteger(fee)) {
    return { valid: false, reason: 'Monthly fee must be an integer' };
  }
  if (fee <= 0) {
    return { valid: false, reason: 'Monthly fee must be greater than 0' };
  }
  return { valid: true };
}

export function validateGender(gender: string): { valid: boolean; reason?: string } {
  if (!GENDERS.includes(gender as Gender)) {
    return { valid: false, reason: `Gender must be one of: ${GENDERS.join(', ')}` };
  }
  return { valid: true };
}

const MAX_AGE_YEARS = 120;

export function validateDateOfBirth(dob: Date): { valid: boolean; reason?: string } {
  const now = new Date();
  if (dob > now) {
    return { valid: false, reason: 'Date of birth cannot be in the future' };
  }
  const ageYears = (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears > MAX_AGE_YEARS) {
    return { valid: false, reason: `Date of birth cannot be more than ${MAX_AGE_YEARS} years ago` };
  }
  return { valid: true };
}

export function validateGuardianMobile(mobile: string): { valid: boolean; reason?: string } {
  if (!/^\+[1-9]\d{6,14}$/.test(mobile)) {
    return { valid: false, reason: 'Guardian mobile must be in E.164 format' };
  }
  return { valid: true };
}

// RFC 5321 caps email addresses at 254 chars. We use the same cap for both
// guardian and student emails so an upload of "a@b.com" + 10MB of repeated
// chars can't slip past the format-only check.
const MAX_EMAIL_LENGTH = 254;

export function validateGuardianEmail(email: string): { valid: boolean; reason?: string } {
  if (email.length > MAX_EMAIL_LENGTH) {
    return {
      valid: false,
      reason: `Guardian email must not exceed ${MAX_EMAIL_LENGTH} characters`,
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, reason: 'Guardian email must be a valid email address' };
  }
  return { valid: true };
}

// L4 fix (student-management audit): the update- and create-student use
// cases previously accepted unbounded strings for several free-text fields.
// A client could send `fatherName: "Z".repeat(5_000_000)` and either blow
// past Mongo's 16 MB BSON limit (opaque save error) or quietly bloat the
// document until admin list queries crawl.
//
// The validators below cap each field at a length that's generous for
// real-world data but defends against blob-sized payloads. Limits chosen
// to match `validateFullName`'s 100-char cap where it applies, with longer
// caps for genuinely free-form fields (addressText). Each validator is
// applied on BOTH create and update so neither path is a bypass for the
// other.

const MAX_NAME_LENGTH = 100;
const MAX_CITY_STATE_LENGTH = 50;
const MAX_ADDRESS_LINE_LENGTH = 100;
const MAX_ADDRESS_TEXT_LENGTH = 500;

export function validateOptionalName(
  value: string,
  fieldLabel: string,
): { valid: boolean; reason?: string } {
  if (value.length > MAX_NAME_LENGTH) {
    return { valid: false, reason: `${fieldLabel} must not exceed ${MAX_NAME_LENGTH} characters` };
  }
  return { valid: true };
}

export function validateAddressLine(
  value: string,
  fieldLabel: string,
): { valid: boolean; reason?: string } {
  if (value.length > MAX_ADDRESS_LINE_LENGTH) {
    return {
      valid: false,
      reason: `${fieldLabel} must not exceed ${MAX_ADDRESS_LINE_LENGTH} characters`,
    };
  }
  return { valid: true };
}

export function validateCityOrState(
  value: string,
  fieldLabel: string,
): { valid: boolean; reason?: string } {
  if (value.length > MAX_CITY_STATE_LENGTH) {
    return {
      valid: false,
      reason: `${fieldLabel} must not exceed ${MAX_CITY_STATE_LENGTH} characters`,
    };
  }
  return { valid: true };
}

export function validateAddressText(value: string): { valid: boolean; reason?: string } {
  if (value.length > MAX_ADDRESS_TEXT_LENGTH) {
    return {
      valid: false,
      reason: `Address text must not exceed ${MAX_ADDRESS_TEXT_LENGTH} characters`,
    };
  }
  return { valid: true };
}

export function validateStudentEmail(email: string): { valid: boolean; reason?: string } {
  // Reuses the same RFC 5321 length cap + format check as guardian email.
  // The student-level email was previously stored without any validation,
  // so this closes the same gap on a different field.
  if (email.length > MAX_EMAIL_LENGTH) {
    return { valid: false, reason: `Email must not exceed ${MAX_EMAIL_LENGTH} characters` };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, reason: 'Email must be a valid email address' };
  }
  return { valid: true };
}

// L5 fix (student-management audit): the change-student-status use case
// previously truncated the reason to 500 chars silently — so a 10 MB blob
// would save a 500-char prefix, the audit log would record the prefix, and
// the push/email notifications would show the full untruncated value (the
// two copies disagreed). This validator rejects oversize reasons outright,
// matching the L4 length-validation pattern used elsewhere on the entity.
const MAX_STATUS_CHANGE_REASON_LENGTH = 500;

export function validateStatusChangeReason(reason: string): { valid: boolean; reason?: string } {
  if (reason.length > MAX_STATUS_CHANGE_REASON_LENGTH) {
    return {
      valid: false,
      reason: `Reason must not exceed ${MAX_STATUS_CHANGE_REASON_LENGTH} characters`,
    };
  }
  return { valid: true };
}

export function validateOptionalPhone(
  phone: string,
  fieldLabel: string,
): { valid: boolean; reason?: string } {
  // Reuses the E.164 pattern (`+` followed by 7-15 digits, leading non-zero)
  // already used for guardian mobile. Used for mobileNumber and
  // whatsappNumber which were previously persisted unvalidated.
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    return { valid: false, reason: `${fieldLabel} must be in E.164 format` };
  }
  return { valid: true };
}

export function canManageStudent(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER' && role !== 'STAFF') {
    return { allowed: false, reason: 'Only owners and staff can manage students' };
  }
  return { allowed: true };
}

export function canChangeStudentFee(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can change student fees' };
  }
  return { allowed: true };
}

export function canChangeStudentStatus(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can change student status' };
  }
  return { allowed: true };
}

export function canDeleteStudent(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can delete students' };
  }
  return { allowed: true };
}
