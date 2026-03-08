import type {
  OwnerDashboardRange,
  OwnerDashboardKpis,
} from '../../../domain/dashboard/dashboard.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { ok, err } from '../../../domain/common/result';
import { ownerDashboardApiSchema } from '../../../domain/dashboard/dashboard.schemas';
import type { OwnerDashboardApiPayload } from '../../../domain/dashboard/dashboard.schemas';

export type DashboardApiPort = {
  getOwnerDashboard(
    range: OwnerDashboardRange,
  ): Promise<Result<OwnerDashboardApiPayload, AppError>>;
};

export type GetOwnerDashboardDeps = {
  dashboardApi: DashboardApiPort;
};

function mapToKpis(raw: OwnerDashboardApiPayload): OwnerDashboardKpis {
  return {
    totalActiveStudents: raw.totalStudents,
    newAdmissions: raw.newAdmissions,
    inactiveStudents: raw.inactiveStudents,
    pendingPaymentRequests: raw.pendingPaymentRequests,
    collectedAmount: raw.totalCollected,
    totalPendingAmount: raw.totalPendingAmount,
    todayAbsentCount: raw.todayAbsentCount,
    dueStudentsCount: raw.dueStudentsCount,
    todayPresentCount: raw.todayPresentCount,
    totalExpenses: raw.totalExpenses,
  };
}

export async function getOwnerDashboardUseCase(
  deps: GetOwnerDashboardDeps,
  range: OwnerDashboardRange,
): Promise<Result<OwnerDashboardKpis, AppError>> {
  const result = await deps.dashboardApi.getOwnerDashboard(range);

  if (!result.ok) {
    return result;
  }

  const parsed = ownerDashboardApiSchema.safeParse(result.value);
  if (!parsed.success) {
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }

  return ok(mapToKpis(parsed.data));
}
