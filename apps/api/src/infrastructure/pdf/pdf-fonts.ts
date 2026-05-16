/**
 * Shared TTF font setup for every PDF the API produces.
 *
 * PDFKit's built-in Helvetica is WinAnsi-encoded and lacks glyphs for ₹
 * (U+20B9) and other non-Latin characters — when asked to render them it
 * substitutes a fallback that visually reads as "¹". We embed NotoSans (SIL
 * OFL) which has full Unicode coverage including the Indian Rupee symbol.
 *
 * The TTFs live in `apps/api/assets/fonts` at source and are copied into
 * `dist/assets/fonts` by the nest-cli asset rule. Resolving from __dirname
 * works for both dev (src/) and prod (dist/) because the file `pdf-fonts.ts`
 * sits two levels below the assets dir in either layout.
 */
import * as path from 'node:path';

const FONT_DIR = path.resolve(__dirname, '../../assets/fonts');

export const FONT_REGULAR_PATH = path.join(FONT_DIR, 'NotoSans-Regular.ttf');
export const FONT_BOLD_PATH = path.join(FONT_DIR, 'NotoSans-Bold.ttf');

/** PDFKit font names (registered per-document via registerFonts). */
export const FONT_NAME = 'AppSans';
export const FONT_NAME_BOLD = 'AppSans-Bold';

/**
 * Register the embedded fonts on a PDFKit document and set the default to
 * regular. Call once right after `new PDFDocument()`.
 */
export function registerFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(FONT_NAME, FONT_REGULAR_PATH);
  doc.registerFont(FONT_NAME_BOLD, FONT_BOLD_PATH);
  doc.font(FONT_NAME);
}
