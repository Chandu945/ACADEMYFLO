import type { UserRole } from '@playconnect/contracts';
import { GENDERS } from '@playconnect/contracts';
import type { Gender } from '@playconnect/contracts';

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

export function validateDateOfBirth(dob: Date): { valid: boolean; reason?: string } {
  if (dob > new Date()) {
    return { valid: false, reason: 'Date of birth cannot be in the future' };
  }
  return { valid: true };
}

export function validateGuardianMobile(mobile: string): { valid: boolean; reason?: string } {
  if (!/^\+[1-9]\d{6,14}$/.test(mobile)) {
    return { valid: false, reason: 'Guardian mobile must be in E.164 format' };
  }
  return { valid: true };
}

export function validateGuardianEmail(email: string): { valid: boolean; reason?: string } {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, reason: 'Guardian email must be a valid email address' };
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
