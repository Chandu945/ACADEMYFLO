import type { AuditFields, SoftDeleteFields } from '@shared/kernel';
import {
  Entity,
  UniqueId,
  createAuditFields,
  updateAuditFields,
  initSoftDelete,
  markDeleted as markSoftDeleted,
} from '@shared/kernel';

export interface ExpenseProps {
  academyId: string;
  date: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  notes: string | null;
  createdBy: string;
  audit: AuditFields;
  softDelete: SoftDeleteFields;
}

export class Expense extends Entity<ExpenseProps> {
  private constructor(id: UniqueId, props: ExpenseProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    academyId: string;
    date: string;
    categoryId: string;
    categoryName: string;
    amount: number;
    notes: string | null;
    createdBy: string;
  }): Expense {
    return new Expense(new UniqueId(params.id), {
      academyId: params.academyId,
      date: params.date,
      categoryId: params.categoryId,
      categoryName: params.categoryName,
      amount: params.amount,
      notes: params.notes,
      createdBy: params.createdBy,
      audit: createAuditFields(),
      softDelete: initSoftDelete(),
    });
  }

  static reconstitute(id: string, props: ExpenseProps): Expense {
    return new Expense(new UniqueId(id), props);
  }

  update(params: {
    date?: string;
    categoryId?: string;
    categoryName?: string;
    amount?: number;
    notes?: string | null;
  }): Expense {
    return Expense.reconstitute(this.id.toString(), {
      ...this.props,
      date: params.date ?? this.props.date,
      categoryId: params.categoryId ?? this.props.categoryId,
      categoryName: params.categoryName ?? this.props.categoryName,
      amount: params.amount ?? this.props.amount,
      notes: params.notes !== undefined ? params.notes : this.props.notes,
      audit: updateAuditFields(this.props.audit),
    });
  }

  markDeleted(userId: string): Expense {
    return Expense.reconstitute(this.id.toString(), {
      ...this.props,
      softDelete: markSoftDeleted(userId),
      audit: updateAuditFields(this.props.audit),
    });
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get date(): string {
    return this.props.date;
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  get categoryName(): string {
    return this.props.categoryName;
  }

  get amount(): number {
    return this.props.amount;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get audit(): AuditFields {
    return this.props.audit;
  }

  get softDelete(): SoftDeleteFields {
    return this.props.softDelete;
  }
}
