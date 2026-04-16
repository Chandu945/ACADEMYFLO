import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { TransactionLogRepository } from '@domain/fee/ports/transaction-log.repository';
import { PaymentRequestErrors } from '../../common/errors';
import type { TransactionLogDto } from '../dtos/transaction-log.dto';
import { toTransactionLogDto } from '../dtos/transaction-log.dto';
import type { UserRole } from '@playconnect/contracts';

export interface ListTransactionLogsInput {
  actorUserId: string;
  actorRole: UserRole;
  page: number;
  pageSize: number;
}

export interface ListTransactionLogsResult {
  items: TransactionLogDto[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export class ListTransactionLogsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly transactionLogRepo: TransactionLogRepository,
  ) {}

  async execute(
    input: ListTransactionLogsInput,
  ): Promise<Result<ListTransactionLogsResult, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(PaymentRequestErrors.viewNotAllowed());
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(PaymentRequestErrors.academyRequired());

    const { items, total } = await this.transactionLogRepo.listByAcademy(
      user.academyId,
      input.page,
      input.pageSize,
    );

    return ok({
      items: items.map(toTransactionLogDto),
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.ceil(total / input.pageSize) || 1,
      },
    });
  }
}
