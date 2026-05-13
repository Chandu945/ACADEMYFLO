import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { ParentErrors } from '../../common/errors';
import type { ChildFeeDueDto } from '../dtos/parent.dto';
import type { UserRole } from '@academyflo/contracts';
import { computeLateFee } from '@academyflo/contracts';
import type { ClockPort } from '../../common/clock.port';
import { formatLocalDate } from '../../../shared/date-utils';
import {
  buildEffectiveLateFeeConfig,
  buildLateFeeConfigFromAcademy,
} from '../../fee/common/late-fee';

export interface GetChildFeesInput {
  parentUserId: string;
  parentRole: UserRole;
  studentId: string;
  from: string;
  to: string;
}

export class GetChildFeesUseCase {
  constructor(
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly paymentRequestRepo: PaymentRequestRepository,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: GetChildFeesInput): Promise<Result<ChildFeeDueDto[], AppError>> {
    const check = canViewOwnChildren(input.parentRole);
    if (!check.allowed) return err(ParentErrors.childNotLinked());

    const link = await this.linkRepo.findByParentAndStudent(input.parentUserId, input.studentId);
    if (!link) return err(ParentErrors.childNotLinked());

    // M1 fix (parent-flows audit): scoped (studentId, academyId, PENDING)
    // query replaces an unbounded listByStaffAndAcademy that pulled the
    // parent's ENTIRE PR history (all time, all statuses, all students)
    // across every render of this screen. Cap is now the small number of
    // in-flight requests for this one student (1 in practice).
    const [dues, academy, pendingRequests] = await Promise.all([
      this.feeDueRepo.listByStudentAndRange(link.academyId, input.studentId, input.from, input.to),
      this.academyRepo.findById(link.academyId),
      this.paymentRequestRepo.listPendingByStudentAndAcademy(input.studentId, link.academyId),
    ]);

    // G4 mobile-alignment fix: include `source` so the parent UI can
    // distinguish "Owner approving your payment" (PARENT) from "Recorded
    // by Academy staff" (STAFF). Pre-fix, both surfaced as the same
    // generic "pending" badge — confusing when the parent didn't submit
    // anything but their academy recorded a cash collection.
    const pendingByFeeDueId = new Map<
      string,
      { id: string; amount: number; createdAt: string; source: 'PARENT' | 'STAFF' }
    >();
    for (const pr of pendingRequests) {
      // Show pending badges for any PENDING request against this student's
      // fees, regardless of source — a staff-source request blocks parent
      // submission too. (Pre-fix code only counted parent's own requests,
      // hiding staff cash-in-hand entries from the parent's view.)
      pendingByFeeDueId.set(pr.feeDueId, {
        id: pr.id.toString(),
        amount: pr.amount,
        createdAt: pr.audit.createdAt.toISOString(),
        source: pr.source,
      });
    }

    const today = formatLocalDate(this.clock.now());
    // Use the shared helper so all consumers of the fee snapshot/live-config
    // resolution agree (L1 of the fee-payment audit — drop the inline build).
    const config = buildLateFeeConfigFromAcademy(academy);

    const dtos: ChildFeeDueDto[] = dues.map((d) => {
      // Convert to YYYY-MM-DD string for computeLateFee (handle both Date and string)
      const rawDate = d.dueDate as unknown as Date | string;
      const dueDateStr =
        typeof rawDate === 'string'
          ? rawDate.slice(0, 10)
          : new Date(rawDate).toISOString().slice(0, 10);

      let lateFee = 0;
      if (d.status === 'PAID') {
        lateFee = d.lateFeeApplied ?? 0;
      } else {
        const effectiveConfig = buildEffectiveLateFeeConfig(d.lateFeeConfigSnapshot, config);
        if (effectiveConfig) {
          const computed = computeLateFee(dueDateStr, today, effectiveConfig);
          lateFee = Number.isFinite(computed) ? computed : 0;
        }
      }
      return {
        id: d.id.toString(),
        studentId: d.studentId,
        monthKey: d.monthKey,
        dueDate: dueDateStr,
        amount: d.amount,
        lateFee,
        totalPayable: d.amount + lateFee,
        status: d.status,
        paidAt: d.paidAt ? d.paidAt.toISOString() : null,
        paidSource: d.paidSource,
        paymentLabel: d.paymentLabel,
        pendingRequest: pendingByFeeDueId.get(d.id.toString()) ?? null,
      };
    });

    return ok(dtos);
  }
}
