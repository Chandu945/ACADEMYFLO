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


type StaffFormFields = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  gender?: string;
  startDate?: string;
  position?: string;
  salaryAmount?: string;
  salaryFrequency?: string;
};

function validateRequiredStaffFields(fields: StaffFormFields, errors: Record<string, string>): void {
  // Per BUG-010: Position, Start Date, Salary Amount+Frequency, and Gender
  // are required for a complete HR record. Address and Qualification stay
  // optional (set later by owner).
  if (!fields.gender?.trim()) {
    errors['gender'] = 'Gender is required';
  }
  if (!fields.startDate?.trim()) {
    errors['startDate'] = 'Start date is required';
  }
  if (!fields.position?.trim()) {
    errors['position'] = 'Position is required';
  } else if (fields.position.trim().length < 2) {
    errors['position'] = 'Position must be at least 2 characters';
  }
  const salary = fields.salaryAmount?.trim();
  if (!salary) {
    errors['salaryAmount'] = 'Salary amount is required';
  } else {
    const n = parseInt(salary, 10);
    if (isNaN(n) || !Number.isInteger(n) || n < 1) {
      errors['salaryAmount'] = 'Salary amount must be a positive integer';
    }
  }
  if (!fields.salaryFrequency?.trim()) {
    errors['salaryFrequency'] = 'Salary frequency is required';
  }
}

export function validateCreateStaffForm(fields: StaffFormFields): Record<string, string> {
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

  validateRequiredStaffFields(fields, errors);

  return errors;
}

export function validateUpdateStaffForm(fields: StaffFormFields): Record<string, string> {
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

  validateRequiredStaffFields(fields, errors);

  return errors;
}

export async function createStaffUseCase(
  deps: CreateStaffDeps,
  input: CreateStaffInput,
): Promise<Result<unknown, AppError>> {
  return deps.staffApi.createStaff(input);
}
