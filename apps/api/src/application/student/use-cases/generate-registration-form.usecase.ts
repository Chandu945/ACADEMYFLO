import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { StudentErrors } from '../../common/errors';
import { PdfGeneratorService } from '@infrastructure/pdf/pdf-generator.service';
import type { UserRole } from '@playconnect/contracts';

export interface GenerateRegistrationFormInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
}

export class GenerateRegistrationFormUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly academyRepo: AcademyRepository,
  ) {}

  async execute(input: GenerateRegistrationFormInput): Promise<Result<{ buffer: Buffer; filename: string }, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(StudentErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) return err(StudentErrors.academyRequired());

    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) return err(StudentErrors.notFound(input.studentId));
    if (student.academyId !== actor.academyId) return err(StudentErrors.notInAcademy());

    const academy = await this.academyRepo.findById(actor.academyId);
    const academyName = academy?.academyName ?? 'Academy';
    const instituteInfo = academy?.instituteInfo;
    try {
      const pdf = new PdfGeneratorService();
      const doc = pdf.createDocument();

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text(academyName, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica').text('Registration Form', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      const addSection = (title: string) => {
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica-Bold').text(title);
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(10);
      };

      const addField = (label: string, value: string | null | undefined) => {
        doc.text(`${label}: ${value ?? '—'}`);
      };

      // Personal Details
      addSection('Personal Details');
      addField('Full Name', student.fullName);
      addField('Father Name', student.fatherName);
      addField('Mother Name', student.motherName);
      addField('Date of Birth', student.dateOfBirth.toISOString().slice(0, 10));
      addField('Gender', student.gender);
      // Contact Information
      addSection('Contact Information');
      addField('Mobile', student.mobileNumber);
      addField('WhatsApp', student.whatsappNumber);
      addField('Email', student.email);
      addField('Address', student.addressText ?? [
        student.address.line1,
        student.address.line2,
        student.address.city,
        `${student.address.state} - ${student.address.pincode}`,
      ].filter(Boolean).join(', '));

      // Guardian Information
      addSection('Guardian Information');
      addField('Guardian Name', student.guardian?.name);
      addField('Guardian Mobile', student.guardian?.mobile);
      addField('Guardian Email', student.guardian?.email);

      // Enrollment Details
      addSection('Enrollment Details');
      addField('Joining Date', student.joiningDate.toISOString().slice(0, 10));
      addField('Monthly Fee', `₹${student.monthlyFee}`);
      addField('Status', student.status);

      // Payment Information (from Institute Info)
      if (instituteInfo?.bankDetails || instituteInfo?.upiId) {
        addSection('Payment Information');
        if (instituteInfo.bankDetails) {
          addField('Account Holder', instituteInfo.bankDetails.accountHolderName);
          addField('Account Number', instituteInfo.bankDetails.accountNumber);
          addField('IFSC Code', instituteInfo.bankDetails.ifscCode);
          addField('Bank Name', instituteInfo.bankDetails.bankName);
          addField('Branch', instituteInfo.bankDetails.branchName);
        }
        if (instituteInfo.upiId) {
          addField('UPI ID', instituteInfo.upiId);
        }
      }

      // Signature section
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(200, doc.y).stroke();
      doc.text('Student/Guardian Signature', 50, doc.y + 5);

      doc.moveTo(350, doc.y - 5).lineTo(545, doc.y - 5).stroke();
      doc.text('Authorized Signature', 350, doc.y);

      // Footer
      doc.moveDown(1);
      doc.fontSize(8).fillColor('#888888')
        .text(`Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, { align: 'center' });

      const buffer = await pdf.toBuffer(doc);
      const safeName = student.fullName.replace(/\s+/g, '_').toLowerCase();
      return ok({ buffer, filename: `registration_${safeName}.pdf` });
    } catch {
      return err(AppErrorClass.validation('Failed to generate registration form. Please try again.'));
    }
  }
}
