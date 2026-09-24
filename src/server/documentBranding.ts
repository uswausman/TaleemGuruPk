import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export const TALEEM_TAGLINE = 'Learn. Practice. Test. Improve.';
export const TALEEM_BRAND_FOOTER = '© TaleemGuru.pk | Learn. Practice. Test. Improve. | https://taleemguru.pk';
export const TALEEM_WEBSITE_URL = 'https://taleemguru.pk';
export const TALEEM_BRAND_KEYWORD = 'TaleemGuru.pk-Branded';
export const TALEEM_PRODUCER_STRING = 'TaleemGuru.pk Document Branding Engine v2.0';

// In-memory cache for ultra-fast serving of already branded documents
const memoryCache = new Map<string, { buffer: Buffer; mimeType: string; timestamp: number }>();

// Optional disk cache directory for persistence across restarts
const CACHE_DIR = path.join(process.cwd(), '.cache', 'branded_docs');
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch {
  // Ignore filesystem permission errors in sandboxes
}

/**
 * Compute SHA-256 hash of a buffer or URL string
 */
export function computeHash(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Check if a PDFDocument is already branded with TaleemGuru credentials
 */
export function isPdfDocumentAlreadyBranded(pdfDoc: PDFDocument): boolean {
  try {
    const keywords = pdfDoc.getKeywords();
    if (keywords && keywords.toLowerCase().includes('taleemguru')) {
      return true;
    }
    const producer = pdfDoc.getProducer();
    if (producer && producer.toLowerCase().includes('taleemguru')) {
      return true;
    }
    const creator = pdfDoc.getCreator();
    if (creator && creator.toLowerCase().includes('taleemguru')) {
      return true;
    }
    const title = pdfDoc.getTitle();
    if (title && title.toLowerCase().includes('taleemguru branded')) {
      return true;
    }
  } catch (err) {
    console.warn('[Branding] Error reading PDF metadata:', err);
  }
  return false;
}

/**
 * Brand any existing PDF buffer with TaleemGuru footer credit
 * Guarantees idempotency (anti-duplication) and preserves original quality
 */
export async function brandPdfBuffer(
  inputBuffer: Buffer,
  options?: { title?: string; docRef?: string; forceRebrand?: boolean }
): Promise<{ buffer: Buffer; wasAlreadyBranded: boolean; pageCount: number }> {
  const hash = computeHash(inputBuffer);

  // Check memory cache first
  const cached = memoryCache.get(hash);
  if (cached && !options?.forceRebrand) {
    return { buffer: cached.buffer, wasAlreadyBranded: true, pageCount: 0 };
  }

  // Check disk cache if available
  const diskPath = path.join(CACHE_DIR, `${hash}.pdf`);
  if (fs.existsSync(diskPath) && !options?.forceRebrand) {
    try {
      const diskBuffer = fs.readFileSync(diskPath);
      memoryCache.set(hash, { buffer: diskBuffer, mimeType: 'application/pdf', timestamp: Date.now() });
      return { buffer: diskBuffer, wasAlreadyBranded: true, pageCount: 0 };
    } catch {
      // Fall through to process
    }
  }

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  } catch (loadErr: any) {
    throw new Error(`Failed to parse PDF document: ${loadErr.message || 'Invalid PDF structure'}`);
  }

  // 1. Anti-duplication check: do NOT brand if already branded
  if (!options?.forceRebrand && isPdfDocumentAlreadyBranded(pdfDoc)) {
    // Store in cache as already clean
    memoryCache.set(hash, { buffer: inputBuffer, mimeType: 'application/pdf', timestamp: Date.now() });
    return { buffer: inputBuffer, wasAlreadyBranded: true, pageCount: pdfDoc.getPageCount() };
  }

  const pages = pdfDoc.getPages();
  const pageCount = pages.length;

  let helveticaFont;
  let helveticaBoldFont;
  try {
    helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  } catch {
    // If standard font embed fails, fallback gracefully
  }

  let stampedPagesCount = 0;

  for (let i = 0; i < pageCount; i++) {
    const page = pages[i];
    try {
      const { width, height } = page.getSize();
      const rotation = page.getRotation().angle;

      if (helveticaFont && helveticaBoldFont) {
        const fontSize = 7.5;
        const brandText = TALEEM_BRAND_FOOTER;
        const urlText = TALEEM_WEBSITE_URL;
        const brandColor = rgb(0.06, 0.43, 0.27); // #106e44 Forest Green
        const urlColor = rgb(0.4, 0.45, 0.52); // Muted slate
        const lineColor = rgb(0.86, 0.89, 0.92);

        // Position coordinates based on rotation
        if (rotation === 0) {
          const margin = 32;
          const yBaseline = 12;
          const yLine = 21;

          // Subtle hairline border
          page.drawLine({
            start: { x: margin, y: yLine },
            end: { x: width - margin, y: yLine },
            thickness: 0.5,
            color: lineColor,
          });

          // Brand footer text
          page.drawText(brandText, {
            x: margin,
            y: yBaseline,
            size: fontSize,
            font: helveticaBoldFont,
            color: brandColor,
          });

          const urlWidth = helveticaFont.widthOfTextAtSize(urlText, fontSize);
          page.drawText(urlText, {
            x: width - margin - urlWidth,
            y: yBaseline,
            size: fontSize,
            font: helveticaFont,
            color: urlColor,
          });
        } else if (rotation === 90) {
          // Rotated 90 degrees clockwise
          const margin = 32;
          const xBaseline = width - 12;
          const xLine = width - 21;

          page.drawLine({
            start: { x: xLine, y: margin },
            end: { x: xLine, y: height - margin },
            thickness: 0.5,
            color: lineColor,
          });

          page.drawText(brandText, {
            x: xBaseline,
            y: margin,
            size: fontSize,
            font: helveticaBoldFont,
            color: brandColor,
            rotate: degrees(90),
          });
        } else {
          // For other rotations, fallback to default bottom margin
          page.drawText(brandText, {
            x: 32,
            y: 12,
            size: fontSize,
            font: helveticaBoldFont,
            color: brandColor,
          });
        }
        stampedPagesCount++;
      }
    } catch (pageErr) {
      console.warn(`[Branding] Failed to stamp page ${i + 1}:`, pageErr);
    }
  }

  // If stamping pages was not possible (e.g. protected layout), append a dedicated TaleemGuru verification credit page
  if (stampedPagesCount === 0) {
    try {
      const creditPage = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = creditPage.getSize();

      creditPage.drawRectangle({
        x: 20,
        y: 20,
        width: width - 40,
        height: height - 40,
        borderColor: rgb(0.06, 0.43, 0.27),
        borderWidth: 1.5,
        color: rgb(0.98, 0.99, 0.98),
      });

      if (helveticaBoldFont && helveticaFont) {
        creditPage.drawText('TALEEM GURU PAKISTAN', {
          x: width / 2 - 120,
          y: height - 100,
          size: 20,
          font: helveticaBoldFont,
          color: rgb(0.06, 0.43, 0.27),
        });

        creditPage.drawText('Learn. Practice. Test. Improve.', {
          x: width / 2 - 100,
          y: height - 125,
          size: 12,
          font: helveticaBoldFont,
          color: rgb(0.3, 0.35, 0.4),
        });

        creditPage.drawText(TALEEM_BRAND_FOOTER, {
          x: width / 2 - 150,
          y: height - 200,
          size: 11,
          font: helveticaBoldFont,
          color: rgb(0.1, 0.15, 0.2),
        });

        creditPage.drawText(`Visit ${TALEEM_WEBSITE_URL} for past papers, practice tests, and study notes.`, {
          x: width / 2 - 165,
          y: height - 230,
          size: 10,
          font: helveticaFont,
          color: rgb(0.4, 0.45, 0.5),
        });
      }
    } catch (creditPageErr) {
      console.warn('[Branding] Failed to append credit page:', creditPageErr);
    }
  }

  // 3. Mark document metadata for anti-duplication
  try {
    pdfDoc.setAuthor('TaleemGuru.pk');
    pdfDoc.setSubject('Downloaded from TaleemGuru.pk');
    pdfDoc.setProducer(TALEEM_PRODUCER_STRING);
    pdfDoc.setCreator(`${TALEEM_BRAND_FOOTER} • ${TALEEM_WEBSITE_URL}`);
    const currentKeywords = pdfDoc.getKeywords() || '';
    pdfDoc.setKeywords([TALEEM_BRAND_KEYWORD, 'TaleemGuru.pk', 'Academic Study Material', currentKeywords].filter(Boolean));
    pdfDoc.setModificationDate(new Date());
  } catch (metaErr) {
    console.warn('[Branding] Could not update PDF metadata:', metaErr);
  }

  const brandedBytes = await pdfDoc.save();
  const outputBuffer = Buffer.from(brandedBytes);

  // Store in memory cache
  memoryCache.set(hash, { buffer: outputBuffer, mimeType: 'application/pdf', timestamp: Date.now() });

  // Store in disk cache
  try {
    fs.writeFileSync(diskPath, outputBuffer);
  } catch {
    // Non-blocking disk write
  }

  return {
    buffer: outputBuffer,
    wasAlreadyBranded: false,
    pageCount,
  };
}

/**
 * Apply TaleemGuru branding to plain text or markdown content
 */
export function brandTextContent(content: string, title?: string): string {
  if (content.includes('TaleemGuru.pk') && content.includes(TALEEM_TAGLINE)) {
    return content; // Already branded
  }

  const header = `================================================================================
                    ★ TALEEM GURU PAKISTAN ★
                 Learn. Practice. Test. Improve.
                      ${TALEEM_WEBSITE_URL}
================================================================================
DOCUMENT: ${title || 'Academic Study Material'}
SOURCE: ${TALEEM_BRAND_FOOTER}
WEBSITE: ${TALEEM_WEBSITE_URL}
COPYRIGHT: © ${new Date().getFullYear()} TaleemGuru.pk. All rights reserved.
================================================================================

`;

  const footer = `

================================================================================
${TALEEM_BRAND_FOOTER}
Online testing, past papers, notes & exam preparation: ${TALEEM_WEBSITE_URL}
================================================================================`;

  return `${header}${content.trim()}${footer}`;
}
