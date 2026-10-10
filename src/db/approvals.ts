import { db } from './index.ts';
import { contentChangeRequests, users, auditLogs } from './schema.ts';
import { eq, desc, and, sql, ilike, inArray } from 'drizzle-orm';
import {
  createMCQInDb,
  updateMCQInDb,
  deleteMCQInDb,
  createTestInDb,
  updateTestInDb,
  deleteTestInDb,
  createPastPaperInDb,
  updatePastPaperInDb,
  deletePastPaperInDb,
  createStudyNoteInDb,
  updateStudyNoteInDb,
  deleteStudyNoteInDb,
} from './content.ts';
import {
  createBoardInDb,
  updateBoardInDb,
  deleteBoardFromDb,
  createClassInDb,
  updateClassInDb,
  deleteClassFromDb,
  createSubjectInDb,
  updateSubjectInDb,
  deleteSubjectFromDb,
  createChapterInDb,
  updateChapterInDb,
  deleteChapterFromDb,
  createEntryTestCategoryInDb,
  updateEntryTestCategoryInDb,
  deleteEntryTestCategoryFromDb,
  createEntryTestSubcategoryInDb,
  updateEntryTestSubcategoryInDb,
  deleteEntryTestSubcategoryFromDb,
} from './academic.ts';
import {
  saveAuditLogToDb,
  getUserByUid,
  addSyllabusToDb,
  updateSyllabusInDb,
  deleteSyllabusFromDb,
} from './users.ts';
import {
  updateDocumentMetadataInDb,
  deleteDocumentFromDb,
} from './documents.ts';

export interface ChangeRequestInput {
  entityType: string;
  entityId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  submittedBy: string;
  proposedData?: any;
  previousData?: any;
  title?: string;
  submitterName?: string;
  submitterEmail?: string;
  submitterRoles?: string[];
}

export interface ApprovalFilters {
  status?: string;
  entityType?: string;
  submittedBy?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Creates or updates an existing pending change request to prevent duplicate pending changes.
 */
export async function createOrUpdateChangeRequest(request: ChangeRequestInput) {
  if (!db) throw new Error('Database not connected');

  // Enforce metadata packing inside proposedData for transparent UI rendering
  const enrichedProposedData = request.proposedData ? {
    ...request.proposedData,
    _meta: {
      title: request.title || request.proposedData?.title || request.proposedData?.question || request.proposedData?.name || 'Untitled Content',
      submitterName: request.submitterName || 'Staff Member',
      submitterEmail: request.submitterEmail || '',
      submitterRoles: request.submitterRoles || ['Teacher'],
    },
  } : null;

  // Prevent duplicate spam: if staff user already submitted a pending request for the same entity and action, update it
  if (request.entityId) {
    const existing = await db
      .select()
      .from(contentChangeRequests)
      .where(
        and(
          eq(contentChangeRequests.entityType, request.entityType),
          eq(contentChangeRequests.entityId, request.entityId),
          eq(contentChangeRequests.submittedBy, request.submittedBy),
          eq(contentChangeRequests.status, 'PENDING')
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(contentChangeRequests)
        .set({
          proposedData: enrichedProposedData,
          previousData: request.previousData !== undefined ? request.previousData : existing[0].previousData,
          updatedAt: new Date(),
        })
        .where(eq(contentChangeRequests.id, existing[0].id))
        .returning();
      return updated[0];
    }
  }

  const inserted = await db
    .insert(contentChangeRequests)
    .values({
      entityType: request.entityType,
      entityId: request.entityId || null,
      action: request.action,
      submittedBy: request.submittedBy,
      status: 'PENDING',
      proposedData: enrichedProposedData,
      previousData: request.previousData || null,
    })
    .returning();

  return inserted[0];
}

/**
 * Fetches approval requests with filtering, pagination, search, and user details.
 */
export async function getApprovalRequests(filters: ApprovalFilters = {}) {
  if (!db) return { items: [], total: 0 };

  const conditions = [];

  if (filters.status && filters.status !== 'ALL') {
    conditions.push(eq(contentChangeRequests.status, filters.status.toUpperCase()));
  }

  if (filters.entityType && filters.entityType !== 'ALL') {
    const rawType = filters.entityType.toLowerCase();
    const typeVariants = [rawType];
    if (rawType.endsWith('s')) {
      typeVariants.push(rawType.slice(0, -1));
    } else {
      typeVariants.push(`${rawType}s`);
    }
    if (rawType === 'mcq' || rawType === 'mcqs') typeVariants.push('question', 'questions');
    if (rawType === 'test' || rawType === 'tests') typeVariants.push('quiz', 'quizzes');
    if (rawType === 'past_paper' || rawType === 'past_papers') typeVariants.push('past-papers', 'past-paper');
    if (rawType === 'study_note' || rawType === 'study_notes') typeVariants.push('study-notes', 'study-note');
    conditions.push(inArray(contentChangeRequests.entityType, typeVariants));
  }

  if (filters.submittedBy) {
    conditions.push(eq(contentChangeRequests.submittedBy, filters.submittedBy));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const totalRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(contentChangeRequests)
    .where(whereClause);

  const total = Number(totalRes[0]?.count || 0);

  const rows = await db
    .select()
    .from(contentChangeRequests)
    .where(whereClause)
    .orderBy(desc(contentChangeRequests.createdAt))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);

  // Collect unique submitter & reviewer UIDs to fetch profile information
  const userUids = new Set<string>();
  rows.forEach((r) => {
    if (r.submittedBy) userUids.add(r.submittedBy);
    if (r.reviewedBy) userUids.add(r.reviewedBy);
  });

  const usersMap: Record<string, { name: string; email: string; roles: string[] }> = {};
  if (userUids.size > 0) {
    try {
      const uidsArray = Array.from(userUids);
      const userRows = await db
        .select({
          uid: users.uid,
          name: users.name,
          email: users.email,
          roles: users.roles,
        })
        .from(users)
        .where(inArray(users.uid, uidsArray));

      userRows.forEach((u) => {
        usersMap[u.uid] = {
          name: u.name || u.email?.split('@')[0] || 'Staff Member',
          email: u.email || '',
          roles: u.roles || ['Staff'],
        };
      });
    } catch (e) {
      console.warn('Notice: Failed to fetch submitter users for approvals:', e);
    }
  }

  // Format and enrich rows for human-readable display
  const items = rows.map((r) => {
    const meta = (r.proposedData as any)?._meta || {};
    const submitter = usersMap[r.submittedBy] || {
      name: meta.submitterName || 'Staff Member',
      email: meta.submitterEmail || '',
      roles: meta.submitterRoles || ['Teacher'],
    };
    const reviewer = r.reviewedBy ? usersMap[r.reviewedBy] : undefined;

    const contentTitle =
      meta.title ||
      (r.proposedData as any)?.title ||
      (r.proposedData as any)?.question ||
      (r.proposedData as any)?.name ||
      (r.previousData as any)?.title ||
      (r.previousData as any)?.question ||
      (r.previousData as any)?.name ||
      `${r.entityType} ${r.entityId || ''}`.trim();

    return {
      id: r.id,
      entityType: r.entityType,
      entityId: r.entityId,
      action: r.action,
      submittedBy: r.submittedBy,
      submitterName: submitter.name,
      submitterEmail: submitter.email,
      submitterRoles: submitter.roles,
      status: r.status,
      contentTitle,
      proposedData: r.proposedData,
      previousData: r.previousData,
      reviewComment: r.reviewComment,
      reviewedBy: r.reviewedBy,
      reviewerName: reviewer?.name,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : null,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    };
  });

  // Client search filtering if requested
  const filteredItems = filters.search
    ? items.filter(
        (item) =>
          item.contentTitle.toLowerCase().includes(filters.search!.toLowerCase()) ||
          item.submitterName.toLowerCase().includes(filters.search!.toLowerCase()) ||
          item.submitterEmail.toLowerCase().includes(filters.search!.toLowerCase()) ||
          item.entityType.toLowerCase().includes(filters.search!.toLowerCase())
      )
    : items;

  return { items: filteredItems, total };
}

/**
 * Returns summary counts for the Admin Approvals Dashboard cards.
 */
export async function getApprovalStats() {
  if (!db) {
    return {
      pending: 0,
      approvedToday: 0,
      rejectedToday: 0,
      totalMonth: 0,
      total: 0,
    };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const [pendingRes, approvedTodayRes, rejectedTodayRes, totalMonthRes, totalRes] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(contentChangeRequests).where(eq(contentChangeRequests.status, 'PENDING')),
      db.select({ count: sql<number>`count(*)` }).from(contentChangeRequests).where(
        and(
          eq(contentChangeRequests.status, 'APPROVED'),
          sql`${contentChangeRequests.reviewedAt} >= ${startOfDay}`
        )
      ),
      db.select({ count: sql<number>`count(*)` }).from(contentChangeRequests).where(
        and(
          eq(contentChangeRequests.status, 'REJECTED'),
          sql`${contentChangeRequests.reviewedAt} >= ${startOfDay}`
        )
      ),
      db.select({ count: sql<number>`count(*)` }).from(contentChangeRequests).where(
        sql`${contentChangeRequests.createdAt} >= ${startOfMonth}`
      ),
      db.select({ count: sql<number>`count(*)` }).from(contentChangeRequests),
    ]);

    return {
      pending: Number(pendingRes[0]?.count || 0),
      approvedToday: Number(approvedTodayRes[0]?.count || 0),
      rejectedToday: Number(rejectedTodayRes[0]?.count || 0),
      totalMonth: Number(totalMonthRes[0]?.count || 0),
      total: Number(totalRes[0]?.count || 0),
    };
  } catch (error) {
    console.error('Error in getApprovalStats:', error);
    return {
      pending: 0,
      approvedToday: 0,
      rejectedToday: 0,
      totalMonth: 0,
      total: 0,
    };
  }
}

/**
 * Applies the approved content change to the authoritative live database tables.
 */
async function applyApprovedChange(request: any, reviewerUid: string) {
  const entityType = (request.entityType || '').toLowerCase();
  const action = request.action;
  const rawData = { ...(request.proposedData || {}) };
  // Remove temporary metadata wrapper before saving to content tables
  delete rawData._meta;

  const publishedData = {
    ...rawData,
    status: 'Published',
  };

  switch (entityType) {
    case 'mcqs':
    case 'mcq':
    case 'question': {
      if (action === 'CREATE') {
        return await createMCQInDb(publishedData, request.submittedBy);
      } else if (action === 'UPDATE') {
        return await updateMCQInDb(request.entityId, publishedData, reviewerUid);
      } else if (action === 'DELETE') {
        return await deleteMCQInDb(request.entityId);
      }
      break;
    }

    case 'tests':
    case 'test':
    case 'quiz': {
      if (action === 'CREATE') {
        return await createTestInDb(publishedData, request.submittedBy);
      } else if (action === 'UPDATE') {
        return await updateTestInDb(request.entityId, publishedData, reviewerUid);
      } else if (action === 'DELETE') {
        return await deleteTestInDb(request.entityId);
      }
      break;
    }

    case 'past_papers':
    case 'pastpapers':
    case 'pastpaper': {
      if (action === 'CREATE') {
        return await createPastPaperInDb(publishedData, request.submittedBy);
      } else if (action === 'UPDATE') {
        return await updatePastPaperInDb(request.entityId, publishedData, reviewerUid);
      } else if (action === 'DELETE') {
        return await deletePastPaperInDb(request.entityId);
      }
      break;
    }

    case 'study_notes':
    case 'studynotes':
    case 'notes':
    case 'note': {
      if (action === 'CREATE') {
        return await createStudyNoteInDb(publishedData, request.submittedBy);
      } else if (action === 'UPDATE') {
        return await updateStudyNoteInDb(request.entityId, publishedData, reviewerUid);
      } else if (action === 'DELETE') {
        return await deleteStudyNoteInDb(request.entityId);
      }
      break;
    }

    case 'boards':
    case 'board': {
      const id = parseInt(request.entityId || '0');
      if (action === 'CREATE') {
        return await createBoardInDb(publishedData);
      } else if (action === 'UPDATE') {
        return await updateBoardInDb(id, publishedData);
      } else if (action === 'DELETE') {
        return await deleteBoardFromDb(id);
      }
      break;
    }

    case 'classes':
    case 'class': {
      const id = parseInt(request.entityId || '0');
      if (action === 'CREATE') {
        return await createClassInDb(publishedData);
      } else if (action === 'UPDATE') {
        return await updateClassInDb(id, publishedData);
      } else if (action === 'DELETE') {
        return await deleteClassFromDb(id);
      }
      break;
    }

    case 'subjects':
    case 'subject': {
      const id = parseInt(request.entityId || '0');
      if (action === 'CREATE') {
        return await createSubjectInDb(publishedData);
      } else if (action === 'UPDATE') {
        return await updateSubjectInDb(id, publishedData);
      } else if (action === 'DELETE') {
        return await deleteSubjectFromDb(id);
      }
      break;
    }

    case 'chapters':
    case 'chapter': {
      const id = parseInt(request.entityId || '0');
      if (action === 'CREATE') {
        return await createChapterInDb(publishedData);
      } else if (action === 'UPDATE') {
        return await updateChapterInDb(id, publishedData);
      } else if (action === 'DELETE') {
        return await deleteChapterFromDb(id);
      }
      break;
    }

    case 'syllabus': {
      const id = parseInt(request.entityId || '0');
      if (action === 'CREATE') {
        return await addSyllabusToDb(publishedData.subjectId, publishedData.content);
      } else if (action === 'UPDATE') {
        return await updateSyllabusInDb(id, publishedData.content);
      } else if (action === 'DELETE') {
        return await deleteSyllabusFromDb(id);
      }
      break;
    }

    case 'documents':
    case 'document': {
      if (action === 'CREATE' || action === 'UPDATE') {
        return await updateDocumentMetadataInDb(request.entityId, { ...publishedData, status: 'Published' }, reviewerUid);
      } else if (action === 'DELETE') {
        return await deleteDocumentFromDb(request.entityId);
      }
      break;
    }

    case 'entry_tests':
    case 'entry_test':
    case 'entry_test_categories': {
      const id = parseInt(request.entityId || '0');
      if (action === 'CREATE') {
        return await createEntryTestCategoryInDb(publishedData);
      } else if (action === 'UPDATE') {
        return await updateEntryTestCategoryInDb(id, publishedData);
      } else if (action === 'DELETE') {
        return await deleteEntryTestCategoryFromDb(id);
      }
      break;
    }

    case 'entry_test_subcategories': {
      const id = parseInt(request.entityId || '0');
      if (action === 'CREATE') {
        return await createEntryTestSubcategoryInDb(publishedData);
      } else if (action === 'UPDATE') {
        return await updateEntryTestSubcategoryInDb(id, publishedData);
      } else if (action === 'DELETE') {
        return await deleteEntryTestSubcategoryFromDb(id);
      }
      break;
    }

    default:
      throw new Error(`Unsupported entity type: ${request.entityType}`);
  }
}

/**
 * Authoritatively approves a pending change request and publishes the change live.
 * Thread-safe with concurrency conflict protection (409 if already processed).
 */
export async function approveChangeRequest(
  id: number,
  reviewerUid: string,
  reviewerEmail: string,
  reviewerName: string,
  comment?: string,
  ipAddress?: string
) {
  if (!db) throw new Error('Database not connected');

  // Load existing request
  const existing = await db
    .select()
    .from(contentChangeRequests)
    .where(eq(contentChangeRequests.id, id))
    .limit(1);

  if (existing.length === 0) {
    const err: any = new Error('Change request not found');
    err.statusCode = 404;
    throw err;
  }

  const reqRecord = existing[0];

  // Concurrency check: must be PENDING
  if (reqRecord.status !== 'PENDING') {
    const err: any = new Error(`Request has already been ${reqRecord.status.toLowerCase()} and cannot be approved again.`);
    err.statusCode = 409;
    throw err;
  }

  // Prevent staff from approving their own change requests
  if (reqRecord.submittedBy === reviewerUid) {
    const err: any = new Error('Self-approval forbidden: Staff cannot approve their own submissions.');
    err.statusCode = 403;
    throw err;
  }

  // 1. Transactionally apply proposed data to authoritative content tables
  const appliedResult = await applyApprovedChange(reqRecord, reviewerUid);

  // 2. Mark request as APPROVED
  const now = new Date();
  const updatedRows = await db
    .update(contentChangeRequests)
    .set({
      status: 'APPROVED',
      reviewedBy: reviewerUid,
      reviewedAt: now,
      publishedAt: now,
      reviewComment: comment?.trim() || 'Approved and published to production website.',
      updatedAt: now,
    })
    .where(and(eq(contentChangeRequests.id, id), eq(contentChangeRequests.status, 'PENDING')))
    .returning();

  if (updatedRows.length === 0) {
    const err: any = new Error('Conflict: Request was modified concurrently by another administrator.');
    err.statusCode = 409;
    throw err;
  }

  // 3. Write permanent audit trail
  const meta = (reqRecord.proposedData as any)?._meta || {};
  const contentTitle =
    meta.title ||
    (reqRecord.proposedData as any)?.title ||
    (reqRecord.proposedData as any)?.question ||
    (reqRecord.proposedData as any)?.name ||
    `${reqRecord.entityType} ${reqRecord.entityId || ''}`;

  await saveAuditLogToDb({
    adminUid: reviewerUid,
    adminEmail: reviewerEmail,
    adminName: reviewerName,
    action: `APPROVE_${reqRecord.action}_${reqRecord.entityType.toUpperCase()}`,
    targetType: reqRecord.entityType.toUpperCase(),
    targetId: reqRecord.entityId || String(id),
    details: `Admin approved ${reqRecord.action} for ${reqRecord.entityType}: "${contentTitle}" (Submitted by ${meta.submitterName || reqRecord.submittedBy}). Comment: ${comment || 'Approved'}`,
    ipAddress,
  });

  return {
    success: true,
    request: updatedRows[0],
    appliedResult,
  };
}

/**
 * Authoritatively rejects a pending change request with a mandatory reason.
 * The proposed changes never touch the live content tables.
 */
export async function rejectChangeRequest(
  id: number,
  reviewerUid: string,
  reviewerEmail: string,
  reviewerName: string,
  reason: string,
  ipAddress?: string
) {
  if (!db) throw new Error('Database not connected');

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    const err: any = new Error('A rejection reason is required so staff know what to correct.');
    err.statusCode = 400;
    throw err;
  }

  const existing = await db
    .select()
    .from(contentChangeRequests)
    .where(eq(contentChangeRequests.id, id))
    .limit(1);

  if (existing.length === 0) {
    const err: any = new Error('Change request not found');
    err.statusCode = 404;
    throw err;
  }

  const reqRecord = existing[0];

  // Concurrency check
  if (reqRecord.status !== 'PENDING') {
    const err: any = new Error(`Request has already been ${reqRecord.status.toLowerCase()} and cannot be rejected again.`);
    err.statusCode = 409;
    throw err;
  }

  const now = new Date();
  const updatedRows = await db
    .update(contentChangeRequests)
    .set({
      status: 'REJECTED',
      reviewedBy: reviewerUid,
      reviewedAt: now,
      reviewComment: reason.trim(),
      updatedAt: now,
    })
    .where(and(eq(contentChangeRequests.id, id), eq(contentChangeRequests.status, 'PENDING')))
    .returning();

  if (updatedRows.length === 0) {
    const err: any = new Error('Conflict: Request was modified concurrently by another administrator.');
    err.statusCode = 409;
    throw err;
  }

  // Write permanent audit trail
  const meta = (reqRecord.proposedData as any)?._meta || {};
  const contentTitle =
    meta.title ||
    (reqRecord.proposedData as any)?.title ||
    (reqRecord.proposedData as any)?.question ||
    (reqRecord.proposedData as any)?.name ||
    `${reqRecord.entityType} ${reqRecord.entityId || ''}`;

  await saveAuditLogToDb({
    adminUid: reviewerUid,
    adminEmail: reviewerEmail,
    adminName: reviewerName,
    action: `REJECT_${reqRecord.action}_${reqRecord.entityType.toUpperCase()}`,
    targetType: reqRecord.entityType.toUpperCase(),
    targetId: reqRecord.entityId || String(id),
    details: `Admin rejected ${reqRecord.action} for ${reqRecord.entityType}: "${contentTitle}". Reason: ${reason.trim()}`,
    ipAddress,
  });

  return {
    success: true,
    request: updatedRows[0],
  };
}

/**
 * Returns all submissions for a staff member (for Staff "My Submissions" page).
 */
export async function getMySubmissions(userUid: string) {
  if (!db) return [];
  const rows = await db
    .select()
    .from(contentChangeRequests)
    .where(eq(contentChangeRequests.submittedBy, userUid))
    .orderBy(desc(contentChangeRequests.createdAt));

  return rows.map((r) => {
    const meta = (r.proposedData as any)?._meta || {};
    const contentTitle =
      meta.title ||
      (r.proposedData as any)?.title ||
      (r.proposedData as any)?.question ||
      (r.proposedData as any)?.name ||
      `${r.entityType} ${r.entityId || ''}`.trim();

    return {
      id: r.id,
      entityType: r.entityType,
      entityId: r.entityId,
      action: r.action,
      status: r.status,
      contentTitle,
      proposedData: r.proposedData,
      previousData: r.previousData,
      reviewComment: r.reviewComment,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : null,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : (r.status === 'APPROVED' && r.reviewedAt ? new Date(r.reviewedAt).toISOString() : null),
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    };
  });
}

// Backward-compatibility exports
export const createChangeRequest = createOrUpdateChangeRequest;
export async function getPendingRequests() {
  const res = await getApprovalRequests({ status: 'PENDING' });
  return res.items;
}
export async function getRequestById(id: number) {
  if (!db) return [];
  return await db.select().from(contentChangeRequests).where(eq(contentChangeRequests.id, id));
}
export async function updateRequestStatus(
  id: number,
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
  reviewedBy: string,
  reviewComment?: string
) {
  if (!db) return [];
  return await db
    .update(contentChangeRequests)
    .set({
      status,
      reviewedBy,
      reviewedAt: new Date(),
      reviewComment,
      updatedAt: new Date(),
      publishedAt: status === 'APPROVED' ? new Date() : undefined,
    })
    .where(eq(contentChangeRequests.id, id))
    .returning();
}
