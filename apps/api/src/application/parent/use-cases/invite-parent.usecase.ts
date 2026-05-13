import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { User } from '@domain/identity/entities/user.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { PasswordHasher } from '../../identity/ports/password-hasher.port';
import { canInviteParent } from '@domain/parent/rules/parent.rules';
import { ParentStudentLink } from '@domain/parent/entities/parent-student-link.entity';
import { AuthErrors, ParentErrors, StudentErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderParentInviteEmail } from '../../notifications/templates/parent-invite-template';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { randomUUID } from 'crypto';

export interface InviteParentInput {
  ownerUserId: string;
  ownerRole: UserRole;
  studentId: string;
}

export interface InviteParentOutput {
  parentId: string;
  tempPassword: string;
  studentId: string;
  parentEmail: string;
  isExistingUser: boolean;
}

export class InviteParentUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly emailSender?: EmailSenderPort,
    /**
     * Records PARENT_INVITED in the audit feed (M3 parent-flows audit fix).
     * The temp password is never logged — only the (parentId, studentId,
     * isExistingUser) facts so owners can answer "who linked Rahul to my
     * son in May?" from the audit feed alone. Optional so legacy fixtures
     * keep compiling.
     */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: InviteParentInput): Promise<Result<InviteParentOutput, AppError>> {
    const check = canInviteParent(input.ownerRole);
    if (!check.allowed) return err(ParentErrors.inviteNotAllowed());

    const owner = await this.userRepo.findById(input.ownerUserId);
    if (!owner || !owner.academyId) return err(StudentErrors.academyRequired());

    const student = await this.studentRepo.findById(input.studentId);
    if (!student) return err(StudentErrors.notFound(input.studentId));
    if (student.academyId !== owner.academyId) return err(StudentErrors.notInAcademy());

    const guardian = student.guardian;
    // Email: prefer guardian.email, fall back to student.email (Contact Information field)
    let parentEmail = (guardian?.email || student.email || '').trim().toLowerCase();

    // If no email, generate a dummy login email based on student name.
    //
    // L1 fix: previously used a 4-digit random suffix (9000 options),
    // which hit birthday-paradox collision at ~95 same-name students per
    // academy. The Mongo unique-email index would catch the collision
    // (11000), but the use case didn't handle it cleanly. Switched to an
    // 8-hex-char suffix from randomUUID (~4 billion options) — collision
    // is now effectively impossible at any realistic scale.
    if (!parentEmail) {
      const cleanName = student.fullName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      const suffix = randomUUID().replace(/-/g, '').slice(0, 8);
      parentEmail = `${cleanName}_${suffix}@academyflo.com`;
    }

    const guardianPhone = (guardian?.mobile || '').trim();
    const guardianName = (guardian?.name || student.fullName || '').trim();

    // Check if user with this email already exists
    const existingUser = await this.userRepo.findByEmail(parentEmail);

    let parentUserId: string;
    let tempPassword = '';
    let isExistingUser = false;

    if (existingUser) {
      if (existingUser.role !== 'PARENT') {
        return err(AuthErrors.duplicateEmail());
      }
      parentUserId = existingUser.id.toString();
      isExistingUser = true;
    } else {
      // Check phone uniqueness only if phone is provided
      if (guardianPhone) {
        const existingByPhone = await this.userRepo.findByPhone(guardianPhone);
        if (existingByPhone) return err(AuthErrors.duplicatePhone());
      }

      // L3 fix: extend temp password from 8 hex chars (32 bits of entropy
      // — brute-forceable on modern hardware) to 16 hex chars (64 bits).
      // The password is emailed to the parent who logs in once and resets,
      // so we don't need symbol/case complexity — just enough entropy that
      // the one-time use window is safe.
      tempPassword = randomUUID().replace(/-/g, '').slice(0, 16);
      const passwordHash = await this.passwordHasher.hash(tempPassword);
      parentUserId = randomUUID();

      // User.create requires a valid E.164 phone — generate a placeholder
      // if guardian didn't provide one. The parent can update it later.
      //
      // L2 fix: previously used `Date.now().slice(-10)` which produced the
      // same number for two invites in the same millisecond → 11000
      // collision. Switched to randomUUID-derived digits — collision
      // probability is now ~1 in 10^9 instead of ~100% under load.
      // The leading "9" makes the placeholder a valid Indian mobile
      // (must start with 6/7/8/9 per TRAI).
      const phoneForAccount =
        guardianPhone || `+919${randomUUID().replace(/\D/g, '').slice(0, 9).padEnd(9, '0')}`;

      const parent = User.create({
        id: parentUserId,
        fullName: guardianName,
        email: parentEmail,
        phoneNumber: phoneForAccount,
        role: 'PARENT',
        passwordHash,
      });

      // Set academyId
      const parentWithAcademy = User.reconstitute(parentUserId, {
        fullName: parent.fullName,
        email: parent.email,
        phone: parent.phone,
        role: parent.role,
        status: parent.status,
        passwordHash: parent.passwordHash,
        academyId: owner.academyId,
        tokenVersion: parent.tokenVersion,
        audit: parent.audit,
        softDelete: parent.softDelete,
      });

      await this.userRepo.save(parentWithAcademy);
    }

    // Idempotent retry: if the same (parent, student) link already exists,
    // return a successful no-op instead of failing. Owners routinely double-
    // click "Invite Parent" and the previous error response made retries
    // look broken. We intentionally don't resend credentials — the parent
    // already received them (or has changed the password), and rotating the
    // password on every retry would lock them out.
    const existingLink = await this.linkRepo.findByParentAndStudent(parentUserId, input.studentId);
    if (existingLink) {
      return ok({
        parentId: parentUserId,
        tempPassword: '',
        studentId: input.studentId,
        parentEmail,
        isExistingUser: true,
      });
    }

    // Create link
    const link = ParentStudentLink.create({
      id: randomUUID(),
      parentUserId,
      studentId: input.studentId,
      academyId: owner.academyId,
    });
    await this.linkRepo.save(link);

    // Fire-and-forget: send welcome email with credentials to new parents
    // Skip for dummy @academyflo.com emails — no real inbox
    const isDummyEmail = parentEmail.endsWith('@academyflo.com');
    if (tempPassword && parentEmail && !isDummyEmail && this.emailSender) {
      const academy = await this.academyRepo.findById(owner.academyId!);
      const academyName = academy?.academyName ?? 'Your Academy';
      this.emailSender
        .send({
          to: parentEmail,
          subject: `Welcome to ${academyName} - Your Login Credentials`,
          html: renderParentInviteEmail({
            parentName: guardianName,
            studentName: student.fullName,
            academyName,
            loginEmail: parentEmail,
            tempPassword,
          }),
        })
        .catch(() => {
          /* best-effort — credentials also returned in API response */
        });
    }

    // M3 fix (parent-flows audit): record the link creation. Skipped on the
    // idempotent retry path above so a double-click doesn't produce two
    // audit rows for one link. The tempPassword is intentionally excluded
    // from the audit context — it goes only in the API response (where the
    // owner needs to see it once to share with the parent) and the email
    // body. Recording it in the audit feed would defeat the rotation.
    if (this.auditRecorder) {
      await this.auditRecorder
        .record({
          academyId: owner.academyId,
          actorUserId: input.ownerUserId,
          action: 'PARENT_INVITED',
          entityType: 'PARENT_STUDENT_LINK',
          entityId: link.id.toString(),
          context: {
            parentUserId,
            studentId: input.studentId,
            isExistingUser: String(isExistingUser),
            // Track whether a real email was used vs. a placeholder so support
            // can quickly tell which parents won't get the invite email.
            hasRealEmail: String(!parentEmail.endsWith('@academyflo.com')),
          },
        })
        .catch(() => {});
    }

    return ok({
      parentId: parentUserId,
      tempPassword,
      studentId: input.studentId,
      parentEmail,
      isExistingUser,
    });
  }
}
