import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { ParentErrors } from '../../common/errors';
import type { ChildFeeDueDto } from '../dtos/parent.dto';
import type { UserRole } from '@playconnect/contracts';

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
  ) {}

  async execute(input: GetChildFeesInput): Promise<Result<ChildFeeDueDto[], AppError>> {
    const check = canViewOwnChildren(input.parentRole);
    if (!check.allowed) return err(ParentErrors.childNotLinked());

    const link = await this.linkRepo.findByParentAndStudent(input.parentUserId, input.studentId);
    if (!link) return err(ParentErrors.childNotLinked());

    const dues = await this.feeDueRepo.listByStudentAndRange(
      link.academyId,
      input.studentId,
      input.from,
      input.to,
    );

    const dtos: ChildFeeDueDto[] = dues.map((d) => ({
      id: d.id.toString(),
      studentId: d.studentId,
      monthKey: d.monthKey,
      dueDate: d.dueDate,
      amount: d.amount,
      status: d.status,
      paidAt: d.paidAt ? d.paidAt.toISOString() : null,
      paidSource: d.paidSource,
      paymentLabel: d.paymentLabel,
    }));

    return ok(dtos);
  }
}
