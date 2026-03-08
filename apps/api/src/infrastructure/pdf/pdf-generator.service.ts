import PDFDocument from 'pdfkit';

export interface PdfOptions {
  pageSize?: 'A4' | 'A5' | [number, number];
  landscape?: boolean;
  margin?: number;
}

export class PdfGeneratorService {
  createDocument(options?: PdfOptions): typeof PDFDocument.prototype {
    const size = options?.pageSize ?? 'A4';
    const doc = new PDFDocument({
      size,
      layout: options?.landscape ? 'landscape' : 'portrait',
      margin: options?.margin ?? 50,
      bufferPages: true,
    });
    return doc;
  }

  async toBuffer(doc: typeof PDFDocument.prototype): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }
}
