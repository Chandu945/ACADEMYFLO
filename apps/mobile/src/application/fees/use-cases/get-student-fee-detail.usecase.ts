import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import type { FeeDueItem } from '../../../domain/fees/fees.types';
import {
  feeDueListResponseSchema,
  type FeeDueListApiResponse,
} from '../../../domain/fees/fees.schemas';

export type GetStudentFeeDetailApiPort = {
  getStudentFees(
    studentId: string,
    from: string,
    to: string,
  ): Promise<Result<FeeDueListApiResponse, AppError>>;
};

export type GetStudentFeeDetailDeps = {
  feesApi: GetStudentFeeDetailApiPort;
};

export async function getStudentFeeDetailUseCase(
  deps: GetStudentFeeDetailDeps,
  studentId: string,
  from: string,
  to: string,
): Promise<Result<FeeDueItem[], AppError>> {
  const result = await deps.feesApi.getStudentFees(studentId, from, to);

  if (!result.ok) {
    return result;
  }

  const parsed = feeDueListResponseSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(parsed.data);
}
