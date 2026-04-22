import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { BankDetails } from '@domain/academy/entities/academy.entity';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRole } from '@academyflo/contracts';

export interface GetAcademyPaymentMethodsInput {
  actorUserId: string;
  actorRole: UserRole;
}

/**
 * Parent-facing view of academy payment methods. Returned shape is sanitized:
 *   - `manualPaymentsEnabled` is always included so the client can show/hide
 *     the manual-pay CTA;
 *   - When disabled, the sensitive fields (UPI ID, QR URL, bank details) are
 *     all `null` regardless of what's stored;
 *   - The academy's student / owner PII (signature stamp, addresses, fee
 *     settings) is never exposed here — only fields a parent needs to pay.
 */
export interface AcademyPaymentMethodsDto {
  manualPaymentsEnabled: boolean;
  upiId: string | null;
  upiHolderName: string | null;
  qrCodeImageUrl: string | null;
  bankDetails: BankDetails | null;
  academyName: string;
}

export class GetAcademyPaymentMethodsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
  ) {}

  async execute(
    input: GetAcademyPaymentMethodsInput,
  ): Promise<Result<AcademyPaymentMethodsDto, AppError>> {
    // Accessible to any authenticated academy member — owners see their own
    // config, staff see the methods they'd quote to parents, and parents see
    // what they need to pay.
    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) {
      return err(AppErrorClass.forbidden('No academy associated with this account'));
    }

    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) {
      return err(AppErrorClass.notFound('Academy'));
    }

    const info = academy.instituteInfo;
    const enabled = info.manualPaymentsEnabled === true;

    return ok({
      manualPaymentsEnabled: enabled,
      // Null-out everything when disabled, even if the owner has values saved —
      // avoids leaking unused fields and keeps the client logic simple.
      upiId: enabled ? info.upiId : null,
      upiHolderName: enabled ? info.upiHolderName : null,
      qrCodeImageUrl: enabled ? info.qrCodeImageUrl : null,
      bankDetails: enabled ? info.bankDetails : null,
      academyName: academy.academyName,
    });
  }
}
