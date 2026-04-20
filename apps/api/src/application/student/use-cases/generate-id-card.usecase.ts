import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import { StudentErrors } from '../../common/errors';
import { PdfGeneratorService } from '@infrastructure/pdf/pdf-generator.service';
import type { UserRole } from '@academyflo/contracts';

export interface GenerateIdCardInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
}

export class GenerateIdCardUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly batchRepo: BatchRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
  ) {}

  async execute(input: GenerateIdCardInput): Promise<Result<{ buffer: Buffer; filename: string }, AppError>> {
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

    // Get batch names
    const assignments = await this.studentBatchRepo.findByStudentId(input.studentId);
    const batchNames: string[] = [];
    for (const a of assignments) {
      const batch = await this.batchRepo.findById(a.batchId);
      if (batch) batchNames.push(batch.batchName);
    }

    try {
      const pdf = new PdfGeneratorService();
      // ID card size: ~242 x 153 points (roughly 85.6mm x 53.98mm)
      const doc = pdf.createDocument({
        pageSize: [340, 215],
        margin: 15,
        landscape: false,
      });

      // Background border
      doc.rect(5, 5, 330, 205).lineWidth(1.5).stroke('#2563eb');

      // Academy header
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#2563eb')
        .text(academyName, 15, 15, { width: 310, align: 'center' });
      doc.moveDown(0.2);
      doc.moveTo(15, doc.y).lineTo(325, doc.y).lineWidth(0.5).stroke('#2563eb');
      doc.moveDown(0.3);

      // Student name
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
        .text(student.fullName, 15, doc.y, { width: 310, align: 'center' });
      doc.moveDown(0.5);

      // Details
      doc.font('Helvetica').fontSize(8).fillColor('#333333');
      const detailY = doc.y;
      const leftCol = 15;

      const addIdField = (label: string, value: string, yPos: number) => {
        doc.font('Helvetica-Bold').text(`${label}:`, leftCol, yPos, { continued: true, width: 310 });
        doc.font('Helvetica').text(` ${value}`);
      };

      let currentY = detailY;
      addIdField('DOB', student.dateOfBirth.toISOString().slice(0, 10), currentY);
      currentY += 14;
      addIdField('Guardian', student.guardian?.name ?? '', currentY);
      currentY += 14;
      addIdField('Contact', student.guardian?.mobile ?? '', currentY);
      currentY += 14;
      if (batchNames.length > 0) {
        const batchText = batchNames.length > 2
          ? batchNames.slice(0, 2).join(', ') + '...'
          : batchNames.join(', ');
        addIdField('Batch', batchText, currentY);
        currentY += 14;
      }
      addIdField('Joining', student.joiningDate.toISOString().slice(0, 10), currentY);

      // Footer
      doc.fontSize(7).fillColor('#666666')
        .text(`ID: ${student.id.toString().slice(0, 8)}`, 15, 190, { width: 150 });

      const buffer = await pdf.toBuffer(doc);
      const safeName = student.fullName.replace(/\s+/g, '_').toLowerCase();
      return ok({ buffer, filename: `idcard_${safeName}.pdf` });
    } catch {
      return err(AppErrorClass.validation('Failed to generate ID card. Please try again.'));
    }
  }
}
