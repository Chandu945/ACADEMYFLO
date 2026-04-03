import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { CreateStaffInput } from '../../../domain/staff/staff.types';

export type CreateStaffApiPort = {
  createStaff(input: CreateStaffInput): Promise<Result<unknown, AppError>>;
};

export type CreateStaffDeps = {
  staffApi: CreateStaffApiPort;
};

const NAME_RE = /^[a-zA-Z\s'.,-]+$/;


export function validateCreateStaffForm(fields: {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const trimmedName = fields.fullName.trim();
  if (!trimmedName) {
    errors['fullName'] = 'Full name is required';
  } else if (trimmedName.length < 2) {
    errors['fullName'] = 'Name must be at least 2 characters';
  } else if (!NAME_RE.test(trimmedName)) {
    errors['fullName'] = 'Name can only contain letters, spaces, and punctuation';
  }

  if (!fields.email.trim()) {
    errors['email'] = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors['email'] = 'Invalid email format';
  }

  const phone = fields.phoneNumber.trim();
  if (!phone) {
    errors['phoneNumber'] = 'Phone number is required';
  } else if (!/^[6-9]\d{9}$/.test(phone)) {
    errors['phoneNumber'] = 'Please enter a valid 10-digit phone number starting with 6-9';
  }

  if (!fields.password) {
    errors['password'] = 'Password is required';
  } else if (fields.password.length < 8) {
    errors['password'] = 'Password must be at least 8 characters';
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/.test(fields.password)) {
    errors['password'] = 'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character';
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

  const trimmedName = fields.fullName.trim();
  if (!trimmedName) {
    errors['fullName'] = 'Full name is required';
  } else if (trimmedName.length < 2) {
    errors['fullName'] = 'Name must be at least 2 characters';
  } else if (!NAME_RE.test(trimmedName)) {
    errors['fullName'] = 'Name can only contain letters, spaces, and punctuation';
  }

  if (!fields.email.trim()) {
    errors['email'] = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors['email'] = 'Invalid email format';
  }

  const phone = fields.phoneNumber.trim();
  if (!phone) {
    errors['phoneNumber'] = 'Phone number is required';
  } else if (!/^[6-9]\d{9}$/.test(phone)) {
    errors['phoneNumber'] = 'Please enter a valid 10-digit phone number starting with 6-9';
  }

  if (fields.password && fields.password.length < 8) {
    errors['password'] = 'Password must be at least 8 characters';
  } else if (fields.password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/.test(fields.password)) {
    errors['password'] = 'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character';
  }

  return errors;
}

export async function createStaffUseCase(
  deps: CreateStaffDeps,
  input: CreateStaffInput,
): Promise<Result<unknown, AppError>> {
  return deps.staffApi.createStaff(input);
}
