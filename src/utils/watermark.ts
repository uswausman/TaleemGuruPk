import { jsPDF } from 'jspdf';
import { MCQ, TestResult, StudyNote, PastPaper, Certificate } from '../types';
import { TALEEMGURU_LOGO_BASE64 } from './logoBase64';

export const BRAND_NAME = 'TaleemGuru.pk';
export const BRAND_TAGLINE = 'Learn. Practice. Test. Improve.';
export const BRAND_URL = 'https://taleemguru.pk';

/**
 * Draws clean header and footer branding across a jsPDF page (without obstructing watermarks)
 */
function applyWatermarkToPDF(doc: jsPDF, _watermarkText?: string) {
  const pageCount = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();

    // Top Header Banner
    doc.setFillColor(16, 110, 68); // Taleem Guru Forest Green
    doc.rect(0, 0, width, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`TaleemGuru.pk  |  ${BRAND_TAGLINE}`, 14, 9);
    doc.setFont('helvetica', 'normal');
    doc.text(`TaleemGuru.pk  •  https://taleemguru.pk`, width - 14, 9, { align: 'right' });

    // Bottom Footer Banner
    doc.setFillColor(245, 247, 248);
    doc.rect(0, height - 12, width, 12, 'F');
    doc.setDrawColor(220, 226, 230);
    doc.line(0, height - 12, width, height - 12);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.text(
      `© TaleemGuru.pk | Learn. Practice. Test. Improve. | https://taleemguru.pk`,
      14,
      height - 4.5
    );
    doc.text(`Page ${i} of ${pageCount}`, width - 14, height - 4.5, { align: 'right' });

    doc.restoreGraphicsState();
  }

  doc.setProperties({
    title: 'TaleemGuru Educational Document',
    author: 'TaleemGuru.pk',
    subject: 'Downloaded from TaleemGuru.pk',
    creator: 'TaleemGuru.pk Academic Document System',
    keywords: 'TaleemGuru, TaleemGuru.pk, Educational Resource',
  });
}

/**
 * Export Test / Past Paper MCQs as a Watermarked PDF
 */
export function exportMCQsToWatermarkedPDF(
  title: string,
  category: string,
  mcqs: MCQ[],
  options?: { includeAnswers?: boolean; studentName?: string }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 24;

  // Title Box
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const metadataText = `Category: ${category}  •  Total Questions: ${mcqs.length}  •  Date: ${new Date().toLocaleDateString('en-GB')}  •  Ref: TG-DOC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  doc.text(metadataText, 14, y);
  y += 4;

  if (options?.studentName) {
    doc.text(`Candidate Name: ${options.studentName}`, 14, y);
    y += 4;
  }

  doc.setDrawColor(16, 110, 68);
  doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  y += 7;

  // MCQs Loop
  mcqs.forEach((mcq, idx) => {
    // Check page overflow
    if (y > 255) {
      doc.addPage();
      y = 22;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);

    const qText = `Q${idx + 1}. ${mcq.question}`;
    const splitQ = doc.splitTextToSize(qText, pageWidth - 28);
    doc.text(splitQ, 14, y);
    y += splitQ.length * 5 + 1;

    // Options
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    const optLabels = ['(A)', '(B)', '(C)', '(D)'];
    mcq.options.forEach((opt, optIdx) => {
      if (y > 268) {
        doc.addPage();
        y = 22;
      }
      const isCorrect = options?.includeAnswers && optIdx === mcq.correctAnswer;
      if (isCorrect) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 110, 68);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
      }

      const optText = `${optLabels[optIdx]} ${opt} ${isCorrect ? '  ✓ [Correct Answer]' : ''}`;
      const splitOpt = doc.splitTextToSize(optText, pageWidth - 32);
      doc.text(splitOpt, 18, y);
      y += splitOpt.length * 4.2 + 0.8;
    });

    if (options?.includeAnswers && mcq.explanation) {
      if (y > 265) {
        doc.addPage();
        y = 22;
      }
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const expText = `Explanation: ${mcq.explanation}`;
      const splitExp = doc.splitTextToSize(expText, pageWidth - 32);
      doc.text(splitExp, 18, y);
      y += splitExp.length * 4 + 2;
    }

    y += 3; // spacing between questions
  });

  applyWatermarkToPDF(doc);
  doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}_TaleemGuru.pdf`);
}

/**
 * Export Study Note to Watermarked PDF
 */
export function exportStudyNoteToPDF(note: StudyNote) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 24;

  doc.setTextColor(16, 110, 68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${note.subject.toUpperCase()}  •  ${note.classLevel.toUpperCase()}  •  ${note.type.toUpperCase()}`, 14, y);
  y += 6;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.text(note.title, 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Chapter: ${note.chapter}  •  Estimated Read: ${note.readTime}  •  Verified Study Material`, 14, y);
  y += 4;

  doc.setDrawColor(16, 110, 68);
  doc.setLineWidth(0.6);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Body content
  const content = note.fullContent || note.contentSnippet;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  const paragraphs = content.split('\n');
  paragraphs.forEach((p) => {
    if (!p.trim()) {
      y += 3;
      return;
    }
    if (y > 265) {
      doc.addPage();
      y = 22;
    }

    if (p.startsWith('#') || p.startsWith('•') || p.includes(':')) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }

    const splitP = doc.splitTextToSize(p, pageWidth - 28);
    doc.text(splitP, 14, y);
    y += splitP.length * 4.5 + 1.5;
  });

  applyWatermarkToPDF(doc, 'TALEEM GURU • STUDY MATERIAL • VERIFIED SECURE COPY');
  doc.save(`${note.title.replace(/[^a-zA-Z0-9]/g, '_')}_Notes_TaleemGuru.pdf`);
}

/**
 * Export Test Result Card to Watermarked PDF
 */
export function exportResultCardToPDF(result: TestResult, studentName = 'Student') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 24;

  // Header Title
  doc.setTextColor(16, 110, 68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('TALEEM GURU SCORECARD', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Test Name: ${result.testTitle}  •  Category: ${result.category}`, 14, y);
  y += 5;
  doc.text(`Candidate: ${studentName}  •  Date: ${result.timestamp}  •  Assessment Ref: TG-RES-${result.id.slice(-6).toUpperCase()}`, 14, y);
  y += 5;

  doc.setDrawColor(16, 110, 68);
  doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Score Highlight Banner
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, y, pageWidth - 28, 28, 3, 3, 'FD');

  doc.setTextColor(16, 110, 68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`${result.percentage}%`, 22, y + 15);

  doc.setFontSize(10);
  doc.text(`Grade: ${result.grade}`, 22, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9.5);
  doc.text(`Total Questions: ${result.totalQuestions}`, 75, y + 10);
  doc.text(`Correct: ${result.correctCount}  |  Wrong: ${result.wrongCount}`, 75, y + 16);
  doc.text(`Skipped: ${result.skippedCount}  |  Marks: ${result.marksObtained} / ${result.totalMarks}`, 75, y + 22);

  doc.text(`Time Spent: ${Math.floor(result.timeUsedSeconds / 60)}m ${result.timeUsedSeconds % 60}s`, 140, y + 10);
  doc.text(`Percentile: Top ${100 - result.percentileRank}%`, 140, y + 16);
  doc.text(`Status: ${result.percentage >= 50 ? 'PASSED (QUALIFIED)' : 'NEEDS IMPROVEMENT'}`, 140, y + 22);

  y += 36;

  // Question Breakdown Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Detailed Question Review & Explanations:', 14, y);
  y += 6;

  result.questions.forEach((q, idx) => {
    if (y > 255) {
      doc.addPage();
      y = 22;
    }

    const ans = result.answers.find((a) => a.questionId === q.id);
    const userChoice = ans?.selectedOption !== null && ans?.selectedOption !== undefined ? ans.selectedOption : null;
    const isCorrect = userChoice === q.correctAnswer;
    const isSkipped = userChoice === null;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const statusLabel = isSkipped ? '[SKIPPED]' : isCorrect ? '[CORRECT +1]' : '[INCORRECT 0]';
    doc.text(`Q${idx + 1}. ${q.question}  ${statusLabel}`, 14, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    const userSelectedText = userChoice !== null ? q.options[userChoice] : 'No answer given';
    const correctText = q.options[q.correctAnswer];
    doc.text(`Your Answer: ${userSelectedText}`, 18, y);
    y += 4;
    doc.text(`Correct Answer: ${correctText}`, 18, y);
    y += 4;

    if (q.explanation) {
      const exp = doc.splitTextToSize(`Explanation: ${q.explanation}`, pageWidth - 32);
      doc.text(exp, 18, y);
      y += exp.length * 3.8 + 2;
    } else {
      y += 2;
    }
  });

  applyWatermarkToPDF(doc, 'TALEEM GURU • RESULT CARD • ONLINE ASSESSMENT');
  doc.save(`TaleemGuru_Result_${result.testTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

/**
 * Generate and download Certificate PDF with clean TaleemGuru styling
 */
export function exportCertificateToPDF(
  cert: Certificate | (Partial<Certificate> & {
    studentName: string;
    testName: string;
    score: number;
    totalMarks: number;
    percentage: number;
    grade: string;
  })
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth(); // 297mm
  const height = doc.internal.pageSize.getHeight(); // 210mm

  // Outer Border & Background
  doc.setFillColor(252, 253, 252);
  doc.rect(0, 0, width, height, 'F');

  // Decorative Border
  doc.setDrawColor(16, 110, 68); // Emerald
  doc.setLineWidth(3);
  doc.rect(8, 8, width - 16, height - 16);

  doc.setDrawColor(217, 119, 6); // Gold inner border
  doc.setLineWidth(1);
  doc.rect(12, 12, width - 24, height - 24);

  // Crest & Header Logo
  try {
    doc.addImage(TALEEMGURU_LOGO_BASE64, 'PNG', 20, 16, 18, 18);
    doc.addImage(TALEEMGURU_LOGO_BASE64, 'PNG', width - 38, 16, 18, 18);
  } catch (_e) {
    // Graceful fallback if image decoding is unavailable in environment
  }

  doc.setTextColor(16, 110, 68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('TALEEM GURU PAKISTAN', width / 2, 26, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text("Learn. Practice. Test. Improve.", width / 2, 34, { align: 'center' });

  // Main Ribbon Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('CERTIFICATE OF MERIT', width / 2, 50, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(71, 85, 105);
  doc.text('This is to certify that', width / 2, 62, { align: 'center' });

  // Candidate Name
  doc.setTextColor(16, 110, 68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(cert.studentName.toUpperCase(), width / 2, 78, { align: 'center' });

  // Line under name
  doc.setDrawColor(180, 210, 195);
  doc.setLineWidth(0.6);
  doc.line(60, 82, width - 60, 82);

  // Details Paragraph
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const certDesc = `has demonstrated commendable academic competence and successfully completed the evaluation for`;
  doc.text(certDesc, width / 2, 94, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(cert.testName, width / 2, 105, { align: 'center' });

  // Score & Grade Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(width / 2 - 80, 115, 160, 22, 3, 3, 'FD');

  doc.setTextColor(16, 110, 68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(
    `Score: ${cert.score} / ${cert.totalMarks}   •   Percentage: ${cert.percentage}%   •   Grade: ${cert.grade}`,
    width / 2,
    129,
    { align: 'center' }
  );

  // Issue Date & ID
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const displayCertId = cert.certificateNumber || cert.certificateId || cert.id || 'TG-CERT-VERIFIED';
  doc.text(`Issue Date: ${cert.issueDate || new Date().toLocaleDateString('en-GB')}  |  Certificate ID: ${displayCertId}`, width / 2, 148, {
    align: 'center',
  });

  // Bottom Signatures & QR Code representation
  const leftX = 40;
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.5);
  doc.line(leftX, 175, leftX + 50, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Academic Directorate', leftX + 7, 180);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TaleemGuru Evaluation Desk', leftX + 1, 185);

  // Emblem / Stamp in Center
  doc.setFillColor(245, 158, 11);
  doc.circle(width / 2, 172, 13, 'F');
  doc.setFillColor(217, 119, 6);
  doc.circle(width / 2, 172, 11, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('VERIFIED', width / 2, 170, { align: 'center' });
  doc.text('MERIT', width / 2, 174.5, { align: 'center' });

  // Verification Box on Right
  const rightX = width - 90;
  doc.setDrawColor(71, 85, 105);
  doc.line(rightX, 175, rightX + 50, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Registry & Verification', rightX + 4, 180);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Verify Online at taleemguru.pk', rightX - 2, 185);

  // Certificate Bottom Credit Banner
  doc.setFillColor(245, 247, 248);
  doc.rect(0, height - 9, width, 9, 'F');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('© TaleemGuru.pk | Downloaded from TaleemGuru.pk', 14, height - 3);
  doc.text(`https://taleemguru.pk  •  Certificate Verification: ${displayCertId}`, width - 14, height - 3, { align: 'right' });

  doc.save(`TaleemGuru_Certificate_${cert.studentName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

/**
 * Downloads plain text / study notes with verified Taleem Guru headers & ASCII borders
 */
export function downloadTextWithWatermark(filename: string, title: string, content: string) {
  const stampedHeader = `
================================================================================
           ★ TALEEM GURU PAKISTAN - STUDY & EXAMINATION RESOURCE ★
                                 ${BRAND_URL}
================================================================================
DOCUMENT: ${title}
DATE: ${new Date().toLocaleDateString('en-GB')}
CREDIT: © TaleemGuru.pk | Downloaded from TaleemGuru.pk
WEBSITE: https://taleemguru.pk
DOCUMENT REF: TG-DOC-${Math.random().toString(36).substring(2, 9).toUpperCase()}
COPYRIGHT: © TaleemGuru.pk. All rights reserved.
================================================================================

`;

  const stampedFooter = `

================================================================================
© TaleemGuru.pk | Downloaded from TaleemGuru.pk
Online testing, past papers, notes & exam preparation: https://taleemguru.pk
================================================================================
`;

  const fullText = stampedHeader + content + stampedFooter;
  const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_TaleemGuru.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
