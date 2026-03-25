import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { CreateStaffInput } from '../../../domain/staff/staff.types';

export type CreateStaffApiPort = {
  createStaff(input: CreateStaffInput): Promise<Result<unknown, AppError>>;
};

export type CreateStaffDeps = {
  staffApi: CreateStaffApiPort;
};

/** Normalize a phone number to E.164 before validation */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (raw.startsWith('+')) return raw;
  if (/^\d{12}$/.test(digits) && digits.startsWith('91')) return `+${digits}`;
  return raw;
}

export function validateCreateStaffForm(fields: {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!fields.fullName.trim()) {
    errors['fullName'] = 'Full name is required';
  }

  if (!fields.email.trim()) {
    errors['email'] = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors['email'] = 'Invalid email format';
  }

  if (!fields.phoneNumber.trim()) {
    errors['phoneNumber'] = 'Phone number is required';
  } else if (!/^\+[1-9]\d{6,14}$/.test(normalizePhone(fields.phoneNumber.trim()))) {
    errors['phoneNumber'] = 'Please enter a valid 10-digit phone number';
  }

  if (!fields.password) {
    errors['password'] = 'Password is required';
  } else if (fields.password.length < 8) {
    errors['password'] = 'Password must be at least 8 characters';
  }

  return errors;
}

export function validateUpdateStaffForm(fields: {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!fields.fullName.trim()) {
    errors['fullName'] = 'Full name is required';
  }

  if (!fields.email.trim()) {
    errors['email'] = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors['email'] = 'Invalid email format';
  }

  if (!fields.phoneNumber.trim()) {
    errors['phoneNumber'] = 'Phone number is required';
  } else if (!/^\+[1-9]\d{6,14}$/.test(normalizePhone(fields.phoneNumber.trim()))) {
    errors['phoneNumber'] = 'Please enter a valid 10-digit phone number';
  }

  if (fields.password && fields.password.length < 8) {
    errors['password'] = 'Password must be at least 8 characters';
  }

  return errors;
}

export async function createStaffUseCase(
  deps: CreateStaffDeps,
  input: CreateStaffInput,
): Promise<Result<unknown, AppError>> {
  return deps.staffApi.createStaff(input);
}
