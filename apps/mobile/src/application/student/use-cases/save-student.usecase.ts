import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type {
  CreateStudentRequest,
  UpdateStudentRequest,
} from '../../../domain/student/student.types';

export type SaveStudentApiPort = {
  createStudent(req: CreateStudentRequest): Promise<Result<unknown, AppError>>;
  updateStudent(id: string, req: UpdateStudentRequest): Promise<Result<unknown, AppError>>;
};

export type SaveStudentDeps = {
  saveApi: SaveStudentApiPort;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const E164_RE = /^\+[1-9]\d{6,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_RE = /^[0-9]{6}$/;

export function validateStudentForm(
  fields: Record<string, string>,
  mode: 'create' | 'edit',
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!fields['fullName']?.trim()) {
    errors['fullName'] = 'Full name is required';
  }

  if (fields['dateOfBirth'] && !DATE_RE.test(fields['dateOfBirth'])) {
    errors['dateOfBirth'] = 'Date of birth must be YYYY-MM-DD';
  }

  if (!fields['gender']) {
    errors['gender'] = 'Gender is required';
  }

  if (!fields['addressLine1']?.trim()) {
    errors['addressLine1'] = 'Address line 1 is required';
  }

  if (!fields['city']?.trim()) {
    errors['city'] = 'City is required';
  }

  if (!fields['state']?.trim()) {
    errors['state'] = 'State is required';
  }

  if (!fields['pincode']?.trim()) {
    errors['pincode'] = 'Pincode is required';
  } else if (!PINCODE_RE.test(fields['pincode'])) {
    errors['pincode'] = 'Pincode must be exactly 6 digits';
  }

  if (!fields['guardianName']?.trim()) {
    errors['guardianName'] = 'Guardian name is required';
  }

  if (!fields['guardianMobile']?.trim()) {
    errors['guardianMobile'] = 'Guardian mobile is required';
  } else if (!E164_RE.test(fields['guardianMobile'])) {
    errors['guardianMobile'] = 'Mobile must be in E.164 format (e.g., +919876543210)';
  }

  if (!fields['guardianEmail']?.trim()) {
    errors['guardianEmail'] = 'Guardian email is required';
  } else if (!EMAIL_RE.test(fields['guardianEmail'])) {
    errors['guardianEmail'] = 'Invalid email format';
  }

  if (fields['joiningDate'] && !DATE_RE.test(fields['joiningDate'])) {
    errors['joiningDate'] = 'Joining date must be YYYY-MM-DD';
  }

  if (mode === 'create') {
    const fee = Number(fields['monthlyFee']);
    if (!fields['monthlyFee'] || isNaN(fee) || fee <= 0) {
      errors['monthlyFee'] = 'Monthly fee must be greater than 0';
    }
  }

  if (fields['aadhaarNumber']?.trim() && !/^\d{12}$/.test(fields['aadhaarNumber'].trim())) {
    errors['aadhaarNumber'] = 'Aadhaar number must be exactly 12 digits';
  }

  if (fields['password']?.trim() && fields['password'].trim().length < 6) {
    errors['password'] = 'Password must be at least 6 characters';
  }

  return errors;
}

export async function saveStudentUseCase(
  deps: SaveStudentDeps,
  mode: 'create' | 'edit',
  studentId: string | undefined,
  data: CreateStudentRequest,
): Promise<Result<unknown, AppError>> {
  if (mode === 'edit' && studentId) {
    return deps.saveApi.updateStudent(studentId, data);
  }
  return deps.saveApi.createStudent(data);
}
