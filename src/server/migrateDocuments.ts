import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../db/index.ts';
import { pastPapers, studyNotes } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import {
  processAndStoreDocument,
  rebrandDocument,
  ORIGINALS_DIR,
  BRANDED_DIR,
} from './documentStorage.ts';
import {
  getDocumentsFromDb,
  getDocumentByIdFromDb,
} from '../db/documents.ts';
import { resolveSafeLocalFilePath } from './documentSecurity.ts';

export interface MigrationSummary {
  pastPapersProcessed: number;
  pastPapersMigrated: number;
  pastPapersSkipped: number;
  studyNotesProcessed: number;
  studyNotesMigrated: number;
  studyNotesSkipped: number;
  errors: Array<{ id: string; type: string; error: string }>;
}

/**
 * Migrates existing past papers and study notes into the centralized
 * documents library with immutable originals and branded distribution copies.
 */
export async function migrateExistingDocuments(): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    pastPapersProcessed: 0,
    pastPapersMigrated: 0,
    pastPapersSkipped: 0,
    studyNotesProcessed: 0,
    studyNotesMigrated: 0,
    studyNotesSkipped: 0,
    errors: [],
  };

  if (!db) {
    console.warn('Database not available for document migration');
    return summary;
  }

  // 1. Migrate Past Papers
  try {
    const existingPapers = await db.select().from(pastPapers);
    for (const paper of existingPapers) {
      summary.pastPapersProcessed++;
      try {
        // If already has a document record with completed branding, skip
        const existingDoc = await getDocumentByIdFromDb(paper.id, true);
        if (existingDoc && existingDoc.brandingStatus === 'Completed' && existingDoc.brandedFileHash) {
          summary.pastPapersSkipped++;
          continue;
        }

        const sourcePath = paper.fileUrl || paper.downloadUrl;
        if (!sourcePath) {
          summary.pastPapersSkipped++;
          continue;
        }

        let buffer: Buffer | null = null;

        // Try local file resolution
        if (sourcePath.startsWith('/')) {
          const resolved = resolveSafeLocalFilePath(sourcePath);
          if (resolved.valid && resolved.absolutePath && fs.existsSync(resolved.absolutePath)) {
            buffer = fs.readFileSync(resolved.absolutePath);
          }
        }

        // If not found in public folder, check if already in originals
        if (!buffer) {
          const possibleOriginal = path.join(ORIGINALS_DIR, `${paper.id}.pdf`);
          if (fs.existsSync(possibleOriginal)) {
            buffer = fs.readFileSync(possibleOriginal);
          }
        }

        if (!buffer) {
          summary.pastPapersSkipped++;
          continue;
        }

        const rawFilename = path.basename(sourcePath) || `${paper.title || 'past_paper'}.pdf`;
        const paperStatus = (paper.status === 'Draft' || paper.status === 'Archived') ? paper.status : 'Published';

        const result = await processAndStoreDocument(
          buffer,
          rawFilename,
          {
            title: paper.title,
            documentType: 'Past Paper',
            board: paper.board,
            classLevel: paper.classLevel,
            subject: paper.subject,
            year: paper.year,
            language: paper.language || 'English',
            status: paperStatus,
            associatedEntityId: paper.id,
            allowDuplicate: true,
          }
        );

        if (result.success && result.document) {
          summary.pastPapersMigrated++;
          // Update past_papers row with branding information
          await db
            .update(pastPapers)
            .set({
              brandingStatus: 'Completed',
              brandingVersion: '2.0',
              brandedFileUrl: `/api/documents/${result.document.id}/download`,
              originalFileHash: result.document.originalFileHash,
              brandedFileHash: result.document.brandedFileHash,
              brandedAt: new Date(),
            })
            .where(eq(pastPapers.id, paper.id));
        } else {
          summary.errors.push({ id: paper.id, type: 'past_paper', error: result.error || 'Failed' });
        }
      } catch (err: any) {
        summary.errors.push({ id: paper.id, type: 'past_paper', error: err.message });
      }
    }
  } catch (err: any) {
    console.error('Error during past papers migration:', err);
  }

  // 2. Migrate Study Notes
  try {
    const existingNotes = await db.select().from(studyNotes);
    for (const note of existingNotes) {
      summary.studyNotesProcessed++;
      try {
        const existingDoc = await getDocumentByIdFromDb(note.id, true);
        if (existingDoc && existingDoc.brandingStatus === 'Completed' && existingDoc.brandedFileHash) {
          summary.studyNotesSkipped++;
          continue;
        }

        const sourcePath = note.pdfUrl || note.fileUrl;
        if (!sourcePath) {
          summary.studyNotesSkipped++;
          continue;
        }

        let buffer: Buffer | null = null;
        if (sourcePath.startsWith('/')) {
          const resolved = resolveSafeLocalFilePath(sourcePath);
          if (resolved.valid && resolved.absolutePath && fs.existsSync(resolved.absolutePath)) {
            buffer = fs.readFileSync(resolved.absolutePath);
          }
        }

        if (!buffer) {
          const possibleOriginal = path.join(ORIGINALS_DIR, `${note.id}.pdf`);
          if (fs.existsSync(possibleOriginal)) {
            buffer = fs.readFileSync(possibleOriginal);
          }
        }

        if (!buffer) {
          summary.studyNotesSkipped++;
          continue;
        }

        const rawFilename = path.basename(sourcePath) || `${note.title || 'study_note'}.pdf`;
        const noteStatus = (note.status === 'Draft' || note.status === 'Archived') ? note.status : 'Published';

        const result = await processAndStoreDocument(
          buffer,
          rawFilename,
          {
            title: note.title,
            documentType: 'Study Note',
            board: note.board || undefined,
            classLevel: note.classLevel,
            subject: note.subject,
            chapter: note.chapter,
            topic: note.topic || undefined,
            language: note.language || 'English',
            status: noteStatus,
            associatedEntityId: note.id,
            allowDuplicate: true,
          }
        );

        if (result.success && result.document) {
          summary.studyNotesMigrated++;
          await db
            .update(studyNotes)
            .set({
              brandingStatus: 'Completed',
              brandingVersion: '2.0',
              brandedFileUrl: `/api/documents/${result.document.id}/download`,
              originalFileHash: result.document.originalFileHash,
              brandedFileHash: result.document.brandedFileHash,
              brandedAt: new Date(),
            })
            .where(eq(studyNotes.id, note.id));
        } else {
          summary.errors.push({ id: note.id, type: 'study_note', error: result.error || 'Failed' });
        }
      } catch (err: any) {
        summary.errors.push({ id: note.id, type: 'study_note', error: err.message });
      }
    }
  } catch (err: any) {
    console.error('Error during study notes migration:', err);
  }

  return summary;
}
