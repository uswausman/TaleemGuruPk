import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../db/index.ts';
import { documents, documentVersions, documentDownloadEvents, pastPapers, studyNotes } from '../db/schema.ts';
import { eq, desc, sql } from 'drizzle-orm';
import { brandPdfBuffer, computeHash } from './documentBranding.ts';
import { sanitizeDownloadFilename, MAX_DOCUMENT_SIZE_BYTES } from './documentSecurity.ts';
import type { DocumentItem } from '../types.ts';

export const ORIGINALS_DIR = path.resolve(process.cwd(), 'storage', 'documents', 'originals');
export const BRANDED_DIR = path.resolve(process.cwd(), 'storage', 'documents', 'branded');

// Ensure storage directories exist safely
try {
  if (!fs.existsSync(ORIGINALS_DIR)) {
    fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
  }
  if (!fs.existsSync(BRANDED_DIR)) {
    fs.mkdirSync(BRANDED_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[DocumentStorage] Could not create storage directory:', err);
}

/**
 * Validates file signature (magic bytes) to prevent disguised executable/malicious uploads
 */
export function validateMagicBytes(buffer: Buffer, mimeType: string, filename: string): { valid: boolean; detectedType?: string; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty file buffer' };
  }

  const ext = path.extname(filename).toLowerCase();

  // PDF Magic Bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (buffer.length >= 5 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 && buffer[4] === 0x2D) {
    return { valid: true, detectedType: 'application/pdf' };
  }

  // PNG Magic Bytes: 0x89 0x50 0x4E 0x47
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { valid: true, detectedType: 'image/png' };
  }

  // JPEG Magic Bytes: 0xFF 0xD8 0xFF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { valid: true, detectedType: 'image/jpeg' };
  }

  // ZIP / DOCX / XLSX: 0x50 0x4B 0x03 0x04
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    if (ext === '.docx') return { valid: true, detectedType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    if (ext === '.xlsx') return { valid: true, detectedType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    return { valid: true, detectedType: 'application/zip' };
  }

  // Text / Markdown validation (UTF-8 valid check without null bytes)
  if (['.txt', '.md'].includes(ext) || mimeType.includes('text')) {
    for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
      if (buffer[i] === 0x00) {
        return { valid: false, error: 'Text document contains invalid null bytes' };
      }
    }
    return { valid: true, detectedType: ext === '.md' ? 'text/markdown' : 'text/plain' };
  }

  // Block dangerous executable extensions regardless of disguised content
  const prohibitedExts = ['.exe', '.sh', '.bat', '.cmd', '.js', '.mjs', '.php', '.py', '.pl', '.rb', '.vbs', '.dll', '.bin', '.so'];
  if (prohibitedExts.includes(ext)) {
    return { valid: false, error: `Executable or script extension ${ext} is prohibited` };
  }

  return { valid: false, error: 'Unsupported file signature or corrupt document format' };
}

export interface StoreDocumentOptions {
  title?: string;
  documentType?: 'Past Paper' | 'Study Note' | 'Syllabus' | 'Reference' | 'Book' | 'Document';
  board?: string;
  classLevel?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  year?: number;
  language?: string;
  status?: 'Published' | 'Draft' | 'Archived';
  associatedEntityId?: string;
  allowDuplicate?: boolean;
}

/**
 * Uploads, validates, hashes, stores original immutably, brands PDF, and registers in database
 */
export async function processAndStoreDocument(
  fileBuffer: Buffer,
  originalFilename: string,
  options: StoreDocumentOptions = {},
  authorUid?: string
): Promise<{ success: boolean; document?: DocumentItem; isDuplicate?: boolean; existingDocumentId?: string; error?: string }> {
  // 1. Size check
  if (fileBuffer.length > MAX_DOCUMENT_SIZE_BYTES) {
    return { success: false, error: `Document exceeds maximum permitted size of 25MB` };
  }

  // 2. Filename sanitization
  const sanitizedFilename = sanitizeDownloadFilename(originalFilename, 'document.pdf');

  // 3. Magic bytes / signature check
  const magicValidation = validateMagicBytes(fileBuffer, 'application/pdf', sanitizedFilename);
  if (!magicValidation.valid) {
    return { success: false, error: magicValidation.error || 'Invalid file format' };
  }

  const mimeType = magicValidation.detectedType || 'application/pdf';

  // 4. SHA-256 Hash of original file
  const originalFileHash = computeHash(fileBuffer);

  // 5. Duplicate Detection via SHA-256
  if (db) {
    const existing = await db.select().from(documents).where(eq(documents.originalFileHash, originalFileHash)).limit(1);
    if (existing.length > 0) {
      if (!options.allowDuplicate) {
        return {
          success: false,
          isDuplicate: true,
          existingDocumentId: existing[0].id,
          error: `Duplicate file detected: Document already exists with ID "${existing[0].id}" and title "${existing[0].title}".`,
        };
      }
    }
  }

  // 6. Generate Document ID
  const docId = `tg_doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // 7. Store Original file immutably
  const originalFileStorageName = `${docId}_orig_${sanitizedFilename}`;
  const originalPath = path.join(ORIGINALS_DIR, originalFileStorageName);
  fs.writeFileSync(originalPath, fileBuffer);

  // 8. Generate Branded/Distribution Copy
  let brandedStorageRef: string | undefined;
  let brandedFileHash: string | undefined;
  let brandingStatus: 'Completed' | 'Pending' | 'Failed' | 'Not Applicable' = 'Not Applicable';

  const isPdf = mimeType === 'application/pdf' || sanitizedFilename.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    try {
      const brandedResult = await brandPdfBuffer(fileBuffer, { title: options.title || sanitizedFilename });
      const brandedStorageName = `${docId}_branded_${sanitizedFilename}`;
      const brandedPath = path.join(BRANDED_DIR, brandedStorageName);
      fs.writeFileSync(brandedPath, brandedResult.buffer);
      brandedStorageRef = brandedPath;
      brandedFileHash = computeHash(brandedResult.buffer);
      brandingStatus = 'Completed';
    } catch (brandingErr: any) {
      console.warn(`[DocumentStorage] Automatic branding failed for ${docId}:`, brandingErr.message);
      brandingStatus = 'Failed';
      // In case branding fails, the original is intact, but we do NOT corrupt the file
    }
  }

  // 9. Persist in PostgreSQL
  const docItem: DocumentItem = {
    id: docId,
    title: options.title || sanitizedFilename.replace(/\.[^/.]+$/, ''),
    originalFilename,
    sanitizedFilename,
    mimeType,
    fileSize: fileBuffer.length,
    storageRef: originalPath,
    originalFileHash,
    brandedStorageRef,
    brandedFileHash,
    documentType: options.documentType || 'Document',
    contentType: isPdf ? 'PDF' : 'Other',
    board: options.board,
    classLevel: options.classLevel,
    subject: options.subject,
    chapter: options.chapter,
    topic: options.topic,
    year: options.year,
    language: options.language || 'English',
    status: options.status || 'Published',
    version: 1,
    brandingStatus,
    brandingVersion: '2.0',
    brandedAt: brandingStatus === 'Completed' ? new Date().toISOString() : undefined,
    downloadsCount: 0,
    associatedEntityId: options.associatedEntityId,
    createdBy: authorUid,
    updatedBy: authorUid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (db) {
    await db.insert(documents).values({
      id: docItem.id,
      title: docItem.title,
      originalFilename: docItem.originalFilename,
      sanitizedFilename: docItem.sanitizedFilename,
      mimeType: docItem.mimeType,
      fileSize: docItem.fileSize,
      storageRef: docItem.storageRef,
      originalFileHash: docItem.originalFileHash,
      brandedStorageRef: docItem.brandedStorageRef,
      brandedFileHash: docItem.brandedFileHash,
      documentType: docItem.documentType,
      contentType: docItem.contentType,
      board: docItem.board,
      classLevel: docItem.classLevel,
      subject: docItem.subject,
      chapter: docItem.chapter,
      topic: docItem.topic,
      year: docItem.year,
      language: docItem.language,
      status: docItem.status,
      version: docItem.version,
      brandingStatus: docItem.brandingStatus,
      brandingVersion: docItem.brandingVersion,
      brandedAt: docItem.brandedAt ? new Date(docItem.brandedAt) : null,
      downloadsCount: 0,
      associatedEntityId: docItem.associatedEntityId,
      createdBy: docItem.createdBy,
      updatedBy: docItem.updatedBy,
    });

    // Record initial version in document_versions table
    await db.insert(documentVersions).values({
      documentId: docId,
      versionNumber: 1,
      originalFilename,
      storageRef: originalPath,
      originalFileHash,
      brandedStorageRef: brandedStorageRef || originalPath,
      brandedFileHash: brandedFileHash || originalFileHash,
      fileSize: fileBuffer.length,
      changeNotes: 'Initial document upload',
      createdBy: authorUid,
    });
  }

  return { success: true, document: docItem };
}

/**
 * Adds a new version to an existing document while preserving historical version records
 */
export async function createDocumentVersion(
  documentId: string,
  newFileBuffer: Buffer,
  originalFilename: string,
  changeNotes?: string,
  authorUid?: string
): Promise<{ success: boolean; document?: DocumentItem; error?: string }> {
  if (!db) throw new Error('Database not connected');

  const existingRows = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (existingRows.length === 0) {
    return { success: false, error: 'Document not found' };
  }

  const currentDoc = existingRows[0];
  const newVersionNumber = currentDoc.version + 1;

  const sanitizedFilename = sanitizeDownloadFilename(originalFilename, currentDoc.sanitizedFilename);
  const magicValidation = validateMagicBytes(newFileBuffer, currentDoc.mimeType, sanitizedFilename);
  if (!magicValidation.valid) {
    return { success: false, error: magicValidation.error || 'Invalid file format' };
  }

  // Store new version's original file
  const originalFileStorageName = `${documentId}_v${newVersionNumber}_orig_${sanitizedFilename}`;
  const originalPath = path.join(ORIGINALS_DIR, originalFileStorageName);
  fs.writeFileSync(originalPath, newFileBuffer);

  const originalFileHash = computeHash(newFileBuffer);

  // Generate branded copy for new version
  let brandedStorageRef: string | undefined;
  let brandedFileHash: string | undefined;
  let brandingStatus = currentDoc.brandingStatus;

  const isPdf = currentDoc.mimeType === 'application/pdf' || sanitizedFilename.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    try {
      const brandedResult = await brandPdfBuffer(newFileBuffer, { title: currentDoc.title });
      const brandedStorageName = `${documentId}_v${newVersionNumber}_branded_${sanitizedFilename}`;
      const brandedPath = path.join(BRANDED_DIR, brandedStorageName);
      fs.writeFileSync(brandedPath, brandedResult.buffer);
      brandedStorageRef = brandedPath;
      brandedFileHash = computeHash(brandedResult.buffer);
      brandingStatus = 'Completed';
    } catch {
      brandingStatus = 'Failed';
    }
  }

  // Insert into document_versions
  await db.insert(documentVersions).values({
    documentId,
    versionNumber: newVersionNumber,
    originalFilename,
    storageRef: originalPath,
    originalFileHash,
    brandedStorageRef: brandedStorageRef || originalPath,
    brandedFileHash: brandedFileHash || originalFileHash,
    fileSize: newFileBuffer.length,
    changeNotes: changeNotes || `Updated to version ${newVersionNumber}`,
    createdBy: authorUid,
  });

  // Update documents row
  await db.update(documents).set({
    version: newVersionNumber,
    originalFilename,
    sanitizedFilename,
    fileSize: newFileBuffer.length,
    storageRef: originalPath,
    originalFileHash,
    brandedStorageRef: brandedStorageRef || currentDoc.brandedStorageRef,
    brandedFileHash: brandedFileHash || currentDoc.brandedFileHash,
    brandingStatus,
    updatedBy: authorUid,
    updatedAt: new Date(),
  }).where(eq(documents.id, documentId));

  const updatedRows = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  return { success: true, document: updatedRows[0] as any };
}

/**
 * Regenerate branded copy for an existing document without touching the original
 */
export async function rebrandDocument(documentId: string): Promise<{ success: boolean; brandedHash?: string; error?: string }> {
  if (!db) throw new Error('Database not connected');

  const rows = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (rows.length === 0) {
    return { success: false, error: 'Document not found' };
  }

  const doc = rows[0];
  if (!fs.existsSync(doc.storageRef)) {
    return { success: false, error: 'Original document file is missing on storage' };
  }

  const originalBuffer = fs.readFileSync(doc.storageRef);
  const brandedResult = await brandPdfBuffer(originalBuffer, { title: doc.title, forceRebrand: true });

  const brandedStorageName = `${documentId}_branded_${doc.sanitizedFilename}`;
  const brandedPath = path.join(BRANDED_DIR, brandedStorageName);
  fs.writeFileSync(brandedPath, brandedResult.buffer);

  const brandedFileHash = computeHash(brandedResult.buffer);

  await db.update(documents).set({
    brandedStorageRef: brandedPath,
    brandedFileHash,
    brandingStatus: 'Completed',
    brandingVersion: '2.0',
    brandedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(documents.id, documentId));

  return { success: true, brandedHash: brandedFileHash };
}

/**
 * Record a verified document download event and update the authoritative download count
 */
export async function recordDocumentDownload(
  documentId: string,
  options: {
    documentType?: string;
    userUid?: string;
    anonymousSessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    version?: number;
  }
): Promise<{ success: boolean; totalDownloads: number }> {
  if (!db) return { success: false, totalDownloads: 0 };

  try {
    // 1. Insert download event
    await db.insert(documentDownloadEvents).values({
      documentId,
      documentType: options.documentType || 'Document',
      userUid: options.userUid,
      anonymousSessionId: options.anonymousSessionId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      version: options.version || 1,
    });

    // 2. Compute exact authoritative count from PostgreSQL events
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documentDownloadEvents)
      .where(eq(documentDownloadEvents.documentId, documentId));

    const totalDownloads = countResult[0]?.count || 1;

    // 3. Update documents table counter
    await db.update(documents).set({ downloadsCount: totalDownloads }).where(eq(documents.id, documentId));

    // Also update associated past_paper or study_note if applicable
    await db.update(pastPapers).set({ downloadsCount: totalDownloads }).where(eq(pastPapers.id, documentId));
    await db.update(studyNotes).set({ downloadsCount: totalDownloads }).where(eq(studyNotes.id, documentId));

    return { success: true, totalDownloads };
  } catch (err) {
    console.error('Error recording document download event:', err);
    return { success: false, totalDownloads: 0 };
  }
}

/**
 * Safely resolves the distribution branded copy file path for downloads
 */
export function getSafeBrandedPath(doc: { brandedStorageRef?: string | null; storageRef: string }): { valid: boolean; filePath?: string; error?: string } {
  const target = doc.brandedStorageRef || doc.storageRef;
  if (!target) return { valid: false, error: 'File reference missing' };

  const resolved = path.resolve(target);
  // Ensure it resides strictly in storage directory
  const storageRoot = path.resolve(process.cwd(), 'storage');
  if (!resolved.startsWith(storageRoot)) {
    return { valid: false, error: 'Path traversal violation' };
  }

  if (!fs.existsSync(resolved)) {
    return { valid: false, error: 'Distribution file does not exist on storage' };
  }

  return { valid: true, filePath: resolved };
}

/**
 * Safely resolves original file path for administrative inspections
 */
export function getSafeOriginalPath(doc: { storageRef: string }): { valid: boolean; filePath?: string; error?: string } {
  const target = doc.storageRef;
  if (!target) return { valid: false, error: 'Original storage reference missing' };

  const resolved = path.resolve(target);
  const originalsRoot = ORIGINALS_DIR;
  if (!resolved.startsWith(originalsRoot)) {
    return { valid: false, error: 'Access denied: path escapes originals storage' };
  }

  if (!fs.existsSync(resolved)) {
    return { valid: false, error: 'Original file missing on storage' };
  }

  return { valid: true, filePath: resolved };
}
