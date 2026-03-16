import type { AuditFields, SoftDeleteFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields, initSoftDelete } from '@shared/kernel';
import type { StudentStatus } from '@playconnect/contracts';
import type { Gender } from '@playconnect/contracts';

export interface StudentAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface StudentGuardian {
  name: string;
  mobile: string;
  email: string;
}

export interface StatusHistoryEntry {
  fromStatus: StudentStatus;
  toStatus: StudentStatus;
  changedBy: string;
  changedAt: Date;
  reason: string | null;
}

export interface StudentProps {
  academyId: string;
  fullName: string;
  fullNameNormalized: string;
  dateOfBirth: Date;
  gender: Gender;
  address: StudentAddress;
  guardian: StudentGuardian | null;
  joiningDate: Date;
  monthlyFee: number;
  mobileNumber: string | null;
  email: string | null;
  status: StudentStatus;
  statusChangedAt: Date | null;
  statusChangedBy: string | null;
  statusHistory: StatusHistoryEntry[];
  // Extended profile fields (all optional)
  profilePhotoUrl: string | null;
  fatherName: string | null;
  motherName: string | null;
  whatsappNumber: string | null;
  addressText: string | null;
  audit: AuditFields;
  softDelete: SoftDeleteFields;
}

export class Student extends Entity<StudentProps> {
  private constructor(id: UniqueId, props: StudentProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    academyId: string;
    fullName: string;
    dateOfBirth: Date;
    gender: Gender;
    address: StudentAddress;
    guardian?: StudentGuardian;
    joiningDate: Date;
    monthlyFee: number;
    mobileNumber?: string | null;
    email?: string | null;
    profilePhotoUrl?: string | null;
    fatherName?: string | null;
    motherName?: string | null;
    whatsappNumber?: string | null;
    addressText?: string | null;
  }): Student {
    const trimmedName = params.fullName.trim();
    return new Student(new UniqueId(params.id), {
      academyId: params.academyId,
      fullName: trimmedName,
      fullNameNormalized: trimmedName.toLowerCase(),
      dateOfBirth: params.dateOfBirth,
      gender: params.gender,
      address: params.address,
      guardian: params.guardian ?? null,
      joiningDate: params.joiningDate,
      monthlyFee: params.monthlyFee,
      mobileNumber: params.mobileNumber ?? null,
      email: params.email ?? null,
      profilePhotoUrl: params.profilePhotoUrl ?? null,
      fatherName: params.fatherName ?? null,
      motherName: params.motherName ?? null,
      whatsappNumber: params.whatsappNumber ?? null,
      addressText: params.addressText ?? null,
      status: 'ACTIVE',
      statusChangedAt: null,
      statusChangedBy: null,
      statusHistory: [],
      audit: createAuditFields(),
      softDelete: initSoftDelete(),
    });
  }

  static reconstitute(id: string, props: StudentProps): Student {
    return new Student(new UniqueId(id), props);
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  get fullNameNormalized(): string {
    return this.props.fullNameNormalized;
  }

  get dateOfBirth(): Date {
    return this.props.dateOfBirth;
  }

  get gender(): Gender {
    return this.props.gender;
  }

  get address(): StudentAddress {
    return this.props.address;
  }

  get guardian(): StudentGuardian | null {
    return this.props.guardian;
  }

  get joiningDate(): Date {
    return this.props.joiningDate;
  }

  get monthlyFee(): number {
    return this.props.monthlyFee;
  }

  get mobileNumber(): string | null {
    return this.props.mobileNumber;
  }

  get email(): string | null {
    return this.props.email;
  }

  get profilePhotoUrl(): string | null {
    return this.props.profilePhotoUrl;
  }

  get fatherName(): string | null {
    return this.props.fatherName;
  }

  get motherName(): string | null {
    return this.props.motherName;
  }

  get whatsappNumber(): string | null {
    return this.props.whatsappNumber;
  }

  get addressText(): string | null {
    return this.props.addressText;
  }

  get status(): StudentStatus {
    return this.props.status;
  }

  get statusChangedAt(): Date | null {
    return this.props.statusChangedAt;
  }

  get statusChangedBy(): string | null {
    return this.props.statusChangedBy;
  }

  get statusHistory(): StatusHistoryEntry[] {
    return this.props.statusHistory;
  }

  get audit(): AuditFields {
    return this.props.audit;
  }

  get softDelete(): SoftDeleteFields {
    return this.props.softDelete;
  }

  isDeleted(): boolean {
    return this.props.softDelete.deletedAt !== null;
  }
}
