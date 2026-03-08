import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields } from '@shared/kernel';

export interface ExpenseCategoryProps {
  academyId: string;
  name: string;
  createdBy: string;
  audit: AuditFields;
}

export class ExpenseCategory extends Entity<ExpenseCategoryProps> {
  private constructor(id: UniqueId, props: ExpenseCategoryProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    academyId: string;
    name: string;
    createdBy: string;
  }): ExpenseCategory {
    return new ExpenseCategory(new UniqueId(params.id), {
      academyId: params.academyId,
      name: params.name.trim(),
      createdBy: params.createdBy,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: ExpenseCategoryProps): ExpenseCategory {
    return new ExpenseCategory(new UniqueId(id), props);
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get name(): string {
    return this.props.name;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get audit(): AuditFields {
    return this.props.audit;
  }
}
