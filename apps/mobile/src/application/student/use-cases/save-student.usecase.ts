import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type {
  CreateStudentRequest,
  UpdateStudentRequest,
} from '../../../domain/student/student.types';
import { isValidDate } from '../../../domain/common/date-utils';

export type SaveStudentApiPort = {
  createStudent(req: CreateStudentRequest): Promise<Result<unknown, AppError>>;
  updateStudent(id: string, req: UpdateStudentRequest): Promise<Result<unknown, AppError>>;
};

export type SaveStudentDeps = {
  saveApi: SaveStudentApiPort;
};

const E164_RE = /^\+[1-9]\d{6,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const NAME_RE = /^[a-zA-Z\s'.,-]+$/;

export function validateStudentForm(
  fields: Record<string, string>,
  mode: 'create' | 'edit',
): Record<string, string> {
  const errors: Record<string, string> = {};

  const fullName = fields['fullName']?.trim();
  if (!fullName) {
    errors['fullName'] = 'Full name is required';
  } else if (fullName.length < 2) {
    errors['fullName'] = 'Name must be at least 2 characters';
  } else if (!NAME_RE.test(fullName)) {
    errors['fullName'] = 'Name can only contain letters, spaces, and punctuation';
  }

  const fatherName = fields['fatherName']?.trim();
  if (fatherName && !NAME_RE.test(fatherName)) {
    errors['fatherName'] = 'Name can only contain letters, spaces, and punctuation';
  }

  const motherName = fields['motherName']?.trim();
  if (motherName && !NAME_RE.test(motherName)) {
    errors['motherName'] = 'Name can only contain letters, spaces, and punctuation';
  }

  const guardianName = fields['guardianName']?.trim();
  if (guardianName && !NAME_RE.test(guardianName)) {
    errors['guardianName'] = 'Name can only contain letters, spaces, and punctuation';
  }

  if (fields['dateOfBirth'] && !isValidDate(fields['dateOfBirth'])) {
    errors['dateOfBirth'] = 'Enter a valid date (YYYY-MM-DD)';
  }

  if (!fields['gender']) {
    errors['gender'] = 'Gender is required';
  }

  if (fields['guardianMobile']?.trim() && !E164_RE.test(fields['guardianMobile'])) {
    errors['guardianMobile'] = 'Please enter a valid phone number (e.g., 9876543210)';
  }

  if (fields['guardianEmail']?.trim() && !EMAIL_RE.test(fields['guardianEmail'])) {
    errors['guardianEmail'] = 'Invalid email format';
  }

  if (fields['joiningDate'] && !isValidDate(fields['joiningDate'])) {
    errors['joiningDate'] = 'Enter a valid date (YYYY-MM-DD)';
  }

  if (mode === 'create') {
    const fee = Number(fields['monthlyFee']);
    if (!fields['monthlyFee'] || isNaN(fee) || fee <= 0) {
      errors['monthlyFee'] = 'Monthly fee must be greater than 0';
    }
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
