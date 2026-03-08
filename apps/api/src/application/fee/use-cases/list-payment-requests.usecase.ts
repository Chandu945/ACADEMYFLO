import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import { canListPaymentRequests } from '@domain/fee/rules/payment-request.rules';
import { PaymentRequestErrors } from '../../common/errors';
import type { PaymentRequestDto } from '../dtos/payment-request.dto';
import { toPaymentRequestDto } from '../dtos/payment-request.dto';
import type { UserRole, PaymentRequestStatus } from '@playconnect/contracts';

export interface ListPaymentRequestsInput {
  actorUserId: string;
  actorRole: UserRole;
  status?: PaymentRequestStatus;
  page: number;
  pageSize: number;
}

export interface ListPaymentRequestsOutput {
  data: PaymentRequestDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export class ListPaymentRequestsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly paymentRequestRepo: PaymentRequestRepository,
  ) {}

  async execute(
    input: ListPaymentRequestsInput,
  ): Promise<Result<ListPaymentRequestsOutput, AppError>> {
    const check = canListPaymentRequests(input.actorRole);
    if (!check.allowed) return err(PaymentRequestErrors.viewNotAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(PaymentRequestErrors.academyRequired());

    const statuses: PaymentRequestStatus[] = input.status
      ? [input.status]
      : ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

    let requests;
    if (input.actorRole === 'STAFF') {
      const all = await this.paymentRequestRepo.listByStaffAndAcademy(
        input.actorUserId,
        user.academyId,
      );
      requests = input.status ? all.filter((r) => r.status === input.status) : all;
    } else {
      requests = await this.paymentRequestRepo.listByAcademyAndStatuses(user.academyId, statuses);
    }

    const totalItems = requests.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / input.pageSize));
    const start = (input.page - 1) * input.pageSize;
    const paged = requests.slice(start, start + input.pageSize);

    // Resolve staff, student, and reviewer names for display
    const staffIds = [...new Set(paged.map((r) => r.staffUserId))];
    const studentIds = [...new Set(paged.map((r) => r.studentId))];
    const reviewerIds = [...new Set(paged.map((r) => r.reviewedByUserId).filter(Boolean))] as string[];

    const [staffUsers, students, reviewerUsers] = await Promise.all([
      Promise.all(staffIds.map((id) => this.userRepo.findById(id))),
      this.studentRepo.findByIds(studentIds),
      Promise.all(reviewerIds.map((id) => this.userRepo.findById(id))),
    ]);

    const staffNameMap = new Map<string, string>();
    for (const su of staffUsers) {
      if (su) staffNameMap.set(su.id.toString(), su.fullName);
    }
    const studentNameMap = new Map<string, string>();
    for (const s of students) {
      if (s) studentNameMap.set(s.id.toString(), s.fullName);
    }
    const reviewerNameMap = new Map<string, string>();
    for (const ru of reviewerUsers) {
      if (ru) reviewerNameMap.set(ru.id.toString(), ru.fullName);
    }

    return ok({
      data: paged.map((r) => toPaymentRequestDto(r, {
        staffName: staffNameMap.get(r.staffUserId),
        studentName: studentNameMap.get(r.studentId),
        reviewedByName: r.reviewedByUserId ? reviewerNameMap.get(r.reviewedByUserId) : undefined,
      })),
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems,
        totalPages,
      },
    });
  }
}
