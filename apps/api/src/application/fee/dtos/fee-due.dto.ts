import type { FeeDue } from '@domain/fee/entities/fee-due.entity';
import type { FeeDueStatus, PaidSource, PaymentLabel } from '@playconnect/contracts';

export interface FeeDueDto {
  id: string;
  academyId: string;
  studentId: string;
  monthKey: string;
  dueDate: string;
  amount: number;
  status: FeeDueStatus;
  paidAt: string | null;
  paidByUserId: string | null;
  paidSource: PaidSource | null;
  paymentLabel: PaymentLabel | null;
  collectedByUserId: string | null;
  approvedByUserId: string | null;
  paymentRequestId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toFeeDueDto(feeDue: FeeDue): FeeDueDto {
  return {
    id: feeDue.id.toString(),
    academyId: feeDue.academyId,
    studentId: feeDue.studentId,
    monthKey: feeDue.monthKey,
    dueDate: feeDue.dueDate,
    amount: feeDue.amount,
    status: feeDue.status,
    paidAt: feeDue.paidAt ? feeDue.paidAt.toISOString() : null,
    paidByUserId: feeDue.paidByUserId,
    paidSource: feeDue.paidSource,
    paymentLabel: feeDue.paymentLabel,
    collectedByUserId: feeDue.collectedByUserId,
    approvedByUserId: feeDue.approvedByUserId,
    paymentRequestId: feeDue.paymentRequestId,
    createdAt: feeDue.audit.createdAt.toISOString(),
    updatedAt: feeDue.audit.updatedAt.toISOString(),
  };
}
