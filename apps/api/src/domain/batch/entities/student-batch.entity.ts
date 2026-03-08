import { Entity, UniqueId } from '@shared/kernel';

export interface StudentBatchProps {
  studentId: string;
  batchId: string;
  academyId: string;
  assignedAt: Date;
}

export class StudentBatch extends Entity<StudentBatchProps> {
  private constructor(id: UniqueId, props: StudentBatchProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    studentId: string;
    batchId: string;
    academyId: string;
  }): StudentBatch {
    return new StudentBatch(new UniqueId(params.id), {
      studentId: params.studentId,
      batchId: params.batchId,
      academyId: params.academyId,
      assignedAt: new Date(),
    });
  }

  static reconstitute(id: string, props: StudentBatchProps): StudentBatch {
    return new StudentBatch(new UniqueId(id), props);
  }

  get studentId(): string {
    return this.props.studentId;
  }

  get batchId(): string {
    return this.props.batchId;
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get assignedAt(): Date {
    return this.props.assignedAt;
  }
}
