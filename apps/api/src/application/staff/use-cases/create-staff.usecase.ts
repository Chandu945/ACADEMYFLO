import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { User } from '@domain/identity/entities/user.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { PasswordHasher } from '../../identity/ports/password-hasher.port';
import { canManageStaff } from '@domain/identity/rules/staff.rules';
import { AuthErrors, StaffErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type { StaffQualificationInfo, StaffSalaryConfig } from '@domain/identity/entities/user.entity';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { renderStaffWelcomeEmail } from '../../notifications/templates/staff-welcome-template';
import { randomUUID } from 'crypto';

export interface CreateStaffInput {
  ownerUserId: string;
  ownerRole: UserRole;
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  startDate?: Date | null;
  gender?: 'MALE' | 'FEMALE' | null;
  whatsappNumber?: string | null;
  mobileNumber?: string | null;
  address?: string | null;
  qualificationInfo?: StaffQualificationInfo | null;
  salaryConfig?: StaffSalaryConfig | null;
  profilePhotoUrl?: string | null;
}

export interface CreateStaffOutput {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  academyId: string;
  startDate: Date | null;
  gender: 'MALE' | 'FEMALE' | null;
  whatsappNumber: string | null;
  mobileNumber: string | null;
  address: string | null;
  qualificationInfo: StaffQualificationInfo | null;
  salaryConfig: StaffSalaryConfig | null;
  profilePhotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateStaffUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly academyRepo?: AcademyRepository,
    private readonly emailSender?: EmailSenderPort,
  ) {}

  async execute(input: CreateStaffInput): Promise<Result<CreateStaffOutput, AppError>> {
    const check = canManageStaff(input.ownerRole);
    if (!check.allowed) {
      return err(AuthErrors.notOwner());
    }

    const owner = await this.userRepo.findById(input.ownerUserId);
    if (!owner || !owner.academyId) {
      return err(StaffErrors.academyRequired());
    }

    const existingByEmail = await this.userRepo.findByEmail(input.email.trim().toLowerCase());
    if (existingByEmail) {
      return err(AuthErrors.duplicateEmail());
    }

    const existingByPhone = await this.userRepo.findByPhone(input.phoneNumber.trim());
    if (existingByPhone) {
      return err(AuthErrors.duplicatePhone());
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const staffId = randomUUID();

    const staff = User.create({
      id: staffId,
      fullName: input.fullName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      role: 'STAFF',
      passwordHash,
    });

    // Reconstitute with academyId and extended fields set
    const staffWithAcademy = User.reconstitute(staffId, {
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      status: staff.status,
      passwordHash: staff.passwordHash,
      academyId: owner.academyId,
      tokenVersion: staff.tokenVersion,
      audit: staff.audit,
      softDelete: staff.softDelete,
      startDate: input.startDate ?? null,
      gender: input.gender ?? null,
      whatsappNumber: input.whatsappNumber ?? null,
      mobileNumber: input.mobileNumber ?? null,
      address: input.address ?? null,
      qualificationInfo: input.qualificationInfo ?? null,
      salaryConfig: input.salaryConfig ?? null,
      profilePhotoUrl: input.profilePhotoUrl ?? null,
    });

    try {
      await this.userRepo.save(staffWithAcademy);
    } catch (error) {
      // Catches the E11000 window between findByEmail/findByPhone and save()
      // — the Mongo unique index on email/phone is the authoritative guard.
      const err11000 = error as { code?: number; keyPattern?: Record<string, unknown> };
      if (err11000?.code === 11000) {
        const keys = err11000.keyPattern ?? {};
        if ('emailNormalized' in keys || 'email' in keys) {
          return err(AuthErrors.duplicateEmail());
        }
        return err(AuthErrors.duplicatePhone());
      }
      throw error;
    }

    await this.auditRecorder.record({
      academyId: owner.academyId,
      actorUserId: input.ownerUserId,
      action: 'STAFF_CREATED',
      entityType: 'USER',
      entityId: staffId,
      context: {
        staffName: staffWithAcademy.fullName,
        email: staffWithAcademy.emailNormalized,
      },
    });

    // Fire-and-forget: send welcome email to new staff
    if (this.academyRepo && this.emailSender) {
    const academy = await this.academyRepo.findById(owner.academyId!);
    const academyName = academy?.academyName ?? 'Your Academy';
    this.emailSender
      .send({
        to: staffWithAcademy.emailNormalized,
        subject: `Welcome to ${academyName} - Staff Account Created`,
        html: renderStaffWelcomeEmail({
          staffName: staffWithAcademy.fullName,
          academyName,
          loginEmail: staffWithAcademy.emailNormalized,
          loginPhone: staffWithAcademy.phoneE164,
        }),
      })
      .catch(() => {/* best-effort */});
    }

    return ok({
      id: staffWithAcademy.id.toString(),
      fullName: staffWithAcademy.fullName,
      email: staffWithAcademy.emailNormalized,
      phoneNumber: staffWithAcademy.phoneE164,
      role: staffWithAcademy.role,
      status: staffWithAcademy.status,
      academyId: owner.academyId,
      startDate: staffWithAcademy.startDate,
      gender: staffWithAcademy.gender,
      whatsappNumber: staffWithAcademy.whatsappNumber,
      mobileNumber: staffWithAcademy.mobileNumber,
      address: staffWithAcademy.address,
      qualificationInfo: staffWithAcademy.qualificationInfo,
      salaryConfig: staffWithAcademy.salaryConfig,
      profilePhotoUrl: staffWithAcademy.profilePhotoUrl,
      createdAt: staffWithAcademy.audit.createdAt,
      updatedAt: staffWithAcademy.audit.updatedAt,
    });
  }
}
