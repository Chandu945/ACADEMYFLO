import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { Paginated } from '@academyflo/contracts';
import { AdminErrors } from '../../common/errors';
import { isValidLocalDate } from '@domain/attendance/value-objects/local-date.vo';
import type {
  AdminSubscriptionPaymentReader,
  AdminSubscriptionPaymentFilter,
  AdminSubscriptionPaymentStatus,
} from '../ports/admin-subscription-payment-reader.port';

export interface AdminSubscriptionPaymentDto {
  id: string;
  academyId: string;
  academyName: string | null;
  ownerUserId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  orderId: string;
  cfOrderId: string | null;
  tierKey: string;
  amountInr: number;
  currency: string;
  activeStudentCountAtPurchase: number;
  status: AdminSubscriptionPaymentStatus;
  failureReason: string | null;
  paidAt: string | null;
  providerPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ListAllInput {
  actorRole: string;
  page: number;
  pageSize: number;
  academyId?: string;
  status?: AdminSubscriptionPaymentStatus;
  from?: string;
  to?: string;
  stuckThresholdMinutes?: number;
}

export class ListAllSubscriptionPaymentsUseCase {
  constructor(
    private readonly reader: AdminSubscriptionPaymentReader,
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
  ) {}

  async execute(
    input: ListAllInput,
  ): Promise<Result<Paginated<AdminSubscriptionPaymentDto>, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }
    if (input.from && !isValidLocalDate(input.from)) {
      return err(AppError.validation('Invalid from date format. Expected YYYY-MM-DD'));
    }
    if (input.to && !isValidLocalDate(input.to)) {
      return err(AppError.validation('Invalid to date format. Expected YYYY-MM-DD'));
    }

    const filter: AdminSubscriptionPaymentFilter = {
      page: input.page,
      pageSize: input.pageSize,
      academyId: input.academyId,
      status: input.status,
      from: input.from,
      to: input.to,
      stuckThresholdMinutes: input.stuckThresholdMinutes,
    };

    const result = await this.reader.listAll(filter);

    const ownerIds = [...new Set(result.items.map((r) => r.ownerUserId))];
    const academyIds = [...new Set(result.items.map((r) => r.academyId))];

    const [owners, academies] = await Promise.all([
      Promise.all(ownerIds.map((id) => this.userRepo.findById(id))),
      Promise.all(academyIds.map((id) => this.academyRepo.findById(id))),
    ]);

    const ownerMap = new Map<string, { name: string; email: string }>();
    for (const o of owners) {
      if (o) ownerMap.set(o.id.toString(), { name: o.fullName, email: o.emailNormalized });
    }
    const academyMap = new Map<string, string>();
    for (const a of academies) {
      if (a) academyMap.set(a.id.toString(), a.academyName);
    }

    return ok({
      items: result.items.map((r) => ({
        id: r.id,
        academyId: r.academyId,
        academyName: academyMap.get(r.academyId) ?? null,
        ownerUserId: r.ownerUserId,
        ownerName: ownerMap.get(r.ownerUserId)?.name ?? null,
        ownerEmail: ownerMap.get(r.ownerUserId)?.email ?? null,
        orderId: r.orderId,
        cfOrderId: r.cfOrderId,
        tierKey: r.tierKey,
        amountInr: r.amountInr,
        currency: r.currency,
        activeStudentCountAtPurchase: r.activeStudentCountAtPurchase,
        status: r.status,
        failureReason: r.failureReason,
        paidAt: r.paidAt ? r.paidAt.toISOString() : null,
        providerPaymentId: r.providerPaymentId,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      meta: result.meta,
    });
  }
}
