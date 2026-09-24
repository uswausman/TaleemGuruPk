import { db } from './index';
import { documents, documentVersions, documentDownloadEvents } from './schema';
import { eq, and, desc, sql, ilike, inArray } from 'drizzle-orm';
import { DocumentItem, DocumentVersion, DocumentDownloadEvent } from '../types';

export interface DocumentFilters {
  status?: string;
  documentType?: string;
  board?: string;
  classLevel?: string;
  subject?: string;
  chapter?: string;
  year?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Retrieves documents with authoritative server-side role filtering
 * Non-staff callers can ONLY see Published documents.
 */
export async function getDocumentsFromDb(filters: DocumentFilters = {}, isStaff: boolean = false): Promise<{ items: DocumentItem[]; total: number }> {
  if (!db) return { items: [], total: 0 };

  try {
    const conditions = [];

    // Role-enforced status: non-staff can ONLY access 'Published' documents
    if (!isStaff) {
      conditions.push(eq(documents.status, 'Published'));
    } else if (filters.status && filters.status !== 'All') {
      conditions.push(eq(documents.status, filters.status));
    }

    if (filters.documentType && filters.documentType !== 'All') {
      conditions.push(eq(documents.documentType, filters.documentType));
    }

    if (filters.board && filters.board !== 'All') {
      conditions.push(ilike(documents.board, `%${filters.board}%`));
    }

    if (filters.classLevel && filters.classLevel !== 'All') {
      conditions.push(ilike(documents.classLevel, `%${filters.classLevel}%`));
    }

    if (filters.subject && filters.subject !== 'All') {
      conditions.push(ilike(documents.subject, `%${filters.subject}%`));
    }

    if (filters.chapter && filters.chapter !== 'All') {
      conditions.push(ilike(documents.chapter, `%${filters.chapter}%`));
    }

    if (filters.year) {
      conditions.push(eq(documents.year, filters.year));
    }

    if (filters.search) {
      conditions.push(ilike(documents.title, `%${filters.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count query
    const totalRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents)
      .where(whereClause);
    const total = totalRes[0]?.count || 0;

    const limit = Math.min(filters.limit || 50, 200);
    const offset = filters.offset || 0;

    const rows = await db
      .select()
      .from(documents)
      .where(whereClause)
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset);

    const items: DocumentItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      originalFilename: r.originalFilename,
      sanitizedFilename: r.sanitizedFilename,
      mimeType: r.mimeType,
      fileSize: r.fileSize,
      storageRef: r.storageRef,
      originalFileHash: r.originalFileHash,
      brandedStorageRef: r.brandedStorageRef || undefined,
      brandedFileHash: r.brandedFileHash || undefined,
      documentType: r.documentType,
      contentType: r.contentType,
      board: r.board || undefined,
      classLevel: r.classLevel || undefined,
      subject: r.subject || undefined,
      chapter: r.chapter || undefined,
      topic: r.topic || undefined,
      year: r.year || undefined,
      language: r.language || 'English',
      status: r.status as any,
      version: r.version,
      brandingStatus: r.brandingStatus as any,
      brandingVersion: r.brandingVersion || undefined,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : undefined,
      downloadsCount: r.downloadsCount,
      associatedEntityId: r.associatedEntityId || undefined,
      createdBy: r.createdBy || undefined,
      updatedBy: r.updatedBy || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    }));

    return { items, total };
  } catch (err) {
    console.error('Error in getDocumentsFromDb:', err);
    return { items: [], total: 0 };
  }
}

/**
 * Retrieves a single document by ID with access control
 */
export async function getDocumentByIdFromDb(id: string, isStaff: boolean = false): Promise<DocumentItem | null> {
  if (!db) return null;

  try {
    const rows = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (rows.length === 0) return null;

    const r = rows[0];

    // Non-staff callers can only access Published documents
    if (!isStaff && r.status !== 'Published') {
      return null;
    }

    return {
      id: r.id,
      title: r.title,
      originalFilename: r.originalFilename,
      sanitizedFilename: r.sanitizedFilename,
      mimeType: r.mimeType,
      fileSize: r.fileSize,
      storageRef: r.storageRef,
      originalFileHash: r.originalFileHash,
      brandedStorageRef: r.brandedStorageRef || undefined,
      brandedFileHash: r.brandedFileHash || undefined,
      documentType: r.documentType,
      contentType: r.contentType,
      board: r.board || undefined,
      classLevel: r.classLevel || undefined,
      subject: r.subject || undefined,
      chapter: r.chapter || undefined,
      topic: r.topic || undefined,
      year: r.year || undefined,
      language: r.language || 'English',
      status: r.status as any,
      version: r.version,
      brandingStatus: r.brandingStatus as any,
      brandingVersion: r.brandingVersion || undefined,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : undefined,
      downloadsCount: r.downloadsCount,
      associatedEntityId: r.associatedEntityId || undefined,
      createdBy: r.createdBy || undefined,
      updatedBy: r.updatedBy || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    };
  } catch (err) {
    console.error('Error in getDocumentByIdFromDb:', err);
    return null;
  }
}

/**
 * Update document metadata
 */
export async function updateDocumentMetadataInDb(
  id: string,
  updates: Partial<DocumentItem>,
  updaterUid?: string
): Promise<DocumentItem | null> {
  if (!db) return null;

  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.board !== undefined) updateData.board = updates.board;
    if (updates.classLevel !== undefined) updateData.classLevel = updates.classLevel;
    if (updates.subject !== undefined) updateData.subject = updates.subject;
    if (updates.chapter !== undefined) updateData.chapter = updates.chapter;
    if (updates.topic !== undefined) updateData.topic = updates.topic;
    if (updates.year !== undefined) updateData.year = updates.year;
    if (updates.language !== undefined) updateData.language = updates.language;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.documentType !== undefined) updateData.documentType = updates.documentType;
    if (updaterUid) updateData.updatedBy = updaterUid;

    await db.update(documents).set(updateData).where(eq(documents.id, id));
    return await getDocumentByIdFromDb(id, true);
  } catch (err) {
    console.error('Error in updateDocumentMetadataInDb:', err);
    return null;
  }
}

/**
 * Bulk apply metadata to multiple documents
 */
export async function bulkUpdateDocumentMetadataInDb(
  ids: string[],
  metadata: Partial<DocumentItem>,
  updaterUid?: string
): Promise<number> {
  if (!db || ids.length === 0) return 0;

  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (metadata.board !== undefined && metadata.board !== 'All') updateData.board = metadata.board;
    if (metadata.classLevel !== undefined && metadata.classLevel !== 'All') updateData.classLevel = metadata.classLevel;
    if (metadata.subject !== undefined && metadata.subject !== 'All') updateData.subject = metadata.subject;
    if (metadata.chapter !== undefined) updateData.chapter = metadata.chapter;
    if (metadata.year !== undefined) updateData.year = metadata.year;
    if (metadata.language !== undefined) updateData.language = metadata.language;
    if (metadata.status !== undefined) updateData.status = metadata.status;
    if (updaterUid) updateData.updatedBy = updaterUid;

    await db.update(documents).set(updateData).where(inArray(documents.id, ids));
    return ids.length;
  } catch (err) {
    console.error('Error in bulkUpdateDocumentMetadataInDb:', err);
    return 0;
  }
}

/**
 * Bulk update status (e.g. Publish, Draft, Archive)
 */
export async function bulkUpdateDocumentStatusInDb(
  ids: string[],
  status: 'Published' | 'Draft' | 'Archived',
  updaterUid?: string
): Promise<number> {
  if (!db || ids.length === 0) return 0;

  try {
    await db
      .update(documents)
      .set({
        status,
        updatedBy: updaterUid,
        updatedAt: new Date(),
      })
      .where(inArray(documents.id, ids));

    return ids.length;
  } catch (err) {
    console.error('Error in bulkUpdateDocumentStatusInDb:', err);
    return 0;
  }
}

/**
 * Delete a document and its historical versions
 */
export async function deleteDocumentFromDb(id: string): Promise<boolean> {
  if (!db) return false;

  try {
    await db.delete(documentVersions).where(eq(documentVersions.documentId, id));
    await db.delete(documentDownloadEvents).where(eq(documentDownloadEvents.documentId, id));
    await db.delete(documents).where(eq(documents.id, id));
    return true;
  } catch (err) {
    console.error('Error in deleteDocumentFromDb:', err);
    return false;
  }
}

/**
 * Get all historical versions of a document
 */
export async function getDocumentVersionsFromDb(documentId: string): Promise<DocumentVersion[]> {
  if (!db) return [];

  try {
    const rows = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNumber));

    return rows.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      versionNumber: r.versionNumber,
      originalFilename: r.originalFilename,
      storageRef: r.storageRef,
      originalFileHash: r.originalFileHash,
      brandedStorageRef: r.brandedStorageRef || undefined,
      brandedFileHash: r.brandedFileHash || undefined,
      fileSize: r.fileSize,
      changeNotes: r.changeNotes || undefined,
      createdBy: r.createdBy || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Error in getDocumentVersionsFromDb:', err);
    return [];
  }
}

/**
 * Get download events log for administrative tracking
 */
export async function getDocumentDownloadEventsFromDb(documentId: string, limit: number = 50): Promise<DocumentDownloadEvent[]> {
  if (!db) return [];

  try {
    const rows = await db
      .select()
      .from(documentDownloadEvents)
      .where(eq(documentDownloadEvents.documentId, documentId))
      .orderBy(desc(documentDownloadEvents.downloadedAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      documentType: r.documentType,
      userUid: r.userUid || undefined,
      anonymousSessionId: r.anonymousSessionId || undefined,
      ipAddress: r.ipAddress || undefined,
      userAgent: r.userAgent || undefined,
      version: r.version || 1,
      downloadedAt: r.downloadedAt ? new Date(r.downloadedAt).toISOString() : new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Error in getDocumentDownloadEventsFromDb:', err);
    return [];
  }
}
