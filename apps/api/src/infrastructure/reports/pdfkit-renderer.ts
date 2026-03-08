import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { PdfRenderer } from '@application/reports/ports/pdf-renderer.port';
import type { MonthlyRevenueSummaryDto } from '@application/reports/dtos/monthly-revenue.dto';
import type { StudentWiseDueItemDto } from '@application/reports/dtos/student-wise-dues.dto';

@Injectable()
export class PdfkitRenderer implements PdfRenderer {
  async renderMonthlyRevenue(month: string, data: MonthlyRevenueSummaryDto): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Title
    doc.fontSize(18).text(`Monthly Revenue Report — ${month}`, { align: 'center' });
    doc.moveDown();

    // Summary
    doc.fontSize(12).text(`Total Revenue: ₹${data.totalAmount.toLocaleString('en-IN')}`);
    doc.text(`Transactions: ${data.transactionCount}`);
    doc.moveDown();

    // Table header
    const startX = 40;
    let y = doc.y;
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Receipt #', startX, y, { width: 90 })
      .text('Student ID', startX + 90, y, { width: 100 })
      .text('Month', startX + 190, y, { width: 70 })
      .text('Amount', startX + 260, y, { width: 70, align: 'right' })
      .text('Source', startX + 340, y, { width: 90 })
      .text('Date', startX + 430, y, { width: 90 });
    y += 16;
    doc
      .moveTo(startX, y)
      .lineTo(startX + 520, y)
      .stroke();
    y += 6;

    // Rows
    doc.font('Helvetica').fontSize(8);
    for (const tx of data.transactions) {
      if (y > 760) {
        doc.addPage();
        y = 40;
      }
      doc
        .text(tx.receiptNumber, startX, y, { width: 90 })
        .text(tx.studentId.slice(0, 12), startX + 90, y, { width: 100 })
        .text(tx.monthKey, startX + 190, y, { width: 70 })
        .text(`₹${tx.amount}`, startX + 260, y, { width: 70, align: 'right' })
        .text(tx.source, startX + 340, y, { width: 90 })
        .text(tx.createdAt.slice(0, 10), startX + 430, y, { width: 90 });
      y += 14;
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async renderPendingDues(month: string, items: StudentWiseDueItemDto[]): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Title
    doc.fontSize(18).text(`Pending Dues Report — ${month}`, { align: 'center' });
    doc.moveDown();

    // Summary
    const totalPending = items.reduce((s, i) => s + i.amount, 0);
    doc.fontSize(12).text(`Students with Dues: ${items.length}`);
    doc.text(`Total Pending: ₹${totalPending.toLocaleString('en-IN')}`);
    doc.moveDown();

    // Table header
    const startX = 40;
    let y = doc.y;
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Student Name', startX, y, { width: 150 })
      .text('Month', startX + 150, y, { width: 70 })
      .text('Amount', startX + 220, y, { width: 80, align: 'right' })
      .text('Status', startX + 310, y, { width: 70 })
      .text('Pending Months', startX + 380, y, { width: 70, align: 'right' })
      .text('Total Pending', startX + 450, y, { width: 70, align: 'right' });
    y += 16;
    doc
      .moveTo(startX, y)
      .lineTo(startX + 520, y)
      .stroke();
    y += 6;

    // Rows
    doc.font('Helvetica').fontSize(8);
    for (const item of items) {
      if (y > 760) {
        doc.addPage();
        y = 40;
      }
      doc
        .text(item.studentName, startX, y, { width: 150 })
        .text(item.monthKey, startX + 150, y, { width: 70 })
        .text(`₹${item.amount}`, startX + 220, y, { width: 80, align: 'right' })
        .text(item.status, startX + 310, y, { width: 70 })
        .text(String(item.pendingMonthsCount), startX + 380, y, { width: 70, align: 'right' })
        .text(`₹${item.totalPendingAmount}`, startX + 450, y, { width: 70, align: 'right' });
      y += 14;
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
