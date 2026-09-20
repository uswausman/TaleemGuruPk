/**
 * TaleemGuru Central Document Branding & Download Service
 * 
 * Centralized Architecture:
 * ┌──────────────────────┐
 * │ Any TaleemGuru File  │
 * └──────────┬───────────┘
 *            ↓
 * ┌──────────────────────┐
 * │ Document Download    │
 * │ / Branding Service   │
 * └──────────┬───────────┘
 *            ↓
 * ┌──────────────────────┐
 * │ TaleemGuru Branding  │
 * └──────────┬───────────┘
 *            ↓
 * ┌──────────────────────┐
 * │ Branded Download     │
 * └──────────────────────┘
 */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { MCQ, StudyNote, PastPaper, TestResult, Certificate } from '../types';
import {
  exportMCQsToWatermarkedPDF,
  exportStudyNoteToPDF,
  exportResultCardToPDF,
  exportCertificateToPDF,
  downloadTextWithWatermark,
  BRAND_URL,
} from '../utils/watermark';

export const BRAND_NAME = 'TaleemGuru.pk';
export const BRAND_FOOTER = '© TaleemGuru.pk | Downloaded from TaleemGuru.pk';
export const BRAND_WEBSITE = 'https://taleemguru.pk';
export const BRAND_KEYWORD = 'TaleemGuru.pk-Branded';

// In-memory client cache to prevent re-processing identical documents during user session
const clientBrandedCache = new Map<string, Blob>();

/**
 * Trigger immediate browser file download from Blob
 */
function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Check if a PDF document already has TaleemGuru branding embedded
 */
export async function isPdfAlreadyBranded(pdfDoc: PDFDocument): Promise<boolean> {
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
  } catch {
    // If metadata read fails, proceed with safe check
  }
  return false;
}

/**
 * Client-side fallback PDF branding processor using pdf-lib
 * Ensures every page gets the unobtrusive professional footer
 */
export async function brandPdfBytes(
  pdfBytes: ArrayBuffer | Uint8Array,
  filename?: string
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  } catch (err: any) {
    throw new Error(`Invalid PDF format: ${err.message || 'Could not parse document'}`);
  }

  // Anti-duplication check: if already branded, return immediately without duplicate footers
  if (await isPdfAlreadyBranded(pdfDoc)) {
    return new Uint8Array(pdfBytes);
  }

  const pages = pdfDoc.getPages();
  const pageCount = pages.length;

  let font;
  let boldFont;
  try {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  } catch {
    // Graceful fallback if font embed encounters issue
  }

  let stampedCount = 0;

  for (let i = 0; i < pageCount; i++) {
    const page = pages[i];
    try {
      const { width, height } = page.getSize();
      const rotation = page.getRotation().angle;

      if (font && boldFont) {
        const fontSize = 7.5;
        const brandText = BRAND_FOOTER;
        const urlText = BRAND_WEBSITE;
        const brandColor = rgb(0.06, 0.43, 0.27); // Forest Green
        const urlColor = rgb(0.4, 0.45, 0.52); // Muted slate
        const lineColor = rgb(0.86, 0.89, 0.92);

        if (rotation === 0) {
          const margin = 32;
          const yBaseline = 12;
          const yLine = 21;

          page.drawLine({
            start: { x: margin, y: yLine },
            end: { x: width - margin, y: yLine },
            thickness: 0.5,
            color: lineColor,
          });

          page.drawText(brandText, {
            x: margin,
            y: yBaseline,
            size: fontSize,
            font: boldFont,
            color: brandColor,
          });

          const urlWidth = font.widthOfTextAtSize(urlText, fontSize);
          page.drawText(urlText, {
            x: width - margin - urlWidth,
            y: yBaseline,
            size: fontSize,
            font,
            color: urlColor,
          });
        } else if (rotation === 90) {
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
            font: boldFont,
            color: brandColor,
            rotate: degrees(90),
          });
        } else {
          page.drawText(brandText, {
            x: 32,
            y: 12,
            size: fontSize,
            font: boldFont,
            color: brandColor,
          });
        }
        stampedCount++;
      }
    } catch {
      // Continue to next page safely
    }
  }

  // If stamping pages was restricted on this PDF, append a dedicated verification credit page
  if (stampedCount === 0 && font && boldFont) {
    try {
      const creditPage = pdfDoc.addPage([595.28, 841.89]);
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

      creditPage.drawText('TALEEM GURU PAKISTAN', {
        x: width / 2 - 120,
        y: height - 100,
        size: 20,
        font: boldFont,
        color: rgb(0.06, 0.43, 0.27),
      });

      creditPage.drawText('Official Verified Academic Curriculum Resource', {
        x: width / 2 - 130,
        y: height - 125,
        size: 11,
        font,
        color: rgb(0.3, 0.35, 0.4),
      });

      creditPage.drawText(BRAND_FOOTER, {
        x: width / 2 - 140,
        y: height - 200,
        size: 13,
        font: boldFont,
        color: rgb(0.1, 0.15, 0.2),
      });

      creditPage.drawText(`Visit ${BRAND_WEBSITE} to practice online tests and access verified resources.`, {
        x: width / 2 - 170,
        y: height - 230,
        size: 10,
        font,
        color: rgb(0.4, 0.45, 0.5),
      });
    } catch {
      // Non-blocking
    }
  }

  // Set anti-duplication metadata
  try {
    pdfDoc.setAuthor('TaleemGuru.pk');
    pdfDoc.setSubject('Downloaded from TaleemGuru.pk');
    pdfDoc.setProducer('TaleemGuru.pk Document Branding Engine v2.0');
    pdfDoc.setCreator(`${BRAND_FOOTER} • ${BRAND_WEBSITE}`);
    const existingKeywords = pdfDoc.getKeywords() || '';
    pdfDoc.setKeywords([BRAND_KEYWORD, 'TaleemGuru.pk', existingKeywords].filter(Boolean));
    pdfDoc.setModificationDate(new Date());
  } catch {
    // Non-blocking
  }

  return await pdfDoc.save();
}

/**
 * Main Centralized Document Branding Service
 */
export const documentBrandingService = {
  /**
   * Universal downloader for ANY document file URL or raw content
   */
  async downloadDocument(request: {
    fileUrl?: string;
    fileData?: Blob | ArrayBuffer | Uint8Array | string;
    filename: string;
    title: string;
    type?: 'pdf' | 'notes' | 'pastPaper' | 'text' | 'document';
    fallbackGenerator?: () => void | Promise<void>;
  }): Promise<void> {
    const { fileUrl, fileData, filename, title, type, fallbackGenerator } = request;
    const sanitizedFilename = filename.endsWith('.pdf') ? filename : `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}_TaleemGuru.pdf`;

    // 1. Check local client cache first
    const cacheKey = fileUrl || `${title}_${filename}`;
    if (clientBrandedCache.has(cacheKey)) {
      const cachedBlob = clientBrandedCache.get(cacheKey)!;
      triggerBrowserDownload(cachedBlob, sanitizedFilename);
      return;
    }

    // 2. If raw file data provided
    if (fileData) {
      if (typeof fileData === 'string') {
        // Plain text / Markdown content
        this.downloadTextFile(sanitizedFilename.replace(/\.pdf$/, ''), title, fileData);
        return;
      }

      try {
        const arrayBuf = fileData instanceof Blob ? await fileData.arrayBuffer() : fileData;
        const brandedBytes = await brandPdfBytes(arrayBuf, sanitizedFilename);
        const brandedBlob = new Blob([brandedBytes], { type: 'application/pdf' });
        clientBrandedCache.set(cacheKey, brandedBlob);
        triggerBrowserDownload(brandedBlob, sanitizedFilename);
        return;
      } catch (err) {
        console.warn('[BrandingService] Error branding raw file data:', err);
      }
    }

    // 3. If fileUrl provided, route through server branding route /api/documents/download or fetch
    if (fileUrl) {
      try {
        // Try server-side branded download endpoint first (ensures secure server proxying and caching)
        const serverDownloadUrl = `/api/documents/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(sanitizedFilename)}`;
        const response = await fetch(serverDownloadUrl);

        if (response.ok) {
          const blob = await response.blob();
          clientBrandedCache.set(cacheKey, blob);
          triggerBrowserDownload(blob, sanitizedFilename);
          return;
        }

        // Fallback: direct fetch and client-side branding
        const directResp = await fetch(fileUrl);
        if (directResp.ok) {
          const buffer = await directResp.arrayBuffer();
          const branded = await brandPdfBytes(buffer, sanitizedFilename);
          const brandedBlob = new Blob([branded], { type: 'application/pdf' });
          clientBrandedCache.set(cacheKey, brandedBlob);
          triggerBrowserDownload(brandedBlob, sanitizedFilename);
          return;
        }
      } catch (fetchErr) {
        console.warn('[BrandingService] Server branding endpoint fetch notice:', fetchErr);
      }
    }

    // 4. If no file URL or fetch fails, run fallback generator
    if (fallbackGenerator) {
      await fallbackGenerator();
      return;
    }

    // Fallback: simple text note
    this.downloadTextFile(sanitizedFilename.replace(/\.pdf$/, ''), title, `Study Material: ${title}`);
  },

  /**
   * Download Past Paper with TaleemGuru Branding
   */
  async downloadPastPaper(paper: PastPaper, options?: { studentName?: string }): Promise<void> {
    const studentName = options?.studentName || 'Student';
    const paperFileUrl = paper.fileUrl || paper.pdfUrl;

    if (paperFileUrl) {
      await this.downloadDocument({
        fileUrl: paperFileUrl,
        filename: `${paper.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${paper.year}_TaleemGuru.pdf`,
        title: paper.title,
        type: 'pastPaper',
        fallbackGenerator: () => {
          exportMCQsToWatermarkedPDF(
            paper.title,
            `${paper.board} • ${paper.classLevel} • ${paper.subject} (${paper.year})`,
            paper.questions || [],
            { includeAnswers: true, studentName }
          );
        },
      });
      return;
    }

    // Dynamic generation with TaleemGuru branding
    exportMCQsToWatermarkedPDF(
      paper.title,
      `${paper.board} • ${paper.classLevel} • ${paper.subject} (${paper.year})`,
      paper.questions || [],
      { includeAnswers: true, studentName }
    );
  },

  /**
   * Download Study Note with TaleemGuru Branding
   */
  async downloadStudyNote(note: StudyNote, options?: { studentName?: string }): Promise<void> {
    const noteFileUrl = note.pdfUrl || note.fileUrl;

    if (noteFileUrl) {
      await this.downloadDocument({
        fileUrl: noteFileUrl,
        filename: `${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Notes_TaleemGuru.pdf`,
        title: note.title,
        type: 'notes',
        fallbackGenerator: () => {
          exportStudyNoteToPDF(note);
        },
      });
      return;
    }

    // Dynamic generation with TaleemGuru branding
    exportStudyNoteToPDF(note);
  },

  /**
   * Download Question Bank / Mock Exam Questions with TaleemGuru Branding
   */
  downloadMCQs(
    title: string,
    category: string,
    mcqs: MCQ[],
    options?: { includeAnswers?: boolean; studentName?: string }
  ): void {
    exportMCQsToWatermarkedPDF(title, category, mcqs, options);
  },

  /**
   * Download Official Result Card PDF with TaleemGuru Branding
   */
  downloadResultCard(result: TestResult, studentName = 'Student'): void {
    exportResultCardToPDF(result, studentName);
  },

  /**
   * Download Official Certificate PDF with TaleemGuru Branding
   */
  downloadCertificate(
    cert: Certificate | (Partial<Certificate> & {
      studentName: string;
      testName: string;
      score: number;
      totalMarks: number;
      percentage: number;
      grade: string;
    })
  ): void {
    exportCertificateToPDF(cert);
  },

  /**
   * Download Plain Text or Markdown file with TaleemGuru Header & Footer
   */
  downloadTextFile(filename: string, title: string, content: string): void {
    downloadTextWithWatermark(filename, title, content);
  },
};
