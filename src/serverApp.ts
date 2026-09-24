import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import {
  brandPdfBuffer,
  brandTextContent,
  computeHash,
  TALEEM_BRAND_FOOTER,
  TALEEM_WEBSITE_URL,
} from './server/documentBranding.ts';
import {
  safeFetchRemoteDocument,
  resolveSafeLocalFilePath,
  sanitizeDownloadFilename,
  MAX_DOCUMENT_SIZE_BYTES,
} from './server/documentSecurity.ts';
import {
  processAndStoreDocument,
  createDocumentVersion,
  rebrandDocument,
  recordDocumentDownload,
  getSafeBrandedPath,
  getSafeOriginalPath,
  validateMagicBytes,
} from './server/documentStorage.ts';
import {
  executeUnifiedSearch,
  getQuickSearchSuggestions,
  getDynamicSearchFilters,
} from './server/unifiedSearch.ts';
import {
  getAdminAnalytics,
  getTeacherAnalytics,
  getStudentAnalytics,
  type AnalyticsDateFilter,
} from './db/analytics.ts';
import {
  createNotification,
  getNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from './db/notifications.ts';
import {
  runDatabaseIntegrityCheck,
  generateSystemBackupExport,
} from './db/integrityBackup.ts';
import {
  getSystemHealthReport,
  checkDatabaseHealth,
} from './server/productionReliability.ts';
import {
  generateDynamicSitemap,
  generateRobotsTxt,
  getDynamicSeoMetadata,
} from './server/seoServer.ts';
import {
  getDocumentsFromDb,
  getDocumentByIdFromDb,
  updateDocumentMetadataInDb,
  bulkUpdateDocumentMetadataInDb,
  bulkUpdateDocumentStatusInDb,
  deleteDocumentFromDb,
  getDocumentVersionsFromDb,
  getDocumentDownloadEventsFromDb,
} from './db/documents.ts';
import {
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireHighAdmin,
  requireContentManager,
  requireMCQCurator,
  requireQuizCreator,
  requireContentCurator,
  requireTeacher,
  getSupabaseServerClient,
  type AuthRequest,
} from './middleware/auth.ts';
import { isAcademicAssignmentAllowed } from './lib/permissions.ts';
import {
  initExamSystemTables,
  startExamAttemptInDb,
  saveExamAnswerInDb,
  submitExamAttemptInDb,
  getExamAttemptResultFromDb,
  getUserExamHistoryFromDb,
  getAllExamAttemptsFromDb,
  getUserActiveExamAttempt,
  getStudentDashboardStats,
  getStudentPerformanceAnalytics,
  getTeacherDashboardStats,
} from './db/exams.ts';
import {
  getOrCreateUser,
  getUserByUid,
  updateUserProfile,
  sanitizeUserForClient,
  saveTestResultToDb,
  getUserTestResultsFromDb,
  getTopLeaderboard,
  toggleBookmarkInDb,
  getUserBookmarksFromDb,
  getAllUsersFromDb,
  saveCertificateToDb,
  getUserCertificatesFromDb,
  getCertificateByIdFromDb,
  getPlatformPublicStats,
  getAllTestResultsFromDb,
  saveContentReportToDb,
  getAllContentReportsFromDb,
  updateContentReportStatusInDb,
  saveAuditLogToDb,
  getAllAuditLogsFromDb,
  updateUserRolesInDb,
  createUserInDb,
  updateUserStatusInDb,
  updateUserPermissionsInDb,
  getStaffAssignmentsFromDb,
  addStaffAssignmentToDb,
  deleteStaffAssignmentFromDb,
  getBoardsFromDb,
  addBoardToDb,
  updateBoardInDb,
  deleteBoardFromDb,
  getClassesFromDb,
  addClassToDb,
  updateClassInDb,
  deleteClassFromDb,
  getSubjectsFromDb,
  addSubjectToDb,
  updateSubjectInDb,
  deleteSubjectFromDb,
  getChaptersFromDb,
  addChapterToDb,
  updateChapterInDb,
  deleteChapterFromDb,
  getSyllabusFromDb,
  addSyllabusToDb,
  updateSyllabusInDb,
  deleteSyllabusFromDb,
  getAdminComprehensiveStats,
  getAllCertificatesFromDb,
  revokeCertificateInDb,
  restoreCertificateInDb,
  syncBootstrapAdmins,
  isTrustedBootstrapAdminEmail,
  getTrustedBootstrapAdmins,
  getUserByEmail,
  verifyPassword,
  hashPassword,
  setUserPasswordInDb,
} from './db/users.ts';
import {
  getMCQsFromDb,
  getMCQByIdFromDb,
  createMCQInDb,
  updateMCQInDb,
  deleteMCQInDb,
  bulkInsertMCQsInDb,
  bulkUpdateMCQStatusInDb,
  bulkDeleteMCQsInDb,
  bulkCreateMCQsBatchInDb,
  getTestsFromDb,
  getTestByIdFromDb,
  createTestInDb,
  updateTestInDb,
  deleteTestInDb,
  bulkInsertTestsInDb,
  bulkUpdateTestStatusInDb,
  bulkDeleteTestsInDb,
  getPastPapersFromDb,
  getPastPaperByIdFromDb,
  createPastPaperInDb,
  updatePastPaperInDb,
  deletePastPaperInDb,
  bulkInsertPastPapersInDb,
  bulkUpdatePastPaperStatusInDb,
  bulkDeletePastPapersInDb,
  getStudyNotesFromDb,
  getStudyNoteByIdFromDb,
  createStudyNoteInDb,
  updateStudyNoteInDb,
  deleteStudyNoteInDb,
  bulkInsertStudyNotesInDb,
  bulkUpdateStudyNoteStatusInDb,
  bulkDeleteStudyNotesInDb,
  getComprehensiveStatsFromDb,
  seedInitialEducationalContent,
  seedInitialHierarchy,
  getBoardsFromDb as getHierarchyBoards,
  createBoardInDb as createHierarchyBoard,
  updateBoardInDb as updateHierarchyBoard,
  deleteBoardInDb as deleteHierarchyBoard,
  getClassesFromDb as getHierarchyClasses,
  createClassInDb as createHierarchyClass,
  updateClassInDb as updateHierarchyClass,
  deleteClassInDb as deleteHierarchyClass,
  getSubjectsFromDb as getHierarchySubjects,
  createSubjectInDb as createHierarchySubject,
  updateSubjectInDb as updateHierarchySubject,
  deleteSubjectInDb as deleteHierarchySubject,
  getChaptersFromDb as getHierarchyChapters,
  createChapterInDb as createHierarchyChapter,
  updateChapterInDb as updateHierarchyChapter,
  deleteChapterInDb as deleteHierarchyChapter,
  moderateContentItemInDb,
  bulkModerateContentInDb,
  getContentVersionHistoryFromDb,
} from './db/content.ts';

const app = express();

if (!process.env.VERCEL) {
  // Authoritatively synchronize configured administrative identities and initial educational content
  syncBootstrapAdmins().catch((err) => {
    console.warn('[Server] Initial admin bootstrap sync notice:', err);
  });
  initExamSystemTables().catch((err) => {
    console.warn('[Server] Initial exam tables notice:', err);
  });
  seedInitialEducationalContent().catch((err) => {
    console.warn('[Server] Initial educational content seeding notice:', err);
  });
  seedInitialHierarchy().catch((err) => {
    console.warn('[Server] Initial hierarchy seeding notice:', err);
  });
}

// Security Headers for API responses
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.path.startsWith('/api') || req.path === '/api') {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});

// CORS Middleware with origin validation (No wildcards for authenticated production APIs)
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const configuredOrigin = process.env.VITE_SITE_URL || process.env.SITE_URL;
  const allowedOrigins = [
    configuredOrigin,
    'https://www.taleemguru.pk',
    'https://taleemguru.pk',
  ].filter(Boolean) as string[];

  if (origin) {
    const isLocalDev =
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('.run.app') ||
      origin.includes('.vercel.app');

    if (isLocalDev || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Router for all /api endpoints
const apiRouter = express.Router();

// 1. Production Health & Readiness Endpoints
apiRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const report = await getSystemHealthReport();
    res.status(report.status === 'unhealthy' ? 503 : 200).json(report);
  } catch (error: any) {
    res.status(500).json({ status: 'unhealthy', timestamp: new Date().toISOString(), error: 'Health check failed' });
  }
});

apiRouter.get('/readiness', async (req: Request, res: Response) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.json({ status: 'ready', database: dbHealth, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  }
});

apiRouter.get('/db-health', async (req: Request, res: Response) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.status(200).json(dbHealth);
  } catch (error: any) {
    res.status(200).json({ connected: false, latencyMs: 0, error: 'Database health check failed' });
  }
});

// Rate limiter for Document Branding and Protected Downloads (60 requests / minute per client IP)
const docRateLimitMap = new Map<string, { count: number; firstSeen: number }>();
function documentRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'ip';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;

  const record = docRateLimitMap.get(clientIp);
  if (!record || now - record.firstSeen > windowMs) {
    docRateLimitMap.set(clientIp, { count: 1, firstSeen: now });
    return next();
  }

  record.count += 1;
  if (record.count > maxRequests) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'Too many document requests. Please wait a minute before trying again.',
    });
  }

  next();
}

// Helper functions to authoritatively check staff access on server
function isStaffUser(user?: AuthRequest['user']): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  if (isTrustedBootstrapAdminEmail(email)) return true;
  const staffRoles = ['admin', 'superadmin', 'super_admin', 'administrator', 'teacher', 'editor', 'contentmanager', 'content_manager', 'moderator'];
  const userRoles = (user.roles || []).map(r => r.trim().toLowerCase().replace(/\s+/g, '_'));
  return userRoles.some(r => staffRoles.includes(r));
}

function isAdminOrContentManager(user?: AuthRequest['user']): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  if (isTrustedBootstrapAdminEmail(email)) return true;
  const privilegedRoles = ['admin', 'superadmin', 'super_admin', 'administrator', 'contentmanager', 'content_manager'];
  const userRoles = (user.roles || []).map(r => r.trim().toLowerCase().replace(/\s+/g, '_'));
  return userRoles.some(r => privilegedRoles.includes(r));
}

function isModeratorOrEditorOrAdmin(user?: AuthRequest['user']): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  if (isTrustedBootstrapAdminEmail(email)) return true;
  const modRoles = ['admin', 'superadmin', 'super_admin', 'administrator', 'editor', 'moderator', 'contentmanager', 'content_manager'];
  const userRoles = (user.roles || []).map(r => r.trim().toLowerCase().replace(/\s+/g, '_'));
  return userRoles.some(r => modRoles.includes(r));
}

// Centralized Document Branding & Protected Download Router
const documentRouter = express.Router();

documentRouter.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'active',
    brandingVersion: '2.0',
    brandingFooter: TALEEM_BRAND_FOOTER,
    website: TALEEM_WEBSITE_URL,
    timestamp: new Date().toISOString(),
  });
});

// List documents with strict status access control
documentRouter.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isStaff = isStaffUser(req.user);
    const filters = {
      status: req.query.status as string,
      documentType: req.query.documentType as string,
      board: req.query.board as string,
      classLevel: req.query.classLevel as string,
      subject: req.query.subject as string,
      chapter: req.query.chapter as string,
      year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
      search: req.query.search as string,
      limit: req.query.limit ? Math.min(200, parseInt(req.query.limit as string, 10)) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    };

    const { items, total } = await getDocumentsFromDb(filters, isStaff);
    res.json({ documents: items, total });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});

// Single document metadata by ID
documentRouter.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isStaff = isStaffUser(req.user);
    const doc = await getDocumentByIdFromDb(req.params.id, isStaff);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or access restricted' });
    }
    res.json({ document: doc });
  } catch (error: any) {
    console.error('Error fetching document by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
});

// Upload and automatically brand document
documentRouter.post('/upload', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    let inputBuffer: Buffer;
    const body = req.body || {};
    const rawFilename = body.filename || req.query.filename as string || 'document.pdf';
    const originalFilename = typeof rawFilename === 'string' ? rawFilename : 'document.pdf';

    if (Buffer.isBuffer(req.body)) {
      inputBuffer = req.body;
    } else if (body.fileBase64) {
      if (typeof body.fileBase64 !== 'string') {
        return res.status(400).json({ error: 'fileBase64 must be a string' });
      }
      inputBuffer = Buffer.from(body.fileBase64, 'base64');
    } else {
      return res.status(400).json({ error: 'No document file data provided' });
    }

    if (inputBuffer.length > MAX_DOCUMENT_SIZE_BYTES) {
      return res.status(400).json({ error: 'Uploaded file exceeds maximum limit of 25MB' });
    }

    const options = {
      title: body.title,
      documentType: body.documentType,
      board: body.board,
      classLevel: body.classLevel,
      subject: body.subject,
      chapter: body.chapter,
      topic: body.topic,
      year: body.year ? parseInt(body.year, 10) : undefined,
      language: body.language || 'English',
      status: body.status || 'Published',
      associatedEntityId: body.associatedEntityId,
      allowDuplicate: Boolean(body.allowDuplicate),
    };

    const result = await processAndStoreDocument(inputBuffer, originalFilename, options, req.user?.uid);

    if (!result.success) {
      if (result.isDuplicate) {
        return res.status(409).json({
          error: result.error,
          isDuplicate: true,
          existingDocumentId: result.existingDocumentId,
        });
      }
      return res.status(400).json({ error: result.error || 'Failed to process document' });
    }

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'UPLOAD_DOCUMENT',
      targetType: 'DOCUMENT',
      targetId: result.document!.id,
      details: `Uploaded document: "${result.document!.title}" (${result.document!.originalFilename}, ${result.document!.documentType})`,
      subject: result.document!.subject,
      classLevel: result.document!.classLevel,
      board: result.document!.board,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, document: result.document });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: error.message || 'Error processing document upload' });
  }
});

// Bulk upload documents
documentRouter.post('/bulk-upload', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const files = req.body?.files;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files array is required' });
    }

    const uploaded = [];
    const duplicates = [];
    const errors = [];

    for (const item of files) {
      try {
        if (!item.fileBase64 || !item.filename) {
          errors.push({ filename: item.filename || 'unknown', error: 'Missing base64 data or filename' });
          continue;
        }

        const buffer = Buffer.from(item.fileBase64, 'base64');
        const resObj = await processAndStoreDocument(
          buffer,
          item.filename,
          {
            title: item.title,
            documentType: item.metadata?.documentType || 'Document',
            board: item.metadata?.board,
            classLevel: item.metadata?.classLevel,
            subject: item.metadata?.subject,
            chapter: item.metadata?.chapter,
            year: item.metadata?.year,
            language: item.metadata?.language || 'English',
            status: item.metadata?.status || 'Published',
            allowDuplicate: Boolean(item.metadata?.allowDuplicate),
          },
          req.user?.uid
        );

        if (resObj.success && resObj.document) {
          uploaded.push(resObj.document);
        } else if (resObj.isDuplicate) {
          duplicates.push({ filename: item.filename, existingDocumentId: resObj.existingDocumentId });
        } else {
          errors.push({ filename: item.filename, error: resObj.error || 'Failed' });
        }
      } catch (itemErr: any) {
        errors.push({ filename: item.filename, error: itemErr.message });
      }
    }

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_UPLOAD_DOCUMENTS',
      targetType: 'DOCUMENT_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Bulk uploaded ${uploaded.length} documents (${duplicates.length} duplicates, ${errors.length} errors)`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      uploadedCount: uploaded.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      uploaded,
      duplicates,
      errors,
    });
  } catch (error: any) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({ error: error.message || 'Failed to process bulk upload' });
  }
});

// Bulk update metadata
documentRouter.post('/bulk-metadata', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const { ids, metadata } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).json({ error: 'metadata object is required' });
    }

    const count = await bulkUpdateDocumentMetadataInDb(ids, metadata, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_UPDATE_DOCUMENT_METADATA',
      targetType: 'DOCUMENT_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Updated metadata on ${count} documents`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count });
  } catch (error: any) {
    console.error('Error in bulk metadata update:', error);
    res.status(500).json({ error: 'Failed to update metadata' });
  }
});

// Bulk update status
documentRouter.post('/bulk-status', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    if (!['Published', 'Draft', 'Archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Published, Draft, or Archived' });
    }

    const count = await bulkUpdateDocumentStatusInDb(ids, status, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_STATUS_DOCUMENTS',
      targetType: 'DOCUMENT_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Updated status to "${status}" on ${count} documents`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count });
  } catch (error: any) {
    console.error('Error in bulk status update:', error);
    res.status(500).json({ error: 'Failed to update document status' });
  }
});

// Update document metadata
documentRouter.put('/:id', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await updateDocumentMetadataInDb(req.params.id, req.body, req.user?.uid);
    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'UPDATE_DOCUMENT',
      targetType: 'DOCUMENT',
      targetId: req.params.id,
      details: `Updated document: ${updated.title}`,
      subject: updated.subject,
      classLevel: updated.classLevel,
      board: updated.board,
      ipAddress: req.ip,
    });

    res.json({ success: true, document: updated });
  } catch (error: any) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: error.message || 'Failed to update document' });
  }
});

// Upload new version of document
documentRouter.post('/:id/version', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const { fileBase64, filename, changeNotes } = req.body || {};
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: 'fileBase64 string is required' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const result = await createDocumentVersion(req.params.id, buffer, filename || 'updated.pdf', changeNotes, req.user?.uid);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to create new document version' });
    }

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'NEW_DOCUMENT_VERSION',
      targetType: 'DOCUMENT',
      targetId: req.params.id,
      details: `Created version ${result.document?.version} for "${result.document?.title}"`,
      ipAddress: req.ip,
    });

    res.json({ success: true, document: result.document });
  } catch (error: any) {
    console.error('Error creating document version:', error);
    res.status(500).json({ error: error.message || 'Failed to create document version' });
  }
});

// Re-brand document copy from immutable original
documentRouter.post('/:id/rebrand', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const result = await rebrandDocument(req.params.id);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to rebrand document' });
    }

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'REBRAND_DOCUMENT',
      targetType: 'DOCUMENT',
      targetId: req.params.id,
      details: `Rebranded document ${req.params.id} (new hash: ${result.brandedHash?.substring(0, 12)}...)`,
      ipAddress: req.ip,
    });

    res.json({ success: true, brandedHash: result.brandedHash });
  } catch (error: any) {
    console.error('Error rebranding document:', error);
    res.status(500).json({ error: error.message || 'Failed to rebrand document' });
  }
});

// Document versions history
documentRouter.get('/:id/versions', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const versions = await getDocumentVersionsFromDb(req.params.id);
    res.json({ versions });
  } catch (error: any) {
    console.error('Error fetching document versions:', error);
    res.status(500).json({ error: 'Failed to retrieve document versions' });
  }
});

// Real download events log
documentRouter.get('/:id/downloads', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const events = await getDocumentDownloadEventsFromDb(req.params.id);
    res.json({ events, count: events.length });
  } catch (error: any) {
    console.error('Error fetching document downloads:', error);
    res.status(500).json({ error: 'Failed to retrieve download records' });
  }
});

// Delete document
documentRouter.delete('/:id', requireContentManager, async (req: AuthRequest, res: Response) => {
  try {
    const success = await deleteDocumentFromDb(req.params.id);
    if (!success) {
      return res.status(400).json({ error: 'Failed to delete document' });
    }

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'DELETE_DOCUMENT',
      targetType: 'DOCUMENT',
      targetId: req.params.id,
      details: `Deleted document ${req.params.id}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Document deleted' });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Secure, Authoritative Document Download Endpoint
documentRouter.get('/:id/download', documentRateLimitMiddleware, optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const docId = req.params.id;
    const doc = await getDocumentByIdFromDb(docId, true);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Role-enforced access check: Draft and Archived documents are strictly restricted to staff
    const isStaff = isStaffUser(req.user);
    if (doc.status !== 'Published' && !isStaff) {
      return res.status(403).json({ error: 'Access denied: Document is not published' });
    }

    // Original file download check: ONLY Admins or ContentManagers can request the unbranded original
    const requestOriginal = req.query.original === 'true';
    let fileInfo: { valid: boolean; filePath?: string; error?: string };

    if (requestOriginal) {
      if (!isAdminOrContentManager(req.user)) {
        return res.status(403).json({ error: 'Access denied: Administrative privileges required to download unbranded original' });
      }
      fileInfo = getSafeOriginalPath(doc);
    } else {
      fileInfo = getSafeBrandedPath(doc);
    }

    if (!fileInfo.valid || !fileInfo.filePath) {
      return res.status(404).json({ error: fileInfo.error || 'Document file unavailable on storage' });
    }

    // Asynchronously record real download event
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent']?.substring(0, 500);
    const sessionId = (req.headers['x-session-id'] as string) || req.cookies?.tg_session_id;

    recordDocumentDownload(doc.id, {
      documentType: doc.documentType,
      userUid: req.user?.uid,
      anonymousSessionId: sessionId,
      ipAddress: clientIp,
      userAgent,
      version: doc.version,
    }).catch((recErr) => console.warn('Failed to record download event:', recErr));

    // Send the file with secure headers
    res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.sanitizedFilename}"`);
    res.setHeader('X-TaleemGuru-Branded', (!requestOriginal && doc.brandingStatus === 'Completed') ? 'true' : 'false');
    res.setHeader('X-TaleemGuru-Doc-Id', doc.id);
    res.setHeader('X-TaleemGuru-Version', doc.version.toString());

    const fileStream = fs.createReadStream(fileInfo.filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Error in document download:', error);
    res.status(500).json({ error: 'Failed to process document download' });
  }
});

// Secure Document Preview Endpoint (serves PDF inline)
documentRouter.get('/:id/preview', documentRateLimitMiddleware, optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const docId = req.params.id;
    const doc = await getDocumentByIdFromDb(docId, true);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const isStaff = isStaffUser(req.user);
    if (doc.status !== 'Published' && !isStaff) {
      return res.status(403).json({ error: 'Access denied: Document is not published' });
    }

    const fileInfo = getSafeBrandedPath(doc);
    if (!fileInfo.valid || !fileInfo.filePath) {
      return res.status(404).json({ error: fileInfo.error || 'Preview file unavailable' });
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.sanitizedFilename}"`);
    const fileStream = fs.createReadStream(fileInfo.filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Error in document preview:', error);
    res.status(500).json({ error: 'Failed to stream document preview' });
  }
});

// Reprocess all existing documents (Admin only)
documentRouter.post('/reprocess-all', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { items } = await getDocumentsFromDb({ limit: 500 }, true);
    let reprocessed = 0;
    const errors = [];

    for (const doc of items) {
      if (doc.mimeType === 'application/pdf' && doc.brandingStatus !== 'Completed') {
        const rebrandResult = await rebrandDocument(doc.id);
        if (rebrandResult.success) {
          reprocessed++;
        } else {
          errors.push({ id: doc.id, error: rebrandResult.error });
        }
      }
    }

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'REPROCESS_DOCUMENTS',
      targetType: 'DOCUMENT_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Reprocessed ${reprocessed} documents (${errors.length} errors)`,
      ipAddress: req.ip,
    });

    res.json({ success: true, reprocessed, errorsCount: errors.length, errors });
  } catch (error: any) {
    console.error('Error reprocessing documents:', error);
    res.status(500).json({ error: 'Failed to reprocess documents' });
  }
});

// Legacy Branding & Protected Download Routes (Preserved for compatibility)
documentRouter.post('/brand', documentRateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    let inputBuffer: Buffer;
    const rawFilename = (req.query.filename as string) || req.body?.filename || 'document.pdf';
    const rawTitle = (req.query.title as string) || req.body?.title || 'Study Document';
    const filename = sanitizeDownloadFilename(rawFilename, 'document.pdf');
    const title = typeof rawTitle === 'string' ? rawTitle.substring(0, 256) : 'Study Document';

    if (Buffer.isBuffer(req.body)) {
      if (req.body.length > MAX_DOCUMENT_SIZE_BYTES) {
        return res.status(400).json({ error: 'Uploaded document exceeds maximum size limit (25MB)' });
      }
      inputBuffer = req.body;
    } else if (req.body?.fileBase64) {
      if (typeof req.body.fileBase64 !== 'string') {
        return res.status(400).json({ error: 'fileBase64 must be a valid base64 string' });
      }
      if (req.body.fileBase64.length > MAX_DOCUMENT_SIZE_BYTES * 1.4) {
        return res.status(400).json({ error: 'Document exceeds maximum size limit (25MB)' });
      }
      inputBuffer = Buffer.from(req.body.fileBase64, 'base64');
      if (inputBuffer.length > MAX_DOCUMENT_SIZE_BYTES) {
        return res.status(400).json({ error: 'Decoded document exceeds maximum size limit (25MB)' });
      }
    } else if (req.body?.url) {
      const urlStr = String(req.body.url);
      const fetched = await safeFetchRemoteDocument(urlStr);
      inputBuffer = fetched.buffer;
    } else {
      return res.status(400).json({ error: 'Missing valid fileBase64, url, or binary payload' });
    }

    const result = await brandPdfBuffer(inputBuffer, { title });
    res.json({
      success: true,
      filename: filename.endsWith('.pdf') ? filename : `${filename}_TaleemGuru.pdf`,
      brandedBase64: result.buffer.toString('base64'),
      wasAlreadyBranded: result.wasAlreadyBranded,
      pageCount: result.pageCount,
      hash: computeHash(result.buffer),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to process and brand document' });
  }
});

documentRouter.get('/download', documentRateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const rawUrl = (req.query.url as string || req.query.fileId as string || '').trim();
    const rawFilename = (req.query.filename as string) || 'TaleemGuru_Document.pdf';
    const rawTitle = (req.query.title as string) || 'TaleemGuru Study Resource';

    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing required document url or fileId parameter' });
    }

    if (rawUrl.length > 2048) {
      return res.status(400).json({ error: 'URL parameter exceeds maximum allowed length' });
    }

    const filename = sanitizeDownloadFilename(rawFilename, 'TaleemGuru_Document.pdf');
    const title = typeof rawTitle === 'string' ? rawTitle.substring(0, 256) : 'TaleemGuru Study Resource';

    let inputBuffer: Buffer;
    let contentType = 'application/pdf';

    if (rawUrl.startsWith('/')) {
      const localResolution = resolveSafeLocalFilePath(rawUrl);
      if (!localResolution.valid || !localResolution.absolutePath) {
        return res.status(403).json({ error: localResolution.error || 'Access denied' });
      }
      inputBuffer = fs.readFileSync(localResolution.absolutePath);
      if (rawUrl.endsWith('.txt')) contentType = 'text/plain';
      else if (rawUrl.endsWith('.md')) contentType = 'text/markdown';
    } else {
      const fetched = await safeFetchRemoteDocument(rawUrl);
      inputBuffer = fetched.buffer;
      contentType = fetched.contentType;
    }

    if (contentType.includes('pdf') || rawUrl.toLowerCase().endsWith('.pdf') || filename.toLowerCase().endsWith('.pdf')) {
      const brandedResult = await brandPdfBuffer(inputBuffer, { title });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename.endsWith('.pdf') ? filename : `${filename}_TaleemGuru.pdf`}"`);
      res.setHeader('X-TaleemGuru-Branded', 'true');
      res.setHeader('X-TaleemGuru-Was-Already-Branded', brandedResult.wasAlreadyBranded.toString());
      return res.send(brandedResult.buffer);
    }

    if (contentType.includes('text') || contentType.includes('markdown')) {
      const brandedText = brandTextContent(inputBuffer.toString('utf-8'), title);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(brandedText);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(inputBuffer);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error processing document download' });
  }
});

apiRouter.use('/documents', documentRouter);

// Centralized Unified Search & Discovery Router
const searchRouter = express.Router();

// 1. Unified Search Query across MCQs, Tests, Past Papers, Notes, Documents, Curriculum
searchRouter.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isStaff = isStaffUser(req.user);
    const filters = {
      query: (req.query.q || req.query.query || req.query.search || '') as string,
      type: (req.query.type || 'all') as any,
      board: req.query.board as string,
      classLevel: (req.query.classLevel || req.query.class) as string,
      subject: req.query.subject as string,
      chapter: req.query.chapter as string,
      year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
      status: req.query.status as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? Math.min(100, parseInt(req.query.limit as string, 10)) : 20,
    };

    const searchResponse = await executeUnifiedSearch(filters, isStaff);
    res.json(searchResponse);
  } catch (error: any) {
    console.error('Unified search API error:', error);
    res.status(500).json({ error: error.message || 'Error executing search' });
  }
});

// 2. Fast Autocomplete & Suggestions
searchRouter.get('/suggestions', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isStaff = isStaffUser(req.user);
    const query = (req.query.q || req.query.query || '') as string;
    const suggestions = await getQuickSearchSuggestions(query, isStaff);
    res.json({ suggestions });
  } catch (error: any) {
    console.error('Search suggestions API error:', error);
    res.status(500).json({ error: error.message || 'Error fetching search suggestions' });
  }
});

// 3. Dynamic Filter Options directly from PostgreSQL
searchRouter.get('/filters', async (req: Request, res: Response) => {
  try {
    const filters = await getDynamicSearchFilters();
    res.json(filters);
  } catch (error: any) {
    console.error('Search filters API error:', error);
    res.status(500).json({ error: error.message || 'Error fetching search filters' });
  }
});

apiRouter.use('/search', searchRouter);

// 2. Content Management Router
const contentRouter = express.Router();

contentRouter.get('/boards', requireContentManager, async (req, res) => {
  res.json(await getBoardsFromDb());
});
contentRouter.post('/boards', requireContentManager, async (req, res) => {
  try {
    res.json(await addBoardToDb(req.body.name));
  } catch (error: any) {
    if (error.message === 'DUPLICATE_BOARD') return res.status(409).json({ error: 'A board with this name already exists.' });
    res.status(500).json({ error: 'Failed to add board' });
  }
});

contentRouter.put('/boards/:id', requireContentManager, async (req, res) => {
  try {
    res.json(await updateBoardInDb(parseInt(req.params.id), req.body));
  } catch (error: any) {
    if (error.message === 'DUPLICATE_BOARD') return res.status(409).json({ error: 'A board with this name already exists.' });
    res.status(500).json({ error: 'Failed to update board' });
  }
});

contentRouter.post('/classes', requireContentManager, async (req, res) => {
  try {
    res.json(await addClassToDb(req.body.boardId, req.body.name));
  } catch (error: any) {
    if (error.message === 'DUPLICATE_CLASS') return res.status(409).json({ error: 'A class with this name already exists in this board.' });
    res.status(500).json({ error: 'Failed to add class' });
  }
});

contentRouter.put('/classes/:id', requireContentManager, async (req, res) => {
  try {
    res.json(await updateClassInDb(parseInt(req.params.id), req.body));
  } catch (error: any) {
    if (error.message === 'DUPLICATE_CLASS') return res.status(409).json({ error: 'A class with this name already exists in this board.' });
    res.status(500).json({ error: 'Failed to update class' });
  }
});

contentRouter.post('/subjects', requireContentManager, async (req, res) => {
  try {
    res.json(await addSubjectToDb(req.body.classId, req.body.name));
  } catch (error: any) {
    if (error.message === 'DUPLICATE_SUBJECT') return res.status(409).json({ error: 'A subject with this name already exists in this class.' });
    res.status(500).json({ error: 'Failed to add subject' });
  }
});

contentRouter.put('/subjects/:id', requireContentManager, async (req, res) => {
  try {
    res.json(await updateSubjectInDb(parseInt(req.params.id), req.body));
  } catch (error: any) {
    if (error.message === 'DUPLICATE_SUBJECT') return res.status(409).json({ error: 'A subject with this name already exists in this class.' });
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

contentRouter.post('/chapters', requireContentManager, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const saved = await addChapterToDb(req.body.subjectId, req.body.name);
    const subjectsList = await getSubjectsFromDb();
    const subject = subjectsList.find(s => s.id === req.body.subjectId);

    await saveAuditLogToDb({
      adminUid: user.uid,
      adminEmail: user.email || 'unknown',
      adminName: user.name || 'Staff',
      action: 'CREATE_CHAPTER',
      targetType: 'CHAPTER',
      targetId: String(saved[0].id),
      details: `Created chapter: ${req.body.name}`,
      subject: subject ? subject.name : String(req.body.subjectId)
    });

    res.json(saved);
  } catch (error: any) {
    if (error.message === 'DUPLICATE_CHAPTER') return res.status(409).json({ error: 'A chapter with this name already exists in this subject.' });
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

contentRouter.put('/chapters/:id', requireContentManager, async (req, res) => {
  try {
    res.json(await updateChapterInDb(parseInt(req.params.id), req.body));
  } catch (error: any) {
    if (error.message === 'DUPLICATE_CHAPTER') return res.status(409).json({ error: 'A chapter with this name already exists in this subject.' });
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});
contentRouter.delete('/chapters/:id', requireContentManager, async (req, res) => {
  res.json(await deleteChapterFromDb(parseInt(req.params.id)));
});

contentRouter.get('/syllabus', requireContentManager, async (req, res) => {
  res.json(await getSyllabusFromDb());
});
contentRouter.post('/syllabus', requireContentManager, async (req, res) => {
  res.json(await addSyllabusToDb(req.body.subjectId, req.body.content));
});
contentRouter.put('/syllabus/:id', requireContentManager, async (req, res) => {
  res.json(await updateSyllabusInDb(parseInt(req.params.id), req.body.content));
});
contentRouter.delete('/syllabus/:id', requireContentManager, async (req, res) => {
  res.json(await deleteSyllabusFromDb(parseInt(req.params.id)));
});

apiRouter.use('/content', contentRouter);

// Rate Limiting Table for Authentication Protection
interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number;
}
const loginRateLimitMap = new Map<string, RateLimitRecord>();

function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = loginRateLimitMap.get(key);
  if (!record) {
    loginRateLimitMap.set(key, { attempts: 1, firstAttempt: now, blockedUntil: 0 });
    return { allowed: true };
  }

  if (record.blockedUntil > now) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  // Reset window after 60 seconds
  if (now - record.firstAttempt > 60 * 1000) {
    record.attempts = 1;
    record.firstAttempt = now;
    record.blockedUntil = 0;
    return { allowed: true };
  }

  record.attempts += 1;
  // Maximum 6 attempts per minute
  if (record.attempts > 6) {
    record.blockedUntil = now + 60 * 1000;
    return { allowed: false, retryAfterSeconds: 60 };
  }

  return { allowed: true };
}

function clearLoginRateLimit(key: string) {
  loginRateLimitMap.delete(key);
}

// 1b. Authoritative Staff & Administrator Authentication Endpoint
apiRouter.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid administrator or staff email address.' });
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Rate Limiting by IP and Target Email
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || 'ip';
    const rateLimitKey = `${clientIp}:${cleanEmail}`;
    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many login attempts. Please wait ${rateCheck.retryAfterSeconds || 60} seconds before trying again.`,
      });
    }

    // 1. Authenticate against Supabase Auth using submitted email and password
    const supabase = getSupabaseServerClient();
    let authenticatedUser: { id: string; email?: string; user_metadata?: any } | null = null;
    let authFailed = false;

    if (supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (authError || !authData?.user) {
          authFailed = true;
        } else {
          authenticatedUser = {
            id: authData.user.id,
            email: authData.user.email,
            user_metadata: authData.user.user_metadata,
          };
        }
      } catch (err) {
        console.warn('Supabase signInWithPassword error:', err);
        authFailed = true;
      }
    } else {
      // Supabase is unconfigured
      authFailed = true;
    }

    // Database cryptographic password verification (for staff accounts created by admin)
    if (!authenticatedUser) {
      try {
        const dbCandidate = await getUserByEmail(cleanEmail);
        if (dbCandidate) {
          const pwdToken = (dbCandidate.permissions || []).find((p: string) => p.startsWith('__auth_pwd:'));
          if (pwdToken && verifyPassword(cleanPassword, pwdToken)) {
            authenticatedUser = {
              id: dbCandidate.uid,
              email: dbCandidate.email,
              user_metadata: { name: dbCandidate.name, roles: dbCandidate.roles },
            };
            authFailed = false;
          }
        }
      } catch (dbAuthErr) {
        console.warn('Notice in database password verification:', dbAuthErr);
      }
    }

    // Trusted bootstrap administrator fallback verification
    if (!authenticatedUser && isTrustedBootstrapAdminEmail(cleanEmail)) {
      try {
        const dbCandidate = await getUserByEmail(cleanEmail);
        const pwdToken = (dbCandidate?.permissions || []).find((p: string) => p.startsWith('__auth_pwd:'));
        
        if (pwdToken) {
          if (verifyPassword(cleanPassword, pwdToken)) {
            authenticatedUser = {
              id: dbCandidate!.uid,
              email: dbCandidate!.email,
              user_metadata: { name: dbCandidate!.name, roles: dbCandidate!.roles },
            };
            authFailed = false;
          }
        } else if (cleanPassword.length >= 6) {
          const newUid = dbCandidate?.uid || `admin-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`;
          const pwdHash = hashPassword(cleanPassword);
          
          if (dbCandidate) {
            await updateUserPermissionsInDb(dbCandidate.uid, [pwdHash, ...(dbCandidate.permissions || [])]);
          } else {
            await createUserInDb({
              uid: newUid,
              email: cleanEmail,
              name: 'Administrator',
              roles: ['Admin'],
              password: cleanPassword,
              status: 'Active',
            });
          }

          authenticatedUser = {
            id: newUid,
            email: cleanEmail,
            user_metadata: { name: dbCandidate?.name || 'Administrator', roles: ['Admin'] },
          };
          authFailed = false;
        }
      } catch (bsErr) {
        console.warn('Notice in bootstrap admin login handling:', bsErr);
      }
    }

    // If authentication failed (wrong password, unknown user, unverified credentials), reject with 401
    if (!authenticatedUser) {
      return res.status(401).json({
        error: 'Invalid email or password.',
      });
    }

    // Clear rate limit on successful credentials verification
    clearLoginRateLimit(rateLimitKey);

    // 2. Resolve authoritative role from PostgreSQL database and bootstrap admin list
    const userId = authenticatedUser.id;
    const userEmail = (authenticatedUser.email || cleanEmail).toLowerCase().trim();

    let dbUser = null;
    try {
      dbUser = await getUserByUid(userId);
      if (!dbUser && userEmail) {
        dbUser = await getUserByEmail(userEmail);
      }
    } catch (e) {
      console.warn('DB lookup error in /admin/login:', e);
    }

    const isBootstrap = isTrustedBootstrapAdminEmail(userEmail);
    const bootstrapAdmins = getTrustedBootstrapAdmins();
    const bootstrapConfig = bootstrapAdmins[userEmail];

    const userRoles = dbUser?.roles && Array.isArray(dbUser.roles) && dbUser.roles.length > 0
      ? dbUser.roles
      : (dbUser?.role ? [dbUser.role] : ['Student']);
    const authoritativeRole = isBootstrap ? 'Admin' : (userRoles[0] || 'Student');

    // Check account status
    const accountStatus = (dbUser?.status || 'Active').trim();
    if (accountStatus.toLowerCase() === 'inactive' || accountStatus.toLowerCase() === 'suspended') {
      return res.status(403).json({
        error: `Access Denied: Your staff account is currently marked as ${accountStatus}. Please contact an administrator.`,
      });
    }

    // Verify that the authenticated user possesses an authorized staff or admin role
    const allowedRoles = [
      'admin',
      'superadmin',
      'super_admin',
      'administrator',
      'staff',
      'teacher',
      'editor',
      'contentmanager',
      'content_manager',
      'moderator',
    ];

    const isAuthorizedStaff = isBootstrap || userRoles.some((r: string) => allowedRoles.includes(r.trim().toLowerCase().replace(/\s+/g, '_')));

    if (!isAuthorizedStaff) {
      return res.status(403).json({
        error: `Access Denied: The account ${userEmail} is registered with roles "${userRoles.join(', ')}" and does not possess administrative or staff privileges.`,
      });
    }

    const adminName =
      (isBootstrap ? (bootstrapConfig?.name || 'Admin') : null) ||
      (dbUser?.name && dbUser.name !== 'avatar-1' ? dbUser.name : null) ||
      (authenticatedUser.user_metadata?.name && authenticatedUser.user_metadata?.name !== 'avatar-1' ? authenticatedUser.user_metadata?.name : null) ||
      (authenticatedUser.user_metadata?.full_name && authenticatedUser.user_metadata?.full_name !== 'avatar-1' ? authenticatedUser.user_metadata?.full_name : null) ||
      'Admin';

    // 3. Generate secure signed standard 7-day administrative session JWT
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expSeconds = nowSeconds + 60 * 60 * 24 * 7;

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: userId,
      email: userEmail,
      role: authoritativeRole,
      aud: 'authenticated',
      exp: expSeconds,
      iat: nowSeconds,
      user_metadata: {
        name: adminName,
        role: authoritativeRole,
      },
    })).toString('base64url');

    const crypto = await import('crypto');
    const secret = process.env.SUPABASE_ANON_KEY || process.env.SQL_ADMIN_PASSWORD || 'taleemguru-admin-auth-key';
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    const token = `${header}.${payload}.${signature}`;

    // Ensure database profile exists with authoritative role
    try {
      await getOrCreateUser(userId, userEmail, {
        name: adminName,
      });
    } catch (createErr) {
      console.warn('Notice: Error ensuring user in db during admin login:', createErr);
    }

    return res.json({
      success: true,
      token,
      user: {
        uid: userId,
        email: userEmail,
        name: adminName,
        role: authoritativeRole,
        roles: [authoritativeRole],
        status: accountStatus,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/admin/login:', err);
    return res.status(500).json({ error: 'Internal server error processing admin authentication.' });
  }
});

// 2. User Profile Sync (on Google login / auth state change)
apiRouter.post('/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = (req.user?.email || '').toLowerCase().trim();
    if (!uid) {
      return res.status(400).json({ error: 'Missing UID' });
    }

    const { name, avatar, targetExam, classLevel, board } = req.body;
    const user = await getOrCreateUser(uid, email, {
      name: name || req.user?.name,
      avatar,
      targetExam,
      classLevel,
      board,
    });

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user profile' });
  }
});

// 3. Get Current User Profile
apiRouter.get('/user/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = (req.user?.email || '').toLowerCase().trim();
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const normalizedEmail = email;
    const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);
    const bootstrapAdmins = getTrustedBootstrapAdmins();
    const bootstrapConfig = bootstrapAdmins[normalizedEmail];

    let profile = await getUserByUid(uid);
    if (!profile) {
      // First-time authenticated user: create initial database record
      // Provider name is used ONLY as initial fallback on initial creation
      const initialName = isBootstrap
        ? (bootstrapConfig?.name || 'Admin')
        : (req.user?.name || (email ? email.split('@')[0] : 'Learner'));
      profile = await getOrCreateUser(uid, normalizedEmail, {
        name: initialName,
      });
    }

    if (isBootstrap && profile) {
      profile.roles = ['Admin'];
      profile.name = bootstrapConfig?.name || 'Admin';
    } else if (profile && (profile.name === 'avatar-1' || !profile.name)) {
      profile.name = profile.roles.includes('Admin') ? 'Admin' : (email ? email.split('@')[0] : 'Learner');
    }

    res.json({ profile: sanitizeUserForClient(profile) });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// 4. Update Profile (Authoritative database update when student changes profile)
apiRouter.put('/user/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { name, targetExam, classLevel, board, avatar } = req.body;
    const updated = await updateUserProfile(uid, {
      ...(name ? { name: name.trim() } : {}),
      targetExam,
      classLevel,
      board,
      avatar,
    });

    res.json({ success: true, profile: sanitizeUserForClient(updated) });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 4a. Update Profile (PATCH support)
apiRouter.patch('/user/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { name, targetExam, classLevel, board, avatar } = req.body;
    const updated = await updateUserProfile(uid, {
      ...(name ? { name: name.trim() } : {}),
      targetExam,
      classLevel,
      board,
      avatar,
    });

    res.json({ success: true, profile: sanitizeUserForClient(updated) });
  } catch (error: any) {
    console.error('Error updating profile with PATCH:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 4b. Student / User Self Password Change
apiRouter.post('/user/change-password', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password.' });
    }

    // 1. Verify current password
    let isCurrentPasswordValid = false;

    // Check Supabase Auth
    const supabaseClient = getSupabaseServerClient();
    if (supabaseClient && userEmail) {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword,
        });
        if (!authError && authData?.user) {
          isCurrentPasswordValid = true;
        }
      } catch (e) {
        // Continue to check database hash
      }
    }

    // Check Database hashed password token
    if (!isCurrentPasswordValid) {
      try {
        const dbUser = await getUserByUid(uid);
        if (dbUser) {
          const pwdToken = (dbUser.permissions || []).find((p: string) => p.startsWith('__auth_pwd:'));
          if (pwdToken && verifyPassword(currentPassword, pwdToken)) {
            isCurrentPasswordValid = true;
          }
        }
      } catch (dbErr) {
        console.warn('Notice in db password verification:', dbErr);
      }
    }

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect. Please verify and try again.' });
    }

    // 2. Update password in Supabase Auth if available
    if (supabaseClient && (supabaseClient as any).auth?.admin?.updateUserById) {
      try {
        await (supabaseClient as any).auth.admin.updateUserById(uid, { password: newPassword });
      } catch (authErr) {
        console.warn('Supabase updateUserById notice:', authErr);
      }
    }

    // 3. Update hashed password in database
    const updated = await setUserPasswordInDb(uid, newPassword);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update password in database.' });
    }

    // 4. Save audit log
    await saveAuditLogToDb({
      adminUid: uid,
      adminEmail: userEmail,
      adminName: req.user?.name,
      action: 'PASSWORD_CHANGED',
      targetType: 'user',
      targetId: uid,
      details: `User changed their account password`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error: any) {
    console.error('Error changing student password:', error);
    return res.status(500).json({ error: 'Failed to change password. Please try again.' });
  }
});

// 5. Save Test Result (with deterministic server-side score validation & sanitization)
apiRouter.post('/user/results', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body || {};
    const resultId = String(body.resultId || `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    const testId = String(body.testId || 'test-default').slice(0, 100);
    const testTitle = String(body.testTitle || 'Academic Assessment').slice(0, 200);
    const testType = String(body.testType || 'Quiz').slice(0, 50);
    const subject = String(body.subject || 'General').slice(0, 100);
    const category = String(body.category || 'Academic').slice(0, 100);

    const totalQuestions = Math.max(1, Math.min(500, parseInt(body.totalQuestions) || 10));
    const totalMarks = Math.max(1, Math.min(1000, Number(body.totalMarks) || totalQuestions));
    const correctCount = Math.max(0, Math.min(totalQuestions, parseInt(body.correctCount) || 0));
    const wrongCount = Math.max(0, Math.min(totalQuestions, parseInt(body.wrongCount) || 0));
    const answeredCount = Math.min(totalQuestions, Math.max(0, correctCount + wrongCount));
    const skippedCount = Math.max(0, totalQuestions - answeredCount);

    // Validate client marks deterministically; prevent negative marks or marks > totalMarks
    const marksPerQuestion = totalMarks / totalQuestions;
    const computedMarks = Math.min(totalMarks, Math.max(0, Number(body.marksObtained) || (correctCount * marksPerQuestion)));
    const percentage = Math.min(100, Math.max(0, Math.round((computedMarks / totalMarks) * 100)));

    let grade = 'F';
    if (percentage >= 85) grade = 'A+';
    else if (percentage >= 75) grade = 'A';
    else if (percentage >= 65) grade = 'B';
    else if (percentage >= 50) grade = 'C';

    const timeUsedSeconds = Math.max(1, Math.min(14400, parseInt(body.timeUsedSeconds) || 60));
    const percentileRank = Math.min(99, Math.max(10, parseInt(body.percentileRank) || 85));

    const saved = await saveTestResultToDb({
      resultId,
      userUid: uid,
      testId,
      testTitle,
      testType,
      subject,
      category,
      totalQuestions,
      answeredCount,
      correctCount,
      wrongCount,
      skippedCount,
      marksObtained: computedMarks,
      totalMarks,
      percentage,
      grade,
      timeUsedSeconds,
      percentileRank,
      answers: body.answers || [],
    });

    // Helper for certificate IDs
    const generateUniqueCertificateId = () => {
      const ts = Date.now().toString(36).toUpperCase();
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      return `TG-CERT-${ts}-${rand}`;
    };

    // Automated Certificate Generation
    if (percentage >= 60) {
      try {
        const student = await getUserByUid(uid);
        const certId = generateUniqueCertificateId();
        const verificationUrl = `${process.env.VITE_SITE_URL || 'https://taleemguru.pk'}/verify/${certId}`;
        
        await saveCertificateToDb({
          id: certId,
          userUid: uid,
          studentName: student?.name || 'Valued Student',
          testName: testTitle,
          score: computedMarks,
          totalMarks: totalMarks,
          percentage: percentage,
          grade: grade,
          className: student?.classLevel || 'N/A',
          subjectName: subject,
          status: 'VALID',
          verificationUrl: verificationUrl,
        });
      } catch (certError) {
        console.error('Failed to generate certificate:', certError);
        // Do not fail the submission if certificate generation fails
      }
    }

    res.json({ success: true, result: saved });
  } catch (error: any) {
    console.error('Error saving test result:', error);
    res.status(500).json({ error: 'Failed to save test result' });
  }
});

// 6. Get Test Results History
apiRouter.get('/user/results', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const results = await getUserTestResultsFromDb(uid);
    res.json({ results });
  } catch (error: any) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to retrieve test history' });
  }
});

// 6a. Student Dashboard: Real Authoritative Aggregated Data
apiRouter.get('/student/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const data = await getStudentDashboardStats(uid);
    res.json({ success: true, ...data });
  } catch (error: any) {
    console.error('Error fetching student dashboard data:', error);
    res.status(500).json({ error: 'Failed to retrieve student dashboard data' });
  }
});

// 6b. Student Performance Analytics: Computed ONLY from Authoritative PostgreSQL Records
apiRouter.get('/student/performance', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const analytics = await getStudentPerformanceAnalytics(uid);
    res.json({ success: true, analytics });
  } catch (error: any) {
    console.error('Error fetching student performance analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve performance analytics' });
  }
});

// 6c. Student Active Exam Check: Server-Authoritative Check for In-Progress Attempt
apiRouter.get('/student/active-exam', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const activeExam = await getUserActiveExamAttempt(uid);
    res.json({ success: true, activeExam });
  } catch (error: any) {
    console.error('Error fetching active exam session:', error);
    res.status(500).json({ error: 'Failed to check active exam session' });
  }
});

// 6d. Student Profile Update: Secure Endpoint Restricted to Allowed Student Fields
apiRouter.patch('/student/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { name, classLevel, board, targetExam, avatar } = req.body || {};

    const updated = await updateUserProfile(uid, {
      ...(name && typeof name === 'string' ? { name: name.trim().slice(0, 100) } : {}),
      ...(classLevel && typeof classLevel === 'string' ? { classLevel: classLevel.trim().slice(0, 100) } : {}),
      ...(board && typeof board === 'string' ? { board: board.trim().slice(0, 100) } : {}),
      ...(targetExam && typeof targetExam === 'string' ? { targetExam: targetExam.trim().slice(0, 100) } : {}),
      ...(avatar && typeof avatar === 'string' ? { avatar: avatar.trim().slice(0, 50) } : {}),
    });

    if (!updated) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json({ success: true, profile: updated });
  } catch (error: any) {
    console.error('Error updating student profile:', error);
    res.status(500).json({ error: 'Failed to update student profile' });
  }
});

// 6e. Teacher Dashboard: Real Teacher Metrics & Recent Activity
apiRouter.get('/teacher/dashboard', requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const data = await getTeacherDashboardStats(uid);
    res.json({ success: true, ...data });
  } catch (error: any) {
    console.error('Error fetching teacher dashboard data:', error);
    res.status(500).json({ error: 'Failed to retrieve teacher dashboard data' });
  }
});

// 7. Toggle Bookmark
apiRouter.post('/user/bookmarks/toggle', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { questionId } = req.body;
    if (!questionId) return res.status(400).json({ error: 'Missing questionId' });

    const status = await toggleBookmarkInDb(uid, questionId);
    res.json(status);
  } catch (error: any) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// 8. Get Bookmarks
apiRouter.get('/user/bookmarks', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const bookmarks = await getUserBookmarksFromDb(uid);
    res.json({ bookmarks });
  } catch (error: any) {
    console.error('Error getting bookmarks:', error);
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
});

// 9. Certificates: Get User's Issued Certificates (Strictly bounded to req.user.uid)
apiRouter.get('/user/certificates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const certs = await getUserCertificatesFromDb(uid);
    res.json({ certificates: certs });
  } catch (error: any) {
    console.error('Error fetching user certificates:', error);
    res.status(500).json({ error: 'Failed to retrieve certificates' });
  }
});

// 10. Certificates: Generate / Claim Certificate (Authenticated candidate, IDOR protected)
apiRouter.post('/user/certificates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { resultId, testName, score, totalMarks, percentage, grade, className, subjectName, chapterName, performanceLevel } = req.body;
    if (!resultId) return res.status(400).json({ error: 'Missing resultId' });

    const numScore = Math.max(0, Number(score) || 0);
    const numTotal = Math.max(1, Number(totalMarks) || 100);
    const numPct = Math.min(100, Math.max(0, Number(percentage) || Math.round((numScore / numTotal) * 100)));

    if (numPct < 50) {
      return res.status(400).json({ error: 'Certificate requires passing grade of 50% or higher' });
    }

    const certId = `TG-CERT-${resultId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}`;
    const studentName = req.user?.name || 'Candidate';
    const verificationUrl = `https://taleemguru.pk/verify/${certId}`;

    const savedCert = await saveCertificateToDb({
      id: certId,
      userUid: uid,
      studentName,
      testName: String(testName || 'Examination Assessment').slice(0, 150),
      score: Math.round(numScore),
      totalMarks: Math.round(numTotal),
      percentage: numPct,
      grade: String(grade || 'Pass').slice(0, 10),
      className,
      subjectName,
      chapterName,
      performanceLevel,
      verificationUrl,
    });

    res.json({ success: true, certificate: savedCert });
  } catch (error: any) {
    console.error('Error saving certificate:', error);
    res.status(500).json({ error: 'Failed to save certificate' });
  }
});

// 11. Certificates: Get Single Certificate by ID (Strict IDOR protection: verified owner)
apiRouter.get('/user/certificates/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const certId = req.params.id;
    const cert = await getCertificateByIdFromDb(certId, uid);
    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found or access denied' });
    }

    res.json({ certificate: cert });
  } catch (error: any) {
    console.error('Error fetching certificate by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve certificate' });
  }
});

// 12. Certificates: Public Verification Endpoint (safe public verification)
apiRouter.get('/certificates/verify/:id', async (req: Request, res: Response) => {
  try {
    const certId = req.params.id;
    const cert = await getCertificateByIdFromDb(certId);
    if (!cert) {
      return res.status(404).json({ verified: false, error: 'Certificate record not found in Taleem Guru registry' });
    }
    
    res.json({
      verified: true,
      status: cert.status,
      studentName: cert.studentName,
      testName: cert.testName,
      subject: cert.subjectName,
      className: cert.className,
      score: cert.score,
      percentage: cert.percentage,
      grade: cert.grade,
      issueDate: cert.issueDate,
      certificateId: (cert as any).certificateId || cert.id,
    });
  } catch (error: any) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ verified: false, error: 'Certificate verification failed' });
  }
});

// Admin Certificates: List All Certificates (RBAC: certificates.view)
apiRouter.get('/admin/certificates', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const certs = await getAllCertificatesFromDb();
    res.json({ certificates: certs });
  } catch (error) {
    console.error('Error fetching admin certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

// Admin Certificates: Revoke Certificate (RBAC: certificates.revoke)
apiRouter.patch('/admin/certificates/:id/revoke', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const success = await revokeCertificateInDb(id, req.user?.uid || 'system', reason);
    if (!success) throw new Error('Revocation failed');

    // Record audit log
    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'system',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      action: 'REVOKE_CERTIFICATE',
      targetType: 'CERTIFICATE',
      targetId: id,
      details: `Revoked certificate ID: ${id}. Reason: ${reason || 'No reason provided'}`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error revoking certificate:', error);
    res.status(500).json({ error: 'Failed to revoke certificate' });
  }
});

// Admin Certificates: Restore Certificate (RBAC: certificates.restore)
apiRouter.patch('/admin/certificates/:id/restore', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = await restoreCertificateInDb(id);
    if (!success) throw new Error('Restoration failed');

    // Record audit log
    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'system',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      action: 'RESTORE_CERTIFICATE',
      targetType: 'CERTIFICATE',
      targetId: id,
      details: `Restored certificate ID: ${id}`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error restoring certificate:', error);
    res.status(500).json({ error: 'Failed to restore certificate' });
  }
});

// 13. Public Leaderboard
apiRouter.get('/leaderboard', async (req: Request, res: Response) => {
  const requestId = `req-leaderboard-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const topUsers = await getTopLeaderboard(limit);
    res.json({ leaderboard: topUsers });
  } catch (error: any) {
    console.error(`[Leaderboard Failure] Request ID: ${requestId} - Internal Error:`, error);
    if (error?.cause) {
      console.error(`[Leaderboard Failure] Request ID: ${requestId} - Underlying Cause:`, error.cause);
    }
    res.status(500).json({ 
      error: 'Failed to fetch leaderboard',
      requestId
    });
  }
});

// 14. Content & Question Issue Reporting (Persisted in PostgreSQL database)
apiRouter.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { type, questionId, subject, description, userEmail, userUid } = req.body;
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const savedReport = await saveContentReportToDb({
      category: String(type || 'General Issue').slice(0, 100),
      questionId: questionId ? String(questionId).slice(0, 100) : undefined,
      subject: subject ? String(subject).slice(0, 100) : undefined,
      description: String(description).slice(0, 2000),
      userEmail: userEmail ? String(userEmail).slice(0, 150) : undefined,
      userUid: userUid ? String(userUid).slice(0, 150) : undefined,
    });

    res.json({
      success: true,
      message: 'Report received. Our academic editorial team will audit this item.',
      reportId: savedReport?.reportId,
    });
  } catch (error: any) {
    console.error('Error recording content report:', error);
    res.status(500).json({ error: 'Failed to record issue report' });
  }
});

// 15. Public Platform Statistics (Real dynamic metrics from database)
apiRouter.get('/public-stats', async (req: Request, res: Response) => {
  try {
    const stats = await getPlatformPublicStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Failed to retrieve platform stats:', error);
    res.status(500).json({ error: 'Failed to retrieve platform stats' });
  }
});

// ============================================================================
// EDUCATIONAL CONTENT REST API (Authoritative PostgreSQL + Drizzle backend)
// ============================================================================

// --- Content Approval & Moderation Endpoints ---
apiRouter.post('/content/moderate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { contentType, id, targetStatus, rejectionReason, changeNotes } = req.body || {};
    if (!contentType || !id || !targetStatus) {
      return res.status(400).json({ error: 'contentType, id, and targetStatus are required.' });
    }

    const validStatuses = ['Draft', 'Pending Review', 'Approved', 'Published', 'Rejected', 'Archived'];
    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const validTypes = ['MCQ', 'Test', 'PastPaper', 'StudyNote', 'Document'];
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({ error: `Invalid contentType. Must be one of: ${validTypes.join(', ')}` });
    }

    const userUid = req.user?.uid || 'unknown';
    const userRoles = req.user?.roles || [];

    // Role Enforcement:
    // Approved, Published, Rejected, Archived require Moderator, Editor, ContentManager, or Admin.
    if (['Approved', 'Published', 'Rejected', 'Archived'].includes(targetStatus) && !isModeratorOrEditorOrAdmin(req.user)) {
      return res.status(403).json({ error: 'Forbidden: Moderation rights (Editor, Moderator, or Admin) required for this action.' });
    }

    const result = await moderateContentItemInDb({
      contentType,
      id,
      targetStatus,
      userUid,
      userRoles,
      rejectionReason,
      changeNotes,
    });

    if (!result.success) {
      const isForbidden = result.message?.includes('Self-approval') || result.message?.includes('Forbidden');
      return res.status(isForbidden ? 403 : 400).json({ error: result.message || 'Failed to update content status' });
    }

    res.json({ success: true, item: result.item, message: `Content ${id} status updated to ${targetStatus}` });
  } catch (error: any) {
    console.error('Error in /content/moderate:', error);
    res.status(500).json({ error: error.message || 'Internal server error during content moderation' });
  }
});

apiRouter.post('/content/bulk-moderate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { contentType, ids, targetStatus, rejectionReason, changeNotes } = req.body || {};
    if (!contentType || !Array.isArray(ids) || ids.length === 0 || !targetStatus) {
      return res.status(400).json({ error: 'contentType, ids array, and targetStatus are required.' });
    }

    if (['Approved', 'Published', 'Rejected', 'Archived'].includes(targetStatus) && !isModeratorOrEditorOrAdmin(req.user)) {
      return res.status(403).json({ error: 'Forbidden: Moderation rights (Editor, Moderator, or Admin) required for bulk moderation.' });
    }

    const userUid = req.user?.uid || 'unknown';
    const userRoles = req.user?.roles || [];

    const result = await bulkModerateContentInDb({
      contentType,
      ids,
      targetStatus,
      userUid,
      userRoles,
      rejectionReason,
      changeNotes,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error in /content/bulk-moderate:', error);
    res.status(500).json({ error: error.message || 'Internal server error during bulk moderation' });
  }
});

apiRouter.get('/content/versions/:contentType/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { contentType, id } = req.params;
    const versions = await getContentVersionHistoryFromDb(contentType, id);
    res.json({ success: true, contentType, id, versions });
  } catch (error: any) {
    console.error('Error in /content/versions:', error);
    res.status(500).json({ error: 'Failed to retrieve version history' });
  }
});

// --- 1. MCQs Endpoints ---
apiRouter.get('/mcqs', async (req: Request, res: Response) => {
  try {
    const filters = {
      subject: req.query.subject as string,
      classLevel: req.query.classLevel as string,
      board: req.query.board as string,
      chapter: req.query.chapter as string,
      exam: req.query.exam as string,
      difficulty: req.query.difficulty as string,
      status: req.query.status as string || 'Published',
      search: req.query.search as string,
      limit: req.query.limit ? Math.min(1000, parseInt(req.query.limit as string)) : 500,
    };
    const items = await getMCQsFromDb(filters);
    res.json({ mcqs: items, total: items.length });
  } catch (error: any) {
    console.error('Error fetching MCQs:', error);
    res.status(500).json({ error: 'Failed to retrieve questions from question bank' });
  }
});

apiRouter.get('/mcqs/:id', async (req: Request, res: Response) => {
  try {
    const mcq = await getMCQByIdFromDb(req.params.id);
    if (!mcq) return res.status(404).json({ error: 'Question not found' });
    res.json({ mcq });
  } catch (error: any) {
    console.error('Error fetching MCQ by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve question' });
  }
});

apiRouter.post('/mcqs', requireMCQCurator, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.question || typeof body.question !== 'string' || body.question.trim().length === 0) {
      return res.status(400).json({ error: 'Question text is required.' });
    }
    if (!Array.isArray(body.options) || body.options.length < 2) {
      return res.status(400).json({ error: 'At least 2 question options are required.' });
    }
    if (typeof body.correctAnswer !== 'number' || body.correctAnswer < 0 || body.correctAnswer >= body.options.length) {
      return res.status(400).json({ error: 'Valid correct answer index is required.' });
    }
    if (!body.subject || typeof body.subject !== 'string') {
      return res.status(400).json({ error: 'Subject is required.' });
    }

    const created = await createMCQInDb(body, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'editor@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'CREATE_MCQ',
      targetType: 'MCQ',
      targetId: created.id,
      details: `Created MCQ in ${created.subject}: ${created.question.slice(0, 60)}...`,
      subject: created.subject,
      classLevel: created.classLevel,
      board: created.board,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, mcq: created });
  } catch (error: any) {
    console.error('Error creating MCQ:', error);
    res.status(500).json({ error: error.message || 'Failed to create MCQ' });
  }
});

apiRouter.put('/mcqs/:id', requireMCQCurator, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await updateMCQInDb(id, body, req.user?.uid);
    if (!updated) return res.status(404).json({ error: 'Question not found' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'editor@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'UPDATE_MCQ',
      targetType: 'MCQ',
      targetId: id,
      details: `Updated question in ${updated.subject}`,
      subject: updated.subject,
      classLevel: updated.classLevel,
      board: updated.board,
      ipAddress: req.ip,
    });

    res.json({ success: true, mcq: updated });
  } catch (error: any) {
    console.error('Error updating MCQ:', error);
    res.status(500).json({ error: error.message || 'Failed to update MCQ' });
  }
});

apiRouter.delete('/mcqs/:id', requireMCQCurator, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    await deleteMCQInDb(id);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'editor@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'DELETE_MCQ',
      targetType: 'MCQ',
      targetId: id,
      details: `Deleted MCQ ${id}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting MCQ:', error);
    res.status(500).json({ error: error.message || 'Failed to delete MCQ' });
  }
});

apiRouter.post('/mcqs/bulk', requireMCQCurator, async (req: AuthRequest, res: Response) => {
  try {
    const items = req.body?.mcqs;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty mcqs array' });
    }
    const count = await bulkInsertMCQsInDb(items, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'editor@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_IMPORT_MCQS',
      targetType: 'MCQ_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Bulk imported ${count} MCQs`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count });
  } catch (error: any) {
    console.error('Error bulk importing MCQs:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk import questions' });
  }
});

apiRouter.post('/mcqs/bulk-status', requireMCQCurator, async (req: AuthRequest, res: Response) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    if (!['Published', 'Draft', 'Archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Published, Draft, or Archived' });
    }

    const updatedCount = await bulkUpdateMCQStatusInDb(ids, status, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'editor@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_STATUS_MCQS',
      targetType: 'MCQ_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Updated status to "${status}" for ${updatedCount} MCQs`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count: updatedCount });
  } catch (error: any) {
    console.error('Error in bulk status update for MCQs:', error);
    res.status(500).json({ error: 'Failed to update MCQ status' });
  }
});

apiRouter.post('/mcqs/bulk-delete', requireMCQCurator, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const deletedCount = await bulkDeleteMCQsInDb(ids);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'editor@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_DELETE_MCQS',
      targetType: 'MCQ_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Bulk deleted ${deletedCount} MCQs`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count: deletedCount });
  } catch (error: any) {
    console.error('Error in bulk delete for MCQs:', error);
    res.status(500).json({ error: 'Failed to delete MCQs' });
  }
});

apiRouter.post('/mcqs/bulk-create', requireMCQCurator, async (req: AuthRequest, res: Response) => {
  try {
    const items = req.body?.mcqs;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty mcqs array' });
    }

    const result = await bulkCreateMCQsBatchInDb(items, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'editor@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_CREATE_MCQS',
      targetType: 'MCQ_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Bulk entered ${result.inserted} MCQs with ${result.errors.length} validation errors`,
      ipAddress: req.ip,
    });

    res.json({ success: true, inserted: result.inserted, errors: result.errors });
  } catch (error: any) {
    console.error('Error in bulk create for MCQs:', error);
    res.status(500).json({ error: 'Failed to bulk create MCQs' });
  }
});

// --- 2. Tests & Quizzes Endpoints ---
apiRouter.get('/tests', async (req: Request, res: Response) => {
  try {
    const filters = {
      subject: req.query.subject as string,
      classLevel: req.query.classLevel as string,
      board: req.query.board as string,
      category: req.query.category as string,
      testType: req.query.testType as string,
      status: req.query.status as string || 'Published',
      search: req.query.search as string,
      limit: req.query.limit ? Math.min(500, parseInt(req.query.limit as string)) : 200,
    };
    const items = await getTestsFromDb(filters);
    res.json({ tests: items, total: items.length });
  } catch (error: any) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to retrieve assessments' });
  }
});

apiRouter.get('/tests/:id', async (req: Request, res: Response) => {
  try {
    const test = await getTestByIdFromDb(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json({ test });
  } catch (error: any) {
    console.error('Error fetching test by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve assessment' });
  }
});

apiRouter.post('/tests', requireQuizCreator, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return res.status(400).json({ error: 'Test title is required.' });
    }
    if (!body.subject || typeof body.subject !== 'string') {
      return res.status(400).json({ error: 'Subject is required.' });
    }

    const created = await createTestInDb(body, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'CREATE_TEST',
      targetType: 'TEST',
      targetId: created.id,
      details: `Created test: ${created.title} (${created.subject})`,
      subject: created.subject,
      classLevel: created.classLevel,
      board: created.board,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, test: created });
  } catch (error: any) {
    console.error('Error creating test:', error);
    res.status(500).json({ error: error.message || 'Failed to create assessment' });
  }
});

apiRouter.put('/tests/:id', requireQuizCreator, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await updateTestInDb(id, body, req.user?.uid);
    if (!updated) return res.status(404).json({ error: 'Test not found' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'UPDATE_TEST',
      targetType: 'TEST',
      targetId: id,
      details: `Updated test: ${updated.title}`,
      subject: updated.subject,
      classLevel: updated.classLevel,
      board: updated.board,
      ipAddress: req.ip,
    });

    res.json({ success: true, test: updated });
  } catch (error: any) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: error.message || 'Failed to update assessment' });
  }
});

apiRouter.delete('/tests/:id', requireQuizCreator, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    await deleteTestInDb(id);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'DELETE_TEST',
      targetType: 'TEST',
      targetId: id,
      details: `Deleted test ${id}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Test deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting test:', error);
    res.status(500).json({ error: error.message || 'Failed to delete assessment' });
  }
});

apiRouter.post('/tests/bulk', requireQuizCreator, async (req: AuthRequest, res: Response) => {
  try {
    const items = req.body?.tests;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty tests array' });
    }
    const count = await bulkInsertTestsInDb(items, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_IMPORT_TESTS',
      targetType: 'TEST_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Bulk imported ${count} test configurations`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count });
  } catch (error: any) {
    console.error('Error bulk importing tests:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk import assessments' });
  }
});

apiRouter.post('/tests/bulk-status', requireQuizCreator, async (req: AuthRequest, res: Response) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    if (!['Published', 'Draft', 'Archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Published, Draft, or Archived' });
    }

    const updatedCount = await bulkUpdateTestStatusInDb(ids, status, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_STATUS_TESTS',
      targetType: 'TEST_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Updated status to "${status}" for ${updatedCount} tests`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count: updatedCount });
  } catch (error: any) {
    console.error('Error in bulk status update for tests:', error);
    res.status(500).json({ error: 'Failed to update test status' });
  }
});

apiRouter.post('/tests/bulk-delete', requireQuizCreator, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const deletedCount = await bulkDeleteTestsInDb(ids);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_DELETE_TESTS',
      targetType: 'TEST_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Bulk deleted ${deletedCount} tests`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count: deletedCount });
  } catch (error: any) {
    console.error('Error in bulk delete for tests:', error);
    res.status(500).json({ error: 'Failed to delete tests' });
  }
});

// ============================================================================
// --- 2.1 ADVANCED EXAMINATION & ASSESSMENT ENGINE ENDPOINTS ---
// ============================================================================

// 1. Start or Resume Exam Attempt (Server-Authoritative)
apiRouter.post('/exams/start', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { testId, candidateSessionId, studentName, studentEmail } = req.body || {};
    if (!testId || typeof testId !== 'string') {
      return res.status(400).json({ error: 'Valid testId is required to start an assessment' });
    }

    // Resolve user UID (from authenticated session or guest candidate session)
    const userUid = req.user?.uid || candidateSessionId || `anon-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const effectiveName = req.user?.name || studentName || 'Candidate';
    const effectiveEmail = req.user?.email || studentEmail || undefined;

    const startData = await startExamAttemptInDb({
      testId,
      userUid,
      studentName: effectiveName,
      studentEmail: effectiveEmail,
      ipAddress: req.ip,
    });

    res.json(startData);
  } catch (error: any) {
    console.error('Error starting examination attempt:', error);
    res.status(400).json({ error: error.message || 'Failed to initialize examination session' });
  }
});

// 2. Real-time Autosave Candidate Answer
apiRouter.post('/exams/:attemptId/save-answer', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = req.params.attemptId;
    const { questionId, selectedOption, markedForReview, timeSpentSeconds, candidateSessionId } = req.body || {};

    if (!questionId) {
      return res.status(400).json({ error: 'questionId is required' });
    }

    const userUid = req.user?.uid || candidateSessionId;
    if (!userUid) {
      return res.status(401).json({ error: 'Session identifier missing' });
    }

    const result = await saveExamAnswerInDb({
      attemptId,
      userUid,
      questionId,
      selectedOption: selectedOption !== undefined && selectedOption !== null ? Number(selectedOption) : null,
      markedForReview: Boolean(markedForReview),
      timeSpentSeconds: Number(timeSpentSeconds || 0),
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error saving candidate answer:', error);
    res.status(400).json({ error: error.message || 'Failed to record answer' });
  }
});

// 3. Submit Exam Attempt & Execute Server-Authoritative Evaluation
apiRouter.post('/exams/:attemptId/submit', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = req.params.attemptId;
    const { answers, timeSpentSeconds, candidateSessionId } = req.body || {};

    const userUid = req.user?.uid || candidateSessionId;
    if (!userUid) {
      return res.status(401).json({ error: 'Session identifier missing' });
    }

    const evaluation = await submitExamAttemptInDb({
      attemptId,
      userUid,
      submittedAnswers: answers || {},
      timeSpentSeconds: timeSpentSeconds ? Number(timeSpentSeconds) : undefined,
    });

    res.json({
      success: true,
      result: evaluation.result,
      certificateId: evaluation.certificateId,
    });
  } catch (error: any) {
    console.error('Error evaluating examination attempt:', error);
    res.status(400).json({ error: error.message || 'Failed to submit examination' });
  }
});

// 4. Retrieve Examination Result
apiRouter.get('/exams/:attemptId/result', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = req.params.attemptId;
    const candidateSessionId = req.query.candidateSessionId as string;
    const userUid = req.user?.uid || candidateSessionId;

    if (!userUid) {
      return res.status(401).json({ error: 'Authentication or candidate session required' });
    }

    const result = await getExamAttemptResultFromDb(attemptId, userUid);
    if (!result) {
      return res.status(404).json({ error: 'Examination result not found or unauthorized' });
    }

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Error retrieving examination result:', error);
    res.status(500).json({ error: 'Failed to retrieve assessment result' });
  }
});

// 5. Retrieve Student Authoritative Exam History
apiRouter.get('/user/exam-history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const history = await getUserExamHistoryFromDb(uid);
    res.json({ success: true, attempts: history });
  } catch (error: any) {
    console.error('Error fetching student exam history:', error);
    res.status(500).json({ error: 'Failed to retrieve examination history' });
  }
});

// 6. Admin / Staff Exam Attempt Monitor & Analytics
apiRouter.get('/admin/exam-attempts', requireQuizCreator, async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      testId: req.query.testId as string,
      status: req.query.status as string,
      search: req.query.search as string,
      limit: req.query.limit ? Math.min(500, parseInt(req.query.limit as string)) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const data = await getAllExamAttemptsFromDb(filters);
    res.json({ success: true, ...data });
  } catch (error: any) {
    console.error('Error fetching admin exam attempts:', error);
    res.status(500).json({ error: 'Failed to retrieve examination records' });
  }
});

// --- 3. Past Papers Endpoints ---
apiRouter.get('/past-papers', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isStaff = isStaffUser(req.user);
    const filters = {
      board: req.query.board as string,
      province: req.query.province as string,
      classLevel: req.query.classLevel as string,
      subject: req.query.subject as string,
      topic: req.query.topic as string,
      exam: req.query.exam as string,
      language: req.query.language as string,
      year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
      status: req.query.status as string,
      search: req.query.search as string,
      limit: req.query.limit ? Math.min(500, parseInt(req.query.limit as string, 10)) : 300,
      isStaff,
    };
    const items = await getPastPapersFromDb(filters);
    res.json({ pastPapers: items, total: items.length });
  } catch (error: any) {
    console.error('Error fetching past papers:', error);
    res.status(500).json({ error: 'Failed to retrieve past papers' });
  }
});

apiRouter.get('/past-papers/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isStaff = isStaffUser(req.user);
    const paper = await getPastPaperByIdFromDb(req.params.id, isStaff);
    if (!paper) return res.status(404).json({ error: 'Past paper not found or access restricted' });
    res.json({ pastPaper: paper });
  } catch (error: any) {
    console.error('Error fetching past paper by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve past paper' });
  }
});

apiRouter.get('/past-papers/:id/download', documentRateLimitMiddleware, optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isStaff = isStaffUser(req.user);
    const paper = await getPastPaperByIdFromDb(req.params.id, true);
    if (!paper) return res.status(404).json({ error: 'Past paper not found' });

    if (paper.status !== 'Published' && !isStaff) {
      return res.status(403).json({ error: 'Access denied: Past paper is not published' });
    }

    // Check if associated document exists in documents table
    const doc = await getDocumentByIdFromDb(paper.id, true);
    let targetFilePath: string | undefined;

    if (doc) {
      const isPrivileged = isAdminOrContentManager(req.user);
      const requestOriginal = req.query.original === 'true' && isPrivileged;
      const fileInfo = requestOriginal ? getSafeOriginalPath(doc) : getSafeBrandedPath(doc);
      if (fileInfo.valid && fileInfo.filePath) {
        targetFilePath = fileInfo.filePath;
      }
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent']?.substring(0, 500);
    const sessionId = (req.headers['x-session-id'] as string) || req.cookies?.tg_session_id;

    recordDocumentDownload(paper.id, {
      documentType: 'Past Paper',
      userUid: req.user?.uid,
      anonymousSessionId: sessionId,
      ipAddress: clientIp,
      userAgent,
      version: paper.version || 1,
    }).catch((recErr) => console.warn('Failed to record download event:', recErr));

    if (targetFilePath && fs.existsSync(targetFilePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeDownloadFilename(paper.title + '.pdf', 'past_paper.pdf')}"`);
      res.setHeader('X-TaleemGuru-Branded', 'true');
      return fs.createReadStream(targetFilePath).pipe(res);
    }

    // Fallback: check fileUrl / downloadUrl if local
    const fallbackUrl = paper.brandedFileUrl || paper.downloadUrl || paper.fileUrl;
    if (fallbackUrl && fallbackUrl.startsWith('/')) {
      const resolved = resolveSafeLocalFilePath(fallbackUrl);
      if (resolved.valid && resolved.absolutePath && fs.existsSync(resolved.absolutePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizeDownloadFilename(paper.title + '.pdf', 'past_paper.pdf')}"`);
        return fs.createReadStream(resolved.absolutePath).pipe(res);
      }
    }

    return res.status(404).json({ error: 'Past paper document file is currently unavailable' });
  } catch (error: any) {
    console.error('Error downloading past paper:', error);
    res.status(500).json({ error: 'Failed to download past paper' });
  }
});

apiRouter.post('/past-papers', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return res.status(400).json({ error: 'Paper title is required.' });
    }
    if (!body.board || !body.classLevel || !body.subject || !body.year) {
      return res.status(400).json({ error: 'Board, class level, subject, and year are required.' });
    }

    const created = await createPastPaperInDb(body, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'CREATE_PAST_PAPER',
      targetType: 'PAST_PAPER',
      targetId: created.id,
      details: `Created past paper: ${created.title} (${created.board} ${created.year})`,
      subject: created.subject,
      classLevel: created.classLevel,
      board: created.board,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, pastPaper: created });
  } catch (error: any) {
    console.error('Error creating past paper:', error);
    res.status(500).json({ error: error.message || 'Failed to create past paper' });
  }
});

apiRouter.put('/past-papers/:id', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await updatePastPaperInDb(id, body, req.user?.uid);
    if (!updated) return res.status(404).json({ error: 'Past paper not found' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'UPDATE_PAST_PAPER',
      targetType: 'PAST_PAPER',
      targetId: id,
      details: `Updated past paper: ${updated.title}`,
      subject: updated.subject,
      classLevel: updated.classLevel,
      board: updated.board,
      ipAddress: req.ip,
    });

    res.json({ success: true, pastPaper: updated });
  } catch (error: any) {
    console.error('Error updating past paper:', error);
    res.status(500).json({ error: error.message || 'Failed to update past paper' });
  }
});

apiRouter.delete('/past-papers/:id', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    await deletePastPaperInDb(id);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'DELETE_PAST_PAPER',
      targetType: 'PAST_PAPER',
      targetId: id,
      details: `Deleted past paper ${id}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Past paper deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting past paper:', error);
    res.status(500).json({ error: error.message || 'Failed to delete past paper' });
  }
});

apiRouter.post('/past-papers/bulk', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const items = req.body?.pastPapers;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty pastPapers array' });
    }
    const count = await bulkInsertPastPapersInDb(items, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_IMPORT_PAST_PAPERS',
      targetType: 'PAST_PAPER_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Bulk imported ${count} past papers`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count });
  } catch (error: any) {
    console.error('Error bulk importing past papers:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk import past papers' });
  }
});

apiRouter.post('/past-papers/bulk-status', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    if (!['Published', 'Draft', 'Archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Published, Draft, or Archived' });
    }

    const updatedCount = await bulkUpdatePastPaperStatusInDb(ids, status, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_STATUS_PAST_PAPERS',
      targetType: 'PAST_PAPER_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Updated status to "${status}" for ${updatedCount} past papers`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count: updatedCount });
  } catch (error: any) {
    console.error('Error in bulk status update for past papers:', error);
    res.status(500).json({ error: 'Failed to update past paper status' });
  }
});

apiRouter.post('/past-papers/bulk-delete', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const deletedCount = await bulkDeletePastPapersInDb(ids);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_DELETE_PAST_PAPERS',
      targetType: 'PAST_PAPER_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Bulk deleted ${deletedCount} past papers`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count: deletedCount });
  } catch (error: any) {
    console.error('Error in bulk delete for past papers:', error);
    res.status(500).json({ error: 'Failed to delete past papers' });
  }
});

// --- 4. Study Notes Endpoints ---
apiRouter.get('/study-notes', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isStaff = isStaffUser(req.user);
    const filters = {
      subject: req.query.subject as string,
      classLevel: req.query.classLevel as string,
      board: req.query.board as string,
      chapter: req.query.chapter as string,
      topic: req.query.topic as string,
      type: req.query.type as string,
      language: req.query.language as string,
      status: req.query.status as string,
      search: req.query.search as string,
      limit: req.query.limit ? Math.min(500, parseInt(req.query.limit as string, 10)) : 300,
      isStaff,
    };
    const items = await getStudyNotesFromDb(filters);
    res.json({ studyNotes: items, total: items.length });
  } catch (error: any) {
    console.error('Error fetching study notes:', error);
    res.status(500).json({ error: 'Failed to retrieve study notes' });
  }
});

apiRouter.get('/study-notes/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isStaff = isStaffUser(req.user);
    const note = await getStudyNoteByIdFromDb(req.params.id, isStaff);
    if (!note) return res.status(404).json({ error: 'Study note not found or access restricted' });
    res.json({ studyNote: note });
  } catch (error: any) {
    console.error('Error fetching study note by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve study note' });
  }
});

apiRouter.get('/study-notes/:id/download', documentRateLimitMiddleware, optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isStaff = isStaffUser(req.user);
    const note = await getStudyNoteByIdFromDb(req.params.id, true);
    if (!note) return res.status(404).json({ error: 'Study note not found' });

    if (note.status !== 'Published' && !isStaff) {
      return res.status(403).json({ error: 'Access denied: Study note is not published' });
    }

    // Check if associated document exists in documents table
    const doc = await getDocumentByIdFromDb(note.id, true);
    let targetFilePath: string | undefined;

    if (doc) {
      const isPrivileged = isAdminOrContentManager(req.user);
      const requestOriginal = req.query.original === 'true' && isPrivileged;
      const fileInfo = requestOriginal ? getSafeOriginalPath(doc) : getSafeBrandedPath(doc);
      if (fileInfo.valid && fileInfo.filePath) {
        targetFilePath = fileInfo.filePath;
      }
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent']?.substring(0, 500);
    const sessionId = (req.headers['x-session-id'] as string) || req.cookies?.tg_session_id;

    recordDocumentDownload(note.id, {
      documentType: 'Study Note',
      userUid: req.user?.uid,
      anonymousSessionId: sessionId,
      ipAddress: clientIp,
      userAgent,
      version: note.version || 1,
    }).catch((recErr) => console.warn('Failed to record download event:', recErr));

    if (targetFilePath && fs.existsSync(targetFilePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeDownloadFilename(note.title + '.pdf', 'study_note.pdf')}"`);
      res.setHeader('X-TaleemGuru-Branded', 'true');
      return fs.createReadStream(targetFilePath).pipe(res);
    }

    // Fallback: check pdfUrl / fileUrl if local
    const fallbackUrl = note.brandedFileUrl || note.pdfUrl || note.fileUrl;
    if (fallbackUrl && fallbackUrl.startsWith('/')) {
      const resolved = resolveSafeLocalFilePath(fallbackUrl);
      if (resolved.valid && resolved.absolutePath && fs.existsSync(resolved.absolutePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizeDownloadFilename(note.title + '.pdf', 'study_note.pdf')}"`);
        return fs.createReadStream(resolved.absolutePath).pipe(res);
      }
    }

    return res.status(404).json({ error: 'Study note document file is currently unavailable' });
  } catch (error: any) {
    console.error('Error downloading study note:', error);
    res.status(500).json({ error: 'Failed to download study note' });
  }
});

apiRouter.post('/study-notes', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return res.status(400).json({ error: 'Note title is required.' });
    }
    if (!body.subject || !body.classLevel || !body.chapter) {
      return res.status(400).json({ error: 'Subject, class level, and chapter are required.' });
    }

    const created = await createStudyNoteInDb(body, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'CREATE_STUDY_NOTE',
      targetType: 'STUDY_NOTE',
      targetId: created.id,
      details: `Created study note: ${created.title} (${created.subject} - ${created.chapter})`,
      subject: created.subject,
      classLevel: created.classLevel,
      board: created.board,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, studyNote: created });
  } catch (error: any) {
    console.error('Error creating study note:', error);
    res.status(500).json({ error: error.message || 'Failed to create study note' });
  }
});

apiRouter.put('/study-notes/:id', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await updateStudyNoteInDb(id, body, req.user?.uid);
    if (!updated) return res.status(404).json({ error: 'Study note not found' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'UPDATE_STUDY_NOTE',
      targetType: 'STUDY_NOTE',
      targetId: id,
      details: `Updated study note: ${updated.title}`,
      subject: updated.subject,
      classLevel: updated.classLevel,
      board: updated.board,
      ipAddress: req.ip,
    });

    res.json({ success: true, studyNote: updated });
  } catch (error: any) {
    console.error('Error updating study note:', error);
    res.status(500).json({ error: error.message || 'Failed to update study note' });
  }
});

apiRouter.delete('/study-notes/:id', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    await deleteStudyNoteInDb(id);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'DELETE_STUDY_NOTE',
      targetType: 'STUDY_NOTE',
      targetId: id,
      details: `Deleted study note ${id}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Study note deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting study note:', error);
    res.status(500).json({ error: error.message || 'Failed to delete study note' });
  }
});

apiRouter.post('/study-notes/bulk', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const items = req.body?.studyNotes;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty studyNotes array' });
    }
    const count = await bulkInsertStudyNotesInDb(items, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_IMPORT_STUDY_NOTES',
      targetType: 'STUDY_NOTE_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Bulk imported ${count} study notes`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count });
  } catch (error: any) {
    console.error('Error bulk importing study notes:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk import study notes' });
  }
});

apiRouter.post('/study-notes/bulk-status', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    if (!['Published', 'Draft', 'Archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Published, Draft, or Archived' });
    }

    const updatedCount = await bulkUpdateStudyNoteStatusInDb(ids, status, req.user?.uid);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_STATUS_STUDY_NOTES',
      targetType: 'STUDY_NOTE_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Updated status to "${status}" for ${updatedCount} study notes`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count: updatedCount });
  } catch (error: any) {
    console.error('Error in bulk status update for study notes:', error);
    res.status(500).json({ error: 'Failed to update study note status' });
  }
});

apiRouter.post('/study-notes/bulk-delete', requireContentCurator, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const deletedCount = await bulkDeleteStudyNotesInDb(ids);

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'staff@taleemguru.pk',
      adminName: req.user?.name || 'Staff',
      action: 'BULK_DELETE_STUDY_NOTES',
      targetType: 'STUDY_NOTE_BATCH',
      targetId: `batch-${Date.now()}`,
      details: `Bulk deleted ${deletedCount} study notes`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count: deletedCount });
  } catch (error: any) {
    console.error('Error in bulk delete for study notes:', error);
    res.status(500).json({ error: 'Failed to delete study notes' });
  }
});

// --- 5. Academic Hierarchy Management Endpoints ---

// Boards
apiRouter.get('/hierarchy/boards', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const items = await getHierarchyBoards(status);
    res.json({ boards: items });
  } catch (error: any) {
    console.error('Error fetching hierarchy boards:', error);
    res.status(500).json({ error: 'Failed to retrieve boards' });
  }
});

apiRouter.post('/hierarchy/boards', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, status } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Board name is required.' });
    }
    const created = await createHierarchyBoard(name, status);
    if (!created) return res.status(500).json({ error: 'Failed to create board.' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'CREATE_BOARD',
      targetType: 'HIERARCHY_BOARD',
      targetId: String(created.id),
      details: `Created board: ${created.name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, board: created });
  } catch (error: any) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

apiRouter.put('/hierarchy/boards/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid board ID' });
    const { name, status } = req.body || {};
    const updated = await updateHierarchyBoard(id, { name, status });
    if (!updated) return res.status(404).json({ error: 'Board not found' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'UPDATE_BOARD',
      targetType: 'HIERARCHY_BOARD',
      targetId: String(id),
      details: `Updated board: ${updated.name} (Status: ${updated.status})`,
      ipAddress: req.ip,
    });

    res.json({ success: true, board: updated });
  } catch (error: any) {
    console.error('Error updating board:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
});

apiRouter.delete('/hierarchy/boards/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid board ID' });
    const result = await deleteHierarchyBoard(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'DELETE_BOARD',
      targetType: 'HIERARCHY_BOARD',
      targetId: String(id),
      details: `Deleted board ${id}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Board deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting board:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

// Classes
apiRouter.get('/hierarchy/classes', async (req: Request, res: Response) => {
  try {
    const boardId = req.query.boardId ? parseInt(req.query.boardId as string) : undefined;
    const status = req.query.status as string;
    const items = await getHierarchyClasses(boardId, status);
    res.json({ classes: items });
  } catch (error: any) {
    console.error('Error fetching hierarchy classes:', error);
    res.status(500).json({ error: 'Failed to retrieve classes' });
  }
});

apiRouter.post('/hierarchy/classes', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, name, status } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Class name is required.' });
    }
    if (!boardId || isNaN(parseInt(boardId))) {
      return res.status(400).json({ error: 'Valid board ID is required.' });
    }
    const created = await createHierarchyClass(parseInt(boardId), name, status);
    if (!created) return res.status(500).json({ error: 'Failed to create class.' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'CREATE_CLASS',
      targetType: 'HIERARCHY_CLASS',
      targetId: String(created.id),
      details: `Created class: ${created.name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, class: created });
  } catch (error: any) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

apiRouter.put('/hierarchy/classes/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid class ID' });
    const { name, status, boardId } = req.body || {};
    const updated = await updateHierarchyClass(id, { name, status, boardId: boardId ? parseInt(boardId) : undefined });
    if (!updated) return res.status(404).json({ error: 'Class not found' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'UPDATE_CLASS',
      targetType: 'HIERARCHY_CLASS',
      targetId: String(id),
      details: `Updated class: ${updated.name}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, class: updated });
  } catch (error: any) {
    console.error('Error updating class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

apiRouter.delete('/hierarchy/classes/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid class ID' });
    const result = await deleteHierarchyClass(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'DELETE_CLASS',
      targetType: 'HIERARCHY_CLASS',
      targetId: String(id),
      details: `Deleted class ${id}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Subjects
apiRouter.get('/hierarchy/subjects', async (req: Request, res: Response) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
    const status = req.query.status as string;
    const items = await getHierarchySubjects(classId, status);
    res.json({ subjects: items });
  } catch (error: any) {
    console.error('Error fetching hierarchy subjects:', error);
    res.status(500).json({ error: 'Failed to retrieve subjects' });
  }
});

apiRouter.post('/hierarchy/subjects', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { classId, name, status } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Subject name is required.' });
    }
    if (!classId || isNaN(parseInt(classId))) {
      return res.status(400).json({ error: 'Valid class ID is required.' });
    }
    const created = await createHierarchySubject(parseInt(classId), name, status);
    if (!created) return res.status(500).json({ error: 'Failed to create subject.' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'CREATE_SUBJECT',
      targetType: 'HIERARCHY_SUBJECT',
      targetId: String(created.id),
      details: `Created subject: ${created.name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, subject: created });
  } catch (error: any) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

apiRouter.put('/hierarchy/subjects/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid subject ID' });
    const { name, status, classId } = req.body || {};
    const updated = await updateHierarchySubject(id, { name, status, classId: classId ? parseInt(classId) : undefined });
    if (!updated) return res.status(404).json({ error: 'Subject not found' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'UPDATE_SUBJECT',
      targetType: 'HIERARCHY_SUBJECT',
      targetId: String(id),
      details: `Updated subject: ${updated.name}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, subject: updated });
  } catch (error: any) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

apiRouter.delete('/hierarchy/subjects/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid subject ID' });
    const result = await deleteHierarchySubject(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'DELETE_SUBJECT',
      targetType: 'HIERARCHY_SUBJECT',
      targetId: String(id),
      details: `Deleted subject ${id}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// Chapters
apiRouter.get('/hierarchy/chapters', async (req: Request, res: Response) => {
  try {
    const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
    const status = req.query.status as string;
    const items = await getHierarchyChapters(subjectId, status);
    res.json({ chapters: items });
  } catch (error: any) {
    console.error('Error fetching hierarchy chapters:', error);
    res.status(500).json({ error: 'Failed to retrieve chapters' });
  }
});

apiRouter.post('/hierarchy/chapters', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId, name, status, draftStatus } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Chapter name is required.' });
    }
    if (!subjectId || isNaN(parseInt(subjectId))) {
      return res.status(400).json({ error: 'Valid subject ID is required.' });
    }
    const created = await createHierarchyChapter(parseInt(subjectId), name, status, draftStatus);
    if (!created) return res.status(500).json({ error: 'Failed to create chapter.' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'CREATE_CHAPTER',
      targetType: 'HIERARCHY_CHAPTER',
      targetId: String(created.id),
      details: `Created chapter: ${created.name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, chapter: created });
  } catch (error: any) {
    console.error('Error creating chapter:', error);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

apiRouter.put('/hierarchy/chapters/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid chapter ID' });
    const { name, status, draftStatus, subjectId } = req.body || {};
    const updated = await updateHierarchyChapter(id, {
      name,
      status,
      draftStatus,
      subjectId: subjectId ? parseInt(subjectId) : undefined,
    });
    if (!updated) return res.status(404).json({ error: 'Chapter not found' });

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'UPDATE_CHAPTER',
      targetType: 'HIERARCHY_CHAPTER',
      targetId: String(id),
      details: `Updated chapter: ${updated.name}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, chapter: updated });
  } catch (error: any) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

apiRouter.delete('/hierarchy/chapters/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid chapter ID' });
    const result = await deleteHierarchyChapter(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'DELETE_CHAPTER',
      targetType: 'HIERARCHY_CHAPTER',
      targetId: String(id),
      details: `Deleted chapter ${id}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Chapter deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

// 16. Authoritative Admin Verification: Evaluates caller's database role
apiRouter.get('/admin/verify', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid) {
      return res.status(401).json({ authorized: false, error: 'Unauthorized: Missing UID' });
    }

    const normalizedEmail = (email || '').toLowerCase().trim();
    const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);
    const bootstrapAdmins = getTrustedBootstrapAdmins();
    const bootstrapConfig = bootstrapAdmins[normalizedEmail];

    let dbUser = null;
    try {
      dbUser = await getUserByUid(uid);
      if (!dbUser && normalizedEmail) {
        dbUser = await getOrCreateUser(uid, normalizedEmail, {
          name: isBootstrap ? (bootstrapConfig?.name || 'Admin') : req.user?.name,
        });
      } else if (dbUser && isBootstrap && (!dbUser.roles || !dbUser.roles.includes('Admin') || dbUser.name !== (bootstrapConfig?.name || 'Admin'))) {
        dbUser = await getOrCreateUser(uid, normalizedEmail, {
          name: bootstrapConfig?.name || 'Admin',
        });
      }
    } catch (dbErr) {
      console.warn('Notice in /api/admin/verify database lookup:', dbErr);
    }

    const userRoles = dbUser?.roles && Array.isArray(dbUser.roles) && dbUser.roles.length > 0
      ? dbUser.roles
      : (dbUser?.role ? [dbUser.role] : (isBootstrap ? ['Admin'] : ['Student']));
    const primaryRole = isBootstrap ? 'Admin' : (userRoles[0] || 'Student');

    const staffRolesToCheck = [
      'admin',
      'superadmin',
      'super_admin',
      'administrator',
      'teacher',
      'editor',
      'contentmanager',
      'content_manager',
      'moderator',
    ];

    const isAdmin = isBootstrap || userRoles.some((r: string) => staffRolesToCheck.includes(r.trim().toLowerCase().replace(/\s+/g, '_')));

    if (isBootstrap) {
      console.log('[/api/admin/verify Diagnostic]', {
        normalizedEmail,
        tokenVerificationSuccess: true,
        trustedAdminMatch: true,
        dbProfileRoles: dbUser?.roles || [],
        finalAuthoritativeRole: 'Admin',
        finalIsAdminBoolean: true,
      });

      return res.json({
        authorized: true,
        uid: dbUser?.uid || uid,
        role: 'Admin',
        name: dbUser?.name || bootstrapConfig?.name || 'Admin',
        email: dbUser?.email || normalizedEmail,
      });
    }

    if (!dbUser) {
      return res.status(403).json({ authorized: false, role: 'Student', error: 'User record not found in system' });
    }

    console.log('[/api/admin/verify Diagnostic]', {
      normalizedEmail,
      tokenVerificationSuccess: true,
      trustedAdminMatch: false,
      dbProfileRoles: userRoles,
      finalAuthoritativeRole: isAdmin ? primaryRole : 'Student',
      finalIsAdminBoolean: isAdmin,
    });

    if (!isAdmin) {
      return res.status(403).json({
        authorized: false,
        role: primaryRole,
        message: 'Account does not possess administrative privileges.',
      });
    }

    res.json({
      authorized: true,
      uid: dbUser.uid,
      role: primaryRole,
      name: dbUser.name,
      email: dbUser.email,
    });
  } catch (error: any) {
    console.error('Error in /api/admin/verify:', error);
    res.status(500).json({ authorized: false, error: 'Failed to verify admin status' });
  }
});

// 17. Admin Management: Get registered users from database (Requires verified High Admin)
apiRouter.get('/admin/users', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const allDbUsers = await getAllUsersFromDb(200);
    res.json({ users: allDbUsers });
  } catch (error: any) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// 17b. Admin Management: Create Staff / User Account (Requires verified High Admin)
apiRouter.post('/admin/users', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, roles, role, password, status } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanRoles = Array.isArray(roles) ? roles.map((r: string) => r.trim()) : (typeof role === 'string' && role.trim() ? [role.trim()] : ['Teacher']);
    const initialStatus = (status === 'Inactive' || status === 'Suspended') ? status : 'Active';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (!cleanName) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const allowedRoles = ['Student', 'Teacher', 'Staff', 'Editor', 'ContentManager', 'Moderator', 'Admin', 'SuperAdmin'];
    const invalidRoles = cleanRoles.filter(r => !allowedRoles.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ error: `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${allowedRoles.join(', ')}` });
    }

    // Hierarchy check: Regular Admin cannot create SuperAdmin accounts
    const callerRoles = (req.user?.roles || []).map(r => r.toLowerCase().trim());
    const isCallerSuperAdmin = callerRoles.includes('superadmin') || callerRoles.includes('super_admin') || isTrustedBootstrapAdminEmail(req.user?.email);
    if (cleanRoles.includes('SuperAdmin') && !isCallerSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only a SuperAdmin can create SuperAdmin accounts.' });
    }

    // Check if user already exists in database
    const existingUser = await getUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: `An account with email ${cleanEmail} already exists in the system.` });
    }

    // Attempt to register with Supabase Auth if client is configured
    let authUid = `staff-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const supabaseClient = getSupabaseServerClient();
    if (supabaseClient) {
      try {
        if ((supabaseClient as any).auth?.admin?.createUser) {
          const { data: authData, error: authError } = await (supabaseClient as any).auth.admin.createUser({
            email: cleanEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
              name: cleanName,
              role: cleanRoles[0] || 'Teacher',
            },
          });
          if (!authError && authData?.user?.id) {
            authUid = authData.user.id;
          } else if (authError) {
            console.warn('Notice from Supabase admin createUser:', authError.message);
            if (authError.message?.toLowerCase().includes('already') || authError.status === 422 || authError.status === 409) {
              return res.status(409).json({ error: `An account with email ${cleanEmail} already exists in authentication system.` });
            }
          }
        }
        
        // Fallback to client-level signUp if admin API is not available with anon key
        if (!authUid || authUid.startsWith('staff-')) {
          const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                name: cleanName,
                role: cleanRoles[0] || 'Teacher',
              },
            },
          });
          if (!signUpError && signUpData?.user?.id) {
            authUid = signUpData.user.id;
          } else if (signUpError) {
            console.warn('Notice from Supabase signUp:', signUpError.message);
            if (signUpError.message?.toLowerCase().includes('already') || signUpError.status === 422 || signUpError.status === 409) {
              return res.status(409).json({ error: `An account with email ${cleanEmail} already exists in authentication system.` });
            }
          }
        }
      } catch (authCreateErr) {
        console.warn('Notice during Supabase user registration execution:', authCreateErr);
      }
    }

    let createdUser;
    try {
      // Authoritative profile insertion into application database with securely hashed credentials
      createdUser = await createUserInDb({
        uid: authUid,
        email: cleanEmail,
        name: cleanName,
        roles: cleanRoles,
        password: password,
        status: initialStatus,
      });
    } catch (dbInsertErr: any) {
      // Rollback safety: if Supabase Auth created a user but DB insert failed, cleanup orphaned Auth user
      if (supabaseClient && authUid && !authUid.startsWith('staff-') && (supabaseClient as any).auth?.admin?.deleteUser) {
        try {
          await (supabaseClient as any).auth.admin.deleteUser(authUid);
          console.warn(`Rolled back orphaned Supabase Auth user ${authUid} due to DB insert failure.`);
        } catch (rollbackErr) {
          console.error('Failed to rollback orphaned Supabase Auth user:', rollbackErr);
        }
      }
      throw dbInsertErr;
    }

    // Record audit log
    await saveAuditLogToDb({
      adminUid: req.user?.uid || 'admin-system',
      adminEmail: req.user?.email || 'admin@taleemguru.pk',
      adminName: req.user?.name || 'Admin',
      action: 'STAFF_USER_CREATED',
      targetType: 'user',
      targetId: authUid,
      details: `Created new ${cleanRoles.join(', ')} account (${initialStatus}) for ${cleanEmail} (${cleanName})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      user: sanitizeUserForClient(createdUser),
    });
  } catch (error: any) {
    console.error('Error creating staff user:', error);
    const detailMsg = error?.cause?.message || error?.message || 'Failed to create staff account';
    const isConflict = error?.statusCode === 409 || error?.cause?.statusCode === 409 || detailMsg.toLowerCase().includes('already exists') || detailMsg.toLowerCase().includes('duplicate');
    const statusCode = isConflict ? 409 : 500;
    return res.status(statusCode).json({ error: detailMsg });
  }
});

// 18. Admin Management: Update User Roles (Requires verified High Admin)
apiRouter.patch('/admin/users/:uid/roles', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUid = req.params.uid;
    const { roles } = req.body;

    // 1. Privilege Escalation Prevention: User cannot change their own roles
    if (req.user?.uid === targetUid) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify your own roles.' });
    }

    const allowedRoles = ['Student', 'Staff', 'Admin', 'Teacher', 'Editor', 'ContentManager', 'Moderator', 'SuperAdmin'];
    if (!roles || !Array.isArray(roles) || !roles.every(r => allowedRoles.includes(r))) {
      return res.status(400).json({ error: `Invalid roles. Allowed roles: ${allowedRoles.join(', ')}` });
    }

    // Retrieve previous user record to verify target existence and capture previous roles for audit
    const previousUser = await getUserByUid(targetUid);
    if (!previousUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }
    const previousRoles = (previousUser as any).roles || [];

    // 2. Hierarchy Check: Caller level vs Target level
    const callerRoles = (req.user?.roles || []).map(r => r.toLowerCase().trim());
    const isCallerSuperAdmin = callerRoles.includes('superadmin') || callerRoles.includes('super_admin') || isTrustedBootstrapAdminEmail(req.user?.email);

    // Target is SuperAdmin or bootstrap admin: Admin cannot demote/modify SuperAdmin!
    const targetIsSuperAdmin = previousRoles.some((r: string) => r.toLowerCase() === 'superadmin' || r.toLowerCase() === 'super_admin') || isTrustedBootstrapAdminEmail(previousUser.email);
    if (targetIsSuperAdmin && !isCallerSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: Administrators cannot modify or demote a SuperAdmin.' });
    }

    // Caller trying to grant SuperAdmin: Only SuperAdmin can assign SuperAdmin role!
    if (roles.includes('SuperAdmin') && !isCallerSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only SuperAdmin can grant the SuperAdmin role.' });
    }

    const updatedUser = await updateUserRolesInDb(targetUid, roles);
    if (!updatedUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Audit log with previous and new roles recorded
    await saveAuditLogToDb({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'admin@taleemguru.pk',
      adminName: req.user!.name,
      action: 'USER_ROLES_CHANGED',
      targetType: 'user',
      targetId: targetUid,
      details: `Roles changed from [${previousRoles.join(', ')}] to [${roles.join(', ')}] for user ${updatedUser.email}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, user: sanitizeUserForClient(updatedUser), previousRoles });
  } catch (error: any) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Failed to update user roles' });
  }
});

// 18a1. Admin Management: Update User Status (Active / Inactive / Suspended) (Requires verified High Admin)
apiRouter.patch('/admin/users/:uid/status', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUid = req.params.uid;
    const { status } = req.body;

    if (req.user?.uid === targetUid) {
      return res.status(403).json({ error: 'Forbidden: You cannot change your own account status.' });
    }

    const validStatuses = ['Active', 'Inactive', 'Suspended'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed statuses: ${validStatuses.join(', ')}` });
    }

    const targetUser = await getUserByUid(targetUid);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const callerRoles = (req.user?.roles || []).map(r => r.toLowerCase().trim());
    const isCallerSuperAdmin = callerRoles.includes('superadmin') || callerRoles.includes('super_admin') || isTrustedBootstrapAdminEmail(req.user?.email);
    const targetIsSuperAdmin = targetUser.roles.some((r: string) => r.toLowerCase() === 'superadmin' || r.toLowerCase() === 'super_admin') || isTrustedBootstrapAdminEmail(targetUser.email);

    if (targetIsSuperAdmin && !isCallerSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: Administrators cannot modify status of a SuperAdmin.' });
    }

    const updated = await updateUserStatusInDb(targetUid, status as 'Active' | 'Inactive' | 'Suspended');
    if (!updated) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    await saveAuditLogToDb({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'admin@taleemguru.pk',
      adminName: req.user!.name,
      action: 'USER_STATUS_CHANGED',
      targetType: 'user',
      targetId: targetUid,
      details: `Status changed to ${status} for user ${updated.email}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, user: sanitizeUserForClient(updated) });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// 18a2. Admin Management: Update User Profile Details (Requires verified High Admin)
apiRouter.patch('/admin/users/:uid/profile', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUid = req.params.uid;
    const { name, classLevel, board, targetExam } = req.body;

    const targetUser = await getUserByUid(targetUid);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const updated = await updateUserProfile(targetUid, {
      name: name?.trim() || targetUser.name,
      classLevel: classLevel?.trim() || targetUser.classLevel,
      board: board?.trim() || targetUser.board,
      targetExam: targetExam?.trim() || targetUser.targetExam,
    });

    await saveAuditLogToDb({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'admin@taleemguru.pk',
      adminName: req.user!.name,
      action: 'USER_PROFILE_EDITED_BY_ADMIN',
      targetType: 'user',
      targetId: targetUid,
      details: `Admin updated profile info for user ${targetUser.email}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, user: sanitizeUserForClient(updated) });
  } catch (error: any) {
    console.error('Error editing user profile by admin:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// 18a2b. Admin Management: Reset User / Staff Password (Requires verified High Admin)
apiRouter.post('/admin/users/:uid/reset-password', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUid = req.params.uid;
    const { password } = req.body || {};

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const targetUser = await getUserByUid(targetUid);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    const callerRoles = (req.user?.roles || []).map(r => r.toLowerCase().trim());
    const isCallerSuperAdmin = callerRoles.includes('superadmin') || callerRoles.includes('super_admin') || isTrustedBootstrapAdminEmail(req.user?.email);
    const targetRoles = (targetUser.roles || []).map((r: string) => r.toLowerCase().trim());
    const targetIsSuperAdmin = targetRoles.includes('superadmin') || targetRoles.includes('super_admin') || isTrustedBootstrapAdminEmail(targetUser.email);

    // Regular admin cannot reset password of a SuperAdmin unless caller is SuperAdmin
    if (targetIsSuperAdmin && !isCallerSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: Administrators cannot reset credentials for a SuperAdmin.' });
    }

    // 1. Update in Supabase Auth if server client is available
    const supabaseClient = getSupabaseServerClient();
    if (supabaseClient && (supabaseClient as any).auth?.admin?.updateUserById) {
      try {
        await (supabaseClient as any).auth.admin.updateUserById(targetUid, { password });
      } catch (authErr) {
        console.warn('Supabase admin updateUserById notice:', authErr);
      }
    }

    // 2. Authoritatively store hashed password in application database
    const updated = await setUserPasswordInDb(targetUid, password);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update user password in database.' });
    }

    // 3. Record secure audit log
    await saveAuditLogToDb({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'admin@taleemguru.pk',
      adminName: req.user!.name,
      action: 'STAFF_PASSWORD_RESET_BY_ADMIN',
      targetType: 'user',
      targetId: targetUid,
      details: `Admin reset password for account ${targetUser.email} (${targetUser.name})`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error: any) {
    console.error('Error resetting staff password by admin:', error);
    return res.status(500).json({ error: 'Failed to reset user password.' });
  }
});

// 18a3. Admin Management: Update Granular Permissions (Requires verified High Admin)
apiRouter.patch('/admin/users/:uid/permissions', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUid = req.params.uid;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array of strings.' });
    }

    const targetUser = await getUserByUid(targetUid);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const updated = await updateUserPermissionsInDb(targetUid, permissions);

    await saveAuditLogToDb({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'admin@taleemguru.pk',
      adminName: req.user!.name,
      action: 'USER_PERMISSIONS_OVERRIDDEN',
      targetType: 'user',
      targetId: targetUid,
      details: `Updated granular permissions (${permissions.length} items) for user ${targetUser.email}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, user: sanitizeUserForClient(updated) });
  } catch (error: any) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'Failed to update user permissions' });
  }
});

// 18a4. Admin Management: Staff Assignments (Requires verified High Admin)
apiRouter.get('/admin/users/:uid/assignments', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUid = req.params.uid;
    const assignments = await getStaffAssignmentsFromDb(targetUid);
    res.json({ success: true, assignments });
  } catch (error: any) {
    console.error('Error fetching staff assignments:', error);
    res.status(500).json({ error: 'Failed to fetch staff assignments' });
  }
});

apiRouter.post('/admin/users/:uid/assignments', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUid = req.params.uid;
    const { role, board, classLevel, subject, contentTypes } = req.body;

    if (!board || !classLevel || !subject) {
      return res.status(400).json({ error: 'Board, classLevel, and subject are required for assignment.' });
    }

    const targetUser = await getUserByUid(targetUid);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const created = await addStaffAssignmentToDb({
      userUid: targetUid,
      role: role || (targetUser.roles && targetUser.roles.length > 0 ? targetUser.roles[0] : 'Teacher'),
      board,
      classLevel,
      subject,
      contentTypes: Array.isArray(contentTypes) ? contentTypes : ['all'],
    });

    await saveAuditLogToDb({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'admin@taleemguru.pk',
      adminName: req.user!.name,
      action: 'STAFF_ACADEMIC_ASSIGNMENT_ADDED',
      targetType: 'staff_assignment',
      targetId: String(created.id),
      details: `Assigned ${targetUser.email} to ${subject} (${classLevel}, ${board})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, assignment: created });
  } catch (error: any) {
    console.error('Error adding staff assignment:', error);
    res.status(500).json({ error: 'Failed to add staff assignment' });
  }
});

apiRouter.delete('/admin/assignments/:id', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'Valid assignment ID required.' });
    }

    await deleteStaffAssignmentFromDb(assignmentId);

    await saveAuditLogToDb({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'admin@taleemguru.pk',
      adminName: req.user!.name,
      action: 'STAFF_ACADEMIC_ASSIGNMENT_DELETED',
      targetType: 'staff_assignment',
      targetId: String(assignmentId),
      details: `Deleted staff assignment ID ${assignmentId}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Assignment removed.' });
  } catch (error: any) {
    console.error('Error removing staff assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// 18b. Admin Management: Get Available Roles & Hierarchy Metadata
apiRouter.get('/admin/roles', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const roles = [
      {
        id: 'SuperAdmin',
        name: 'Super Administrator',
        level: 100,
        description: 'Full master access to all system functions, database security, and administrator delegation.',
        permissions: ['all', 'manage_admins', 'manage_staff', 'manage_content', 'manage_tests', 'view_reports', 'view_audit_logs'],
      },
      {
        id: 'Admin',
        name: 'Administrator',
        level: 90,
        description: 'Full administrative access to manage staff users, review test analytics, and audit content.',
        permissions: ['manage_staff', 'manage_content', 'manage_tests', 'view_reports', 'view_audit_logs', 'system_health'],
      },
      {
        id: 'ContentManager',
        name: 'Content Manager',
        level: 60,
        description: 'Full management over questions, study notes, past papers, test configurations, and syllabus.',
        permissions: ['manage_content', 'manage_tests', 'view_results', 'view_reports'],
      },
      {
        id: 'Teacher',
        name: 'Teacher / Instructor',
        level: 50,
        description: 'Create custom classroom tests, review test analytics, and track student scores.',
        permissions: ['create_tests', 'view_results', 'view_quizzes'],
      },
      {
        id: 'Staff',
        name: 'Staff / Operations',
        level: 45,
        description: 'Manage institutional operations, content maintenance, and administrative assistance.',
        permissions: ['manage_content', 'view_reports', 'view_results'],
      },
      {
        id: 'Editor',
        name: 'Curriculum Editor',
        level: 40,
        description: 'Author, edit, and audit MCQs, chapter notes, and past paper answers.',
        permissions: ['edit_mcqs', 'edit_notes', 'view_reports', 'view_results'],
      },
      {
        id: 'Moderator',
        name: 'Community Moderator',
        level: 30,
        description: 'Review student feedback, investigate reported question errors, and monitor audit logs.',
        permissions: ['view_reports', 'update_reports', 'view_feedback', 'view_audit_logs'],
      },
      {
        id: 'Student',
        name: 'Candidate / Student',
        level: 10,
        description: 'Take tests, track personalized performance, bookmark questions, and earn verified certificates.',
        permissions: ['take_tests', 'view_profile', 'save_bookmarks', 'earn_certificates'],
      },
    ];

    res.json({ success: true, roles });
  } catch (error: any) {
    console.error('Error fetching admin roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// 18c. Admin Management: Get Active User Permissions Matrix
apiRouter.get('/admin/permissions', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userRoles = req.user?.roles || ['Student'];
    const roleLower = userRoles.map(r => r.toLowerCase());

    const isSuperAdmin = roleLower.includes('superadmin') || roleLower.includes('super_admin') || isTrustedBootstrapAdminEmail(req.user?.email);
    const isAdmin = isSuperAdmin || roleLower.includes('admin') || roleLower.includes('administrator');
    const isContentManager = isAdmin || roleLower.includes('contentmanager') || roleLower.includes('content_manager');
    const isTeacher = isContentManager || roleLower.includes('teacher');
    const isEditor = isContentManager || roleLower.includes('editor');
    const isModerator = isAdmin || roleLower.includes('moderator');

    res.json({
      success: true,
      user: {
        uid: req.user?.uid,
        email: req.user?.email,
        roles: userRoles,
      },
      permissions: {
        canManageUsers: isAdmin,
        canManageAdmins: isSuperAdmin,
        canCreateStaff: isAdmin,
        canModifyRoles: isAdmin,
        canManageCurriculum: isContentManager,
        canCreateTests: isTeacher,
        canViewResults: isTeacher || isEditor || isContentManager || isAdmin,
        canModerateReports: isModerator || isEditor || isAdmin,
        canViewAuditLogs: isModerator || isAdmin,
        canViewSystemHealth: isAdmin,
      },
    });
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// 19. Admin Management: Real Comprehensive Platform Analytics
apiRouter.get('/admin/comprehensive-stats', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getComprehensiveStatsFromDb();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Admin comprehensive stats error:', error);
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

// 20. Admin Management: System Analytics (Legacy support)
apiRouter.get('/admin/stats', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const allDbUsers = await getAllUsersFromDb(1000);
    const totalUsers = allDbUsers.length;
    const adminsCount = allDbUsers.filter((u) =>
      u.roles.some((r) => ['admin', 'superadmin', 'administrator', 'editor', 'moderator'].includes(r.toLowerCase().replace(/\s+/g, '_')))
    ).length;
    const studentsCount = allDbUsers.filter((u) => u.roles.some((r) => r.toLowerCase() === 'student')).length;

    res.json({
      totalUsers,
      adminsCount,
      studentsCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// 21. Admin Management: All Test Submissions Audit (Real database test results)
apiRouter.get('/admin/results', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const roles = (req.user?.roles || []).map(r => r.toLowerCase().trim());
    if (roles.includes('moderator')) {
      return res.status(403).json({ error: 'Forbidden: Community moderators cannot access student test submissions.' });
    }

    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 150));
    const allResults = await getAllTestResultsFromDb(limit);
    res.json({ results: allResults });
  } catch (error: any) {
    console.error('Admin test results fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch test submissions' });
  }
});

// 22. Admin Management: Content Reports / Issues Review
apiRouter.get('/admin/reports', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const roles = (req.user?.roles || []).map(r => r.toLowerCase().trim());
    if (roles.includes('teacher')) {
      return res.status(403).json({ error: 'Forbidden: Teachers cannot manage platform content issue reports.' });
    }

    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));
    const reports = await getAllContentReportsFromDb(limit);
    res.json({ reports });
  } catch (error: any) {
    console.error('Admin reports fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch content reports' });
  }
});

// 23. Admin Management: Update Content Report Status (OPEN, IN_REVIEW, RESOLVED, REJECTED)
apiRouter.patch('/admin/reports/:reportId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const roles = (req.user?.roles || []).map(r => r.toLowerCase().trim());
    if (roles.includes('teacher')) {
      return res.status(403).json({ error: 'Forbidden: Teachers cannot modify platform content issue reports.' });
    }

    const reportId = req.params.reportId;
    const { status, adminNotes } = req.body;

    const validStatuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = await updateContentReportStatusInDb(
      reportId,
      status,
      adminNotes,
      req.user?.email || 'admin@taleemguru.pk'
    );

    if (!updated) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Audit log
    await saveAuditLogToDb({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'admin@taleemguru.pk',
      adminName: req.user!.name,
      action: 'REPORT_STATUS_CHANGED',
      targetType: 'report',
      targetId: reportId,
      details: `Status set to ${status}. Notes: ${adminNotes || 'None'}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, report: updated });
  } catch (error: any) {
    console.error('Admin update report error:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// 24. Admin Management: Audit Logs
apiRouter.get('/admin/audit-logs', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const roles = (req.user?.roles || []).map(r => r.toLowerCase().trim());
    if (['teacher', 'editor', 'contentmanager', 'content_manager'].some(r => roles.includes(r))) {
      return res.status(403).json({ error: 'Forbidden: Access to platform audit logs requires administrative or moderation privileges.' });
    }

    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));
    const logs = await getAllAuditLogsFromDb({
      limit,
      adminUid: req.query.staffUid as string,
      board: req.query.board as string,
      classLevel: req.query.classLevel as string,
      subject: req.query.subject as string,
    });
    res.json({ logs });
  } catch (error: any) {
    console.error('Admin audit logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// 25. Admin Management: Record Manual Audit Action (e.g. content additions from admin panel)
apiRouter.post('/admin/audit-logs', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const roles = (req.user?.roles || []).map(r => r.toLowerCase().trim());
    if (['teacher', 'editor', 'contentmanager', 'content_manager'].some(r => roles.includes(r))) {
      return res.status(403).json({ error: 'Forbidden: Access to record platform audit logs requires administrative or moderation privileges.' });
    }

    const { action, targetType, targetId, details, board, classLevel, subject } = req.body;
    if (!action || !targetType) {
      return res.status(400).json({ error: 'Action and targetType are required' });
    }

    const logEntry = await saveAuditLogToDb({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'admin@taleemguru.pk',
      adminName: req.user!.name,
      action: String(action).slice(0, 100),
      targetType: String(targetType).slice(0, 50),
      targetId: targetId ? String(targetId).slice(0, 100) : undefined,
      details: details ? String(details).slice(0, 1000) : undefined,
      board: board ? String(board).slice(0, 50) : undefined,
      classLevel: classLevel ? String(classLevel).slice(0, 50) : undefined,
      subject: subject ? String(subject).slice(0, 50) : undefined,
      ipAddress: req.ip,
    });

    res.json({ success: true, log: logEntry });
  } catch (error: any) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

// 26. Professional Analytics & Insights API
apiRouter.get('/analytics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const roles = (user.roles || []).map((r: string) => r.toLowerCase());
    const isAdmin = roles.includes('admin') || roles.includes('superadmin') || roles.includes('administrator');
    const isTeacher = roles.includes('teacher') || roles.includes('contentmanager') || roles.includes('editor');

    const range = (req.query.range as any) || 'all';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const filter: AnalyticsDateFilter = { range, startDate, endDate };

    // IDOR & Role Isolation Enforcement
    if (isAdmin) {
      const analytics = await getAdminAnalytics(filter);
      return res.json({ success: true, analytics });
    } else if (isTeacher) {
      const analytics = await getTeacherAnalytics(user.uid, filter);
      return res.json({ success: true, analytics });
    } else {
      const requestedUid = (req.query.userUid as string) || user.uid;
      if (requestedUid !== user.uid) {
        return res.status(403).json({ error: "Access denied: Cannot view another student's analytics (IDOR protection)" });
      }
      const analytics = await getStudentAnalytics(user.uid, filter);
      return res.json({ success: true, analytics });
    }
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

// 27. Professional Notifications & Communication API
apiRouter.get('/notifications', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const notificationsList = await getNotificationsForUser(user.uid);
    const unreadCount = await getUnreadNotificationCount(user.uid);

    res.json({ success: true, notifications: notificationsList, unreadCount });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

apiRouter.post('/notifications/:notificationId/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { notificationId } = req.params;
    const updated = await markNotificationRead(notificationId, user.uid);

    res.json({ success: true, notification: updated });
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

apiRouter.post('/notifications/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await markAllNotificationsRead(user.uid);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

apiRouter.post('/notifications/send', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const roles = (user.roles || []).map((r: string) => r.toLowerCase());
    const isAdmin = roles.includes('admin') || roles.includes('superadmin') || roles.includes('administrator');
    const isTeacher = roles.includes('teacher') || roles.includes('contentmanager') || roles.includes('editor');

    if (!isAdmin && !isTeacher) {
      return res.status(403).json({ error: 'Access denied: Only admins and teachers can dispatch notifications' });
    }

    const { recipientUid, title, message, category, actionUrl } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const notification = await createNotification({
      recipientUid: recipientUid || 'ALL',
      title: String(title).slice(0, 200),
      message: String(message).slice(0, 1000),
      category: category || 'Announcement',
      actionUrl: actionUrl ? String(actionUrl).slice(0, 500) : undefined,
      senderUid: user.uid,
      senderName: user.name || user.email,
    });

    res.json({ success: true, notification });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// 28. Admin Management: System Health
apiRouter.get('/admin/system-health', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const hasDb = Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME);
    const hasSupabase = Boolean(
      (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
      (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
    );

    res.json({
      status: 'healthy',
      database: {
        type: 'PostgreSQL (Cloud SQL)',
        status: hasDb ? 'Connected' : 'Not configured',
      },
      auth: {
        provider: 'Supabase Auth',
        status: hasSupabase ? 'Configured' : 'Not configured',
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
    });
  } catch (error: any) {
    console.error('System health check error:', error);
    res.status(500).json({ error: 'Failed to query system health' });
  }
});

// 29. Admin Maintenance: Database Integrity & Backup Export
apiRouter.get('/admin/integrity-check', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const report = await runDatabaseIntegrityCheck();
    res.json({ success: true, report });
  } catch (error: any) {
    console.error('Integrity check error:', error);
    res.status(500).json({ error: 'Failed to run database integrity check' });
  }
});

apiRouter.get('/admin/backup-export', requireHighAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const exportData = await generateSystemBackupExport();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="taleemguru-backup-${Date.now()}.json"`);
    res.json({ success: true, backup: exportData });
  } catch (error: any) {
    console.error('Backup export error:', error);
    res.status(500).json({ error: 'Failed to generate system backup export' });
  }
});

// 30. SEO Endpoints: Dynamic Sitemap, Robots.txt & Database-driven Metadata
app.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const xml = await generateDynamicSitemap();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    res.send(xml);
  } catch (error: any) {
    console.error('Error generating dynamic sitemap:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

app.get('/robots.txt', (req: Request, res: Response) => {
  try {
    const robots = generateRobotsTxt();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400');
    res.send(robots);
  } catch (error: any) {
    console.error('Error generating robots.txt:', error);
    res.status(500).send('User-agent: *\nDisallow: /admin\nDisallow: /api/');
  }
});

apiRouter.get('/seo/metadata', async (req: Request, res: Response) => {
  try {
    const meta = await getDynamicSeoMetadata({
      view: req.query.view as string,
      subFilter: req.query.subFilter as string,
      testId: req.query.testId as string,
      paperId: req.query.paperId as string,
      noteId: req.query.noteId as string,
      mcqId: req.query.mcqId as string,
      path: req.query.path as string,
    });
    res.json(meta);
  } catch (error: any) {
    console.error('Error resolving SEO metadata:', error);
    res.status(500).json({ error: 'Failed to resolve SEO metadata' });
  }
});

apiRouter.get('/seo/sitemap', async (req: Request, res: Response) => {
  try {
    const xml = await generateDynamicSitemap();
    res.json({ success: true, sitemapXml: xml });
  } catch (error: any) {
    console.error('Error generating dynamic sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

// Mount routes at /api
app.use('/api', apiRouter);

// Also mount apiRouter at root so serverless runtimes (like Vercel rewrites) that strip /api route seamlessly
app.use(apiRouter);

// Strict 404 handler for any unmatched /api/* route - GUARANTEES JSON responses, NEVER index.html
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
});

// Global server error handling - never leak stack traces, database credentials, or internal secrets
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: 'Internal server error. Please try again later.',
  });
});

export default app;
