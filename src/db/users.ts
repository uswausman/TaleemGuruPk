import crypto from 'crypto';
import { db } from './index.ts';
import { users, testResults, bookmarkedQuestions, certificates, contentReports, auditLogs, staffAssignments, boards, classes, subjects, chapters, syllabus } from './schema.ts';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';

// Server-authoritative bootstrap administrative identities (strictly server-side, never exposed to client)
export interface BootstrapAdminConfig {
  name: string;
  roles: string[];
}

export const DEFAULT_BOOTSTRAP_ADMINS: Record<string, BootstrapAdminConfig> = {
  'admin@taleemguru.pk': { name: 'Admin', roles: ['Admin'] },
};

export function getTrustedBootstrapAdmins(): Record<string, BootstrapAdminConfig> {
  const configs: Record<string, BootstrapAdminConfig> = { ...DEFAULT_BOOTSTRAP_ADMINS };

  const envCandidates = [
    process.env.TRUSTED_BOOTSTRAP_ADMINS,
    process.env.ADMIN_EMAILS,
    process.env.ADMIN_EMAIL,
    process.env.BOOTSTRAP_ADMIN_EMAILS,
    process.env.BOOTSTRAP_ADMIN,
  ].filter(Boolean) as string[];

  for (const envRaw of envCandidates) {
    try {
      let trimmed = envRaw.trim();
      // Strip surrounding quotes that users often enter in Vercel / environment dashboards
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        trimmed = trimmed.slice(1, -1).trim();
      }

      // If JSON object format
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        for (const [key, val] of Object.entries(parsed)) {
          const email = key.trim().toLowerCase().replace(/^["']|["']$/g, '');
          if (email && email.includes('@')) {
            if (typeof val === 'string') {
              configs[email] = { name: val || 'Admin', roles: ['Admin'] };
            } else if (val && typeof val === 'object') {
              configs[email] = {
                name: (val as any).name || 'Admin',
                roles: (val as any).roles || (val as any).role ? [(val as any).roles || (val as any).role] : ['Admin'],
              };
            }
          }
        }
      } else {
        // Delimited list format (commas, semicolons, whitespace, newlines, quotes)
        const parts = trimmed.split(/[,;\s\n\r]+/);
        for (const p of parts) {
          const clean = p.trim().toLowerCase().replace(/^["']|["']$/g, '');
          if (clean && clean.includes('@')) {
            configs[clean] = { name: 'Admin', roles: ['Admin'] };
          }
        }
      }
    } catch (err) {
      console.warn('Notice: Error parsing admin env variable candidate:', err);
    }
  }

  return configs;
}

export function isTrustedBootstrapAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase().replace(/^["']|["']$/g, '');
  const admins = getTrustedBootstrapAdmins();
  return Boolean(admins[clean]);
}

export const TRUSTED_BOOTSTRAP_ADMINS: Record<string, BootstrapAdminConfig> = new Proxy(
  DEFAULT_BOOTSTRAP_ADMINS,
  {
    get(target, prop: string) {
      const current = getTrustedBootstrapAdmins();
      const normalizedProp = typeof prop === 'string' ? prop.trim().toLowerCase() : prop;
      return current[normalizedProp] || (target as any)[normalizedProp] || current[prop] || (target as any)[prop];
    },
    has(target, prop: string) {
      const current = getTrustedBootstrapAdmins();
      const normalizedProp = typeof prop === 'string' ? prop.trim().toLowerCase() : prop;
      return normalizedProp in current || prop in current || normalizedProp in target || prop in target;
    },
    ownKeys() {
      return Object.keys(getTrustedBootstrapAdmins());
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      const current = getTrustedBootstrapAdmins();
      const normalizedProp = prop.trim().toLowerCase();
      const val = current[normalizedProp] || current[prop];
      if (val !== undefined) {
        return {
          enumerable: true,
          configurable: true,
          value: val,
        };
      }
      return undefined;
    },
  }
);

export const TRUSTED_BOOTSTRAP_ADMIN_EMAILS = new Proxy(new Set(Object.keys(DEFAULT_BOOTSTRAP_ADMINS)), {
  get(target, prop: string) {
    if (prop === 'has') {
      return (val: string) => isTrustedBootstrapAdminEmail(val);
    }
    const currentSet = new Set(Object.keys(getTrustedBootstrapAdmins()).map((e) => e.toLowerCase()));
    return (currentSet as any)[prop];
  },
});

export async function getUserByEmail(email: string) {
  if (!email) return null;
  try {
    const normalized = email.toLowerCase().trim();
    const records = await db
      .select()
      .from(users)
      .where(sql`LOWER(TRIM(${users.email})) = ${normalized}`)
      .limit(1);
    const user = records[0] || null;
    if (user) {
      const bootstrapConfig = TRUSTED_BOOTSTRAP_ADMINS[normalized];
      if (bootstrapConfig && (!bootstrapConfig.roles.every(r => user.roles.includes(r)) || user.name !== bootstrapConfig.name)) {
        const [promoted] = await db
          .update(users)
          .set({
            roles: bootstrapConfig.roles,
            name: bootstrapConfig.name,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning();
        return promoted || { ...user, roles: bootstrapConfig.roles, name: bootstrapConfig.name };
      }
    }
    return user;
  } catch (error) {
    console.error('Failed to get user by email:', error);
    return null;
  }
}

export async function syncBootstrapAdmins() {
  try {
    for (const [email, config] of Object.entries(TRUSTED_BOOTSTRAP_ADMINS)) {
      const normalized = email.toLowerCase().trim();
      const existing = await getUserByEmail(normalized);
      if (existing) {
        const existingRoles = (existing as any).roles || [];
        if (!config.roles.every(r => existingRoles.includes(r)) || existing.name !== config.name) {
          await db
            .update(users)
            .set({
              roles: config.roles,
              name: config.name,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id));
          console.log(`[Bootstrap] Synchronized admin ${normalized}: roles=${config.roles.join(',')}, name=${config.name}`);
        }
      } else {
        // Pre-create initial bootstrap admin record in database
        try {
          await db
            .insert(users)
            .values({
              uid: `bootstrap-admin-${normalized}`,
              email: normalized,
              name: config.name,
              roles: config.roles,
              targetExam: 'MDCAT',
              classLevel: 'Class 10',
              board: 'Punjab',
              avatar: 'avatar-1',
            })
            .onConflictDoNothing();
          console.log(`[Bootstrap] Pre-seeded bootstrap admin ${normalized} with roles=${config.roles.join(',')}`);
        } catch (insertErr) {
          console.warn(`[Bootstrap] Notice pre-seeding ${normalized}:`, insertErr);
        }
      }
    }
  } catch (err) {
    console.warn('[Bootstrap] Notice in syncBootstrapAdmins:', err);
  }
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  extra?: {
    name?: string;
    targetExam?: string;
    classLevel?: string;
    board?: string;
    avatar?: string;
  }
) {
  try {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const bootstrapConfig = TRUSTED_BOOTSTRAP_ADMINS[normalizedEmail];
    const isBootstrapAdmin = Boolean(bootstrapConfig);
    const designatedRoles = bootstrapConfig ? bootstrapConfig.roles : ['Student'];

    // 1. Authoritative check: if user already exists in database by UID
    let existing = await getUserByUid(uid);

    // If not found by UID, check if an existing record exists with this email (e.g. from prior setup/auth)
    if (!existing && normalizedEmail) {
      existing = await getUserByEmail(normalizedEmail);
      if (existing) {
        // Link authenticated Supabase UID to existing user record without creating a duplicate
        const shouldPromoteAdmin = isBootstrapAdmin && (!(existing as any).roles?.some((r: string) => designatedRoles.includes(r)));
        const shouldEnforceAdminName = isBootstrapAdmin && existing.name !== bootstrapConfig.name;

        try {
          const [updated] = await db
            .update(users)
            .set({
              uid, // Update to authenticated Supabase UID
              ...(shouldPromoteAdmin ? { roles: designatedRoles } : {}),
              ...(shouldEnforceAdminName ? { name: bootstrapConfig.name } : {}),
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id))
            .returning();
          return updated || existing;
        } catch (updateErr) {
          console.warn('Notice: Updating user UID encountered constraint, updating role/name directly:', updateErr);
          if (shouldPromoteAdmin || shouldEnforceAdminName) {
            const [promoted] = await db
              .update(users)
              .set({
                ...(shouldPromoteAdmin ? { roles: designatedRoles } : {}),
                ...(shouldEnforceAdminName ? { name: bootstrapConfig.name } : {}),
                updatedAt: new Date(),
              })
              .where(eq(users.id, existing.id))
              .returning();
            return promoted || existing;
          }
          return existing;
        }
      }
    }

    if (existing) {
      // Existing DB name is authoritative for regular users. NEVER overwrite existing.name with provider metadata or email prefix.
      const existingEmail = (existing.email || '').toLowerCase().trim();
      const isAccountBootstrapAdmin = isBootstrapAdmin || TRUSTED_BOOTSTRAP_ADMIN_EMAILS.has(existingEmail);
      const effectiveBootstrap = bootstrapConfig || TRUSTED_BOOTSTRAP_ADMINS[existingEmail];

      const shouldUpdateEmail = Boolean(normalizedEmail && existingEmail !== normalizedEmail);
      const shouldPromoteAdmin = isAccountBootstrapAdmin && effectiveBootstrap && !existing.roles.some(r => effectiveBootstrap.roles.includes(r));
      const shouldEnforceAdminName = isAccountBootstrapAdmin && effectiveBootstrap && existing.name !== effectiveBootstrap.name;

      if (shouldUpdateEmail || shouldPromoteAdmin || shouldEnforceAdminName) {
        const [updated] = await db
          .update(users)
          .set({
            ...(shouldUpdateEmail ? { email: normalizedEmail } : {}),
            ...(shouldPromoteAdmin ? { roles: effectiveBootstrap.roles } : {}),
            ...(shouldEnforceAdminName ? { name: effectiveBootstrap.name } : {}),
            updatedAt: new Date(),
          })
          .where(eq(users.uid, uid))
          .returning();
        return updated || existing;
      }

      return existing;
    }

    // 2. Brand-new user creation:
    // For bootstrap administrator, strictly set their configured name ('Admin') and role ('Admin').
    // For normal learners, provider name (extra?.name) is used as the initial fallback on initial creation.
    const initialName = isBootstrapAdmin
      ? bootstrapConfig.name
      : (extra?.name?.trim() || 'Learner');

    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        name: initialName,
        roles: designatedRoles,
        targetExam: extra?.targetExam || 'MDCAT',
        classLevel: extra?.classLevel || 'Class 10',
        board: extra?.board || 'Punjab',
        avatar: extra?.avatar || 'avatar-1',
      })
      .onConflictDoUpdate({
        target: users.uid,
        // On conflict (e.g. concurrent insert race condition):
        // NEVER overwrite a student's custom name with incoming extra.name.
        // For bootstrap admins, ensure their authoritative role and name are enforced.
        set: {
          email: normalizedEmail,
          ...(isBootstrapAdmin ? { roles: bootstrapConfig.roles, name: bootstrapConfig.name } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed in getOrCreateUser:', error);
    throw new Error('Failed to get or create user profile', { cause: error });
  }
}

export async function isUserAdminInDatabase(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const user = await getUserByUid(uid);
    if (!user) return false;
    const role = (user.roles[0] || '').trim().toLowerCase();
    return ['admin', 'superadmin', 'administrator'].includes(role);
  } catch (error) {
    console.error('Failed to verify admin status in database:', error);
    return false; // Fail closed
  }
}

export async function getAllUsersFromDb(limit = 150) {
  try {
    const rawUsers = await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        name: users.name,
        roles: users.roles,
        targetExam: users.targetExam,
        classLevel: users.classLevel,
        board: users.board,
        points: users.points,
        streakDays: users.streakDays,
        testsTaken: users.testsTaken,
        avatar: users.avatar,
        status: users.status,
        permissions: users.permissions,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);

    if (rawUsers.length === 0) return [];

    const uids = rawUsers.map((u) => u.uid);
    let assignmentsMap: Record<string, any[]> = {};

    try {
      const allAssignments = await db
        .select()
        .from(staffAssignments)
        .where(inArray(staffAssignments.userUid, uids));

      for (const a of allAssignments) {
        if (!assignmentsMap[a.userUid]) {
          assignmentsMap[a.userUid] = [];
        }
        assignmentsMap[a.userUid].push(a);
      }
    } catch (assignErr) {
      console.warn('Notice loading staff assignments in getAllUsersFromDb:', assignErr);
    }

    return rawUsers.map((u) => ({
      ...u,
      status: u.status || 'Active',
      permissions: u.permissions || [],
      assignments: assignmentsMap[u.uid] || [],
    }));
  } catch (error) {
    console.error('Failed to get all users from database:', error);
    throw new Error('Failed to load users', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const records = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    const user = records[0] || null;
    if (user && user.email) {
      const normalized = user.email.toLowerCase().trim();
      const bootstrapConfig = TRUSTED_BOOTSTRAP_ADMINS[normalized];
      if (bootstrapConfig && (!bootstrapConfig.roles.every(r => user.roles.includes(r)) || user.name !== bootstrapConfig.name)) {
        const [promoted] = await db
          .update(users)
          .set({
            roles: bootstrapConfig.roles,
            name: bootstrapConfig.name,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning();
        return promoted || { ...user, roles: bootstrapConfig.roles, name: bootstrapConfig.name };
      }
    }
    return user;
  } catch (error) {
    console.error('Failed to get user by UID:', error);
    throw new Error('Database query failed for user', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<{
    name: string;
    targetExam: string;
    classLevel: string;
    board: string;
    points: number;
    streakDays: number;
    testsTaken: number;
    avatar: string;
  }>
) {
  try {
    const updated = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return updated[0] || null;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw new Error('Database update failed for user profile', { cause: error });
  }
}

export async function saveTestResultToDb(result: {
  resultId: string;
  userUid: string;
  testId: string;
  testTitle: string;
  testType: string;
  subject: string;
  category: string;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  timeUsedSeconds: number;
  percentileRank: number;
  answers: any;
}) {
  try {
    // Idempotent duplicate prevention: check if resultId already recorded
    const existing = await db
      .select()
      .from(testResults)
      .where(eq(testResults.resultId, result.resultId))
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    const saved = await db
      .insert(testResults)
      .values(result)
      .returning();

    // Increment tests_taken and points for the user
    const existingUser = await getUserByUid(result.userUid);
    if (existingUser) {
      await db
        .update(users)
        .set({
          testsTaken: existingUser.testsTaken + 1,
          points: existingUser.points + Math.max(10, Math.round(result.marksObtained * 5)),
          updatedAt: new Date(),
        })
        .where(eq(users.uid, result.userUid));
    }

    return saved[0];
  } catch (error) {
    console.error('Failed to save test result:', error);
    throw new Error('Failed to save test result', { cause: error });
  }
}

export async function getUserTestResultsFromDb(userUid: string) {
  try {
    return await db
      .select()
      .from(testResults)
      .where(eq(testResults.userUid, userUid))
      .orderBy(desc(testResults.createdAt));
  } catch (error) {
    console.error('Failed to get user test results:', error);
    throw new Error('Failed to retrieve test history', { cause: error });
  }
}

export async function saveCertificateToDb(cert: {
  id: string;
  userUid: string;
  studentName: string;
  testId?: string;
  testName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  className?: string;
  subjectName?: string;
  chapterName?: string;
  performanceLevel?: string;
  status?: 'VALID' | 'REVOKED';
  verificationUrl: string;
}) {
  try {
    const existing = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, cert.id))
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    const saved = await db.insert(certificates).values({
      ...cert,
      testId: cert.testId || cert.id || 'default-test',
      status: cert.status || 'VALID',
    }).returning();
    return saved[0];
  } catch (error) {
    console.error('Failed to save certificate:', error);
    throw new Error('Failed to save certificate', { cause: error });
  }
}

export async function getUserCertificatesFromDb(userUid: string) {
  try {
    return await db
      .select()
      .from(certificates)
      .where(eq(certificates.userUid, userUid))
      .orderBy(desc(certificates.issueDate));
  } catch (error) {
    console.error('Failed to get user certificates:', error);
    throw new Error('Failed to retrieve certificates', { cause: error });
  }
}

export async function getCertificateByIdFromDb(certificateId: string, requestingUserUid?: string) {
  try {
    const list = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, certificateId))
      .limit(1);

    if (!list || list.length === 0) return null;
    const cert = list[0];

    // If requestingUserUid is provided, enforce strict IDOR protection
    if (requestingUserUid && cert.userUid !== requestingUserUid) {
      return null;
    }

    return cert;
  } catch (error) {
    console.error('Failed to get certificate by ID:', error);
    return null;
  }
}

export async function getTopLeaderboard(limitCount = 20) {
  try {
    return await db
      .select({
        id: users.id,
        uid: users.uid,
        name: users.name,
        points: users.points,
        streakDays: users.streakDays,
        testsTaken: users.testsTaken,
        board: users.board,
        classLevel: users.classLevel,
        avatar: users.avatar,
      })
      .from(users)
      .orderBy(desc(users.points))
      .limit(limitCount);
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    throw new Error('Failed to load leaderboard', { cause: error });
  }
}

export async function toggleBookmarkInDb(userUid: string, questionId: string) {
  try {
    const existing = await db
      .select()
      .from(bookmarkedQuestions)
      .where(
        and(
          eq(bookmarkedQuestions.userUid, userUid),
          eq(bookmarkedQuestions.questionId, questionId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(bookmarkedQuestions)
        .where(
          and(
            eq(bookmarkedQuestions.userUid, userUid),
            eq(bookmarkedQuestions.questionId, questionId)
          )
        );
      return { bookmarked: false };
    } else {
      await db.insert(bookmarkedQuestions).values({
        userUid,
        questionId,
      });
      return { bookmarked: true };
    }
  } catch (error) {
    console.error('Failed to toggle bookmark:', error);
    throw new Error('Failed to toggle question bookmark', { cause: error });
  }
}

export async function getUserBookmarksFromDb(userUid: string) {
  try {
    const list = await db
      .select({ questionId: bookmarkedQuestions.questionId })
      .from(bookmarkedQuestions)
      .where(eq(bookmarkedQuestions.userUid, userUid));
    return list.map((item) => item.questionId);
  } catch (error) {
    console.error('Failed to get user bookmarks:', error);
    throw new Error('Failed to get bookmarks', { cause: error });
  }
}

export async function getPlatformPublicStats() {
  try {
    const totalUsersResult = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalResultsResult = await db.select({ count: sql<number>`count(*)` }).from(testResults);
    const totalCertsResult = await db.select({ count: sql<number>`count(*)` }).from(certificates);

    return {
      registeredStudents: Number(totalUsersResult[0]?.count || 0),
      testSubmissions: Number(totalResultsResult[0]?.count || 0),
      certificatesIssued: Number(totalCertsResult[0]?.count || 0),
    };
  } catch (error) {
    console.error('Failed to get platform public stats:', error);
    return {
      registeredStudents: 0,
      testSubmissions: 0,
      certificatesIssued: 0,
    };
  }
}

// 1. Get All Test Results for Admin Audit
export async function getAllTestResultsFromDb(limit = 200) {
  try {
    return await db
      .select({
        id: testResults.resultId,
        resultId: testResults.resultId,
        userUid: testResults.userUid,
        testId: testResults.testId,
        testTitle: testResults.testTitle,
        testType: testResults.testType,
        subject: testResults.subject,
        category: testResults.category,
        totalQuestions: testResults.totalQuestions,
        answeredCount: testResults.answeredCount,
        correctCount: testResults.correctCount,
        wrongCount: testResults.wrongCount,
        marksObtained: testResults.marksObtained,
        totalMarks: testResults.totalMarks,
        percentage: testResults.percentage,
        grade: testResults.grade,
        timeUsedSeconds: testResults.timeUsedSeconds,
        percentileRank: testResults.percentileRank,
        createdAt: testResults.createdAt,
      })
      .from(testResults)
      .orderBy(desc(testResults.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to load all test results for admin:', error);
    throw new Error('Failed to load test submissions', { cause: error });
  }
}

// 2. Save Content / Question Issue Report from Student or User
export async function saveContentReportToDb(report: {
  category: string;
  questionId?: string;
  subject?: string;
  description: string;
  userEmail?: string;
  userUid?: string;
}) {
  try {
    const reportId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const inserted = await db
      .insert(contentReports)
      .values({
        reportId,
        category: report.category,
        questionId: report.questionId || null,
        subject: report.subject || null,
        description: report.description,
        userEmail: report.userEmail || null,
        userUid: report.userUid || null,
        status: 'OPEN',
      })
      .returning();

    return inserted[0] || null;
  } catch (error) {
    console.error('Failed to save content report to database:', error);
    throw new Error('Failed to save content report', { cause: error });
  }
}

// 3. Get All Content Reports for Admin Review
export async function getAllContentReportsFromDb(limit = 100) {
  try {
    return await db
      .select()
      .from(contentReports)
      .orderBy(desc(contentReports.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get content reports:', error);
    throw new Error('Failed to retrieve content reports', { cause: error });
  }
}

// 4. Update Content Report Status (OPEN, IN_REVIEW, RESOLVED, REJECTED)
export async function updateContentReportStatusInDb(
  reportId: string,
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED',
  adminNotes?: string,
  resolvedBy?: string
) {
  try {
    const updated = await db
      .update(contentReports)
      .set({
        status,
        adminNotes: adminNotes ?? undefined,
        resolvedBy: resolvedBy ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(contentReports.reportId, reportId))
      .returning();

    return updated[0] || null;
  } catch (error) {
    console.error('Failed to update content report status:', error);
    throw new Error('Failed to update content report status', { cause: error });
  }
}

// 5. Save Admin Audit Log
export async function saveAuditLogToDb(log: {
  adminUid: string;
  adminEmail: string;
  adminName?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  board?: string;
  classLevel?: string;
  subject?: string;
  ipAddress?: string;
}) {
  try {
    const inserted = await db
      .insert(auditLogs)
      .values({
        adminUid: log.adminUid,
        adminEmail: log.adminEmail,
        adminName: log.adminName || null,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId || null,
        details: log.details || null,
        board: log.board || null,
        classLevel: log.classLevel || null,
        subject: log.subject || null,
        ipAddress: log.ipAddress || null,
      })
      .returning();

    return inserted[0] || null;
  } catch (error) {
    console.error('Failed to record audit log:', error);
    return null; // Non-blocking audit recording
  }
}

// 6. Get All Audit Logs
export async function getAllAuditLogsFromDb(filters: {
  limit?: number;
  adminUid?: string;
  board?: string;
  classLevel?: string;
  subject?: string;
} = {}) {
  try {
    const whereConditions = [];
    if (filters.adminUid) whereConditions.push(eq(auditLogs.adminUid, filters.adminUid));
    if (filters.board) whereConditions.push(eq(auditLogs.board, filters.board));
    if (filters.classLevel) whereConditions.push(eq(auditLogs.classLevel, filters.classLevel));
    if (filters.subject) whereConditions.push(eq(auditLogs.subject, filters.subject));

    return await db
      .select()
      .from(auditLogs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters.limit || 150);
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    throw new Error('Failed to retrieve audit logs', { cause: error });
  }
}

// 7. Update User Roles with Authoritative Database Persistence
export async function updateUserRolesInDb(uid: string, newRoles: string[]) {
  try {
    const updated = await db
      .update(users)
      .set({
        roles: newRoles,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return updated[0] || null;
  } catch (error) {
    console.error('Failed to update user roles in database:', error);
    throw new Error('Failed to update user roles', { cause: error });
  }
}

// 7b. Create New Staff or User Account in Database
export async function createUserInDb(data: {
  uid: string;
  email: string;
  name: string;
  roles: string[];
  targetExam?: string;
  classLevel?: string;
  board?: string;
  avatar?: string;
  status?: string;
  permissions?: string[];
  password?: string;
}) {
  try {
    const cleanEmail = data.email.toLowerCase().trim();
    let initialPermissions = [...(data.permissions || [])];
    if (data.password) {
      const pwdToken = hashPassword(data.password);
      initialPermissions = [pwdToken, ...initialPermissions];
    }

    const [created] = await db
      .insert(users)
      .values({
        uid: data.uid,
        email: cleanEmail,
        name: data.name || cleanEmail.split('@')[0],
        roles: data.roles || ['Student'],
        targetExam: data.targetExam || 'MDCAT',
        classLevel: data.classLevel || 'Class 10',
        board: data.board || 'Punjab',
        avatar: data.avatar || 'avatar-1',
        status: data.status || 'Active',
        permissions: initialPermissions,
        points: 0,
        streakDays: 0,
        testsTaken: 0,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Failed to create user in database:', error);
    throw new Error('Failed to create user account', { cause: error });
  }
}

// 7c. Update User Account Status (Active | Inactive | Suspended)
export async function updateUserStatusInDb(uid: string, status: 'Active' | 'Inactive' | 'Suspended') {
  try {
    const [updated] = await db
      .update(users)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return updated || null;
  } catch (error) {
    console.error('Failed to update user status in database:', error);
    throw new Error('Failed to update user status', { cause: error });
  }
}

// 7d. Update User Granular Permissions
export async function updateUserPermissionsInDb(uid: string, permissions: string[]) {
  try {
    const existing = await getUserByUid(uid);
    // Preserve any existing internal password token if not provided in updated permissions
    const internalPwd = (existing?.permissions || []).find((p: string) => p.startsWith('__auth_pwd:'));
    const finalPermissions = internalPwd && !permissions.some((p) => p.startsWith('__auth_pwd:'))
      ? [internalPwd, ...permissions]
      : permissions;

    const [updated] = await db
      .update(users)
      .set({
        permissions: finalPermissions,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return updated || null;
  } catch (error) {
    console.error('Failed to update user permissions in database:', error);
    throw new Error('Failed to update user permissions', { cause: error });
  }
}

// 7d1. Cryptographic Password Hashing & Verification (PBKDF2 SHA512)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `__auth_pwd:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHashToken: string): boolean {
  if (!storedHashToken || !storedHashToken.startsWith('__auth_pwd:')) return false;
  const parts = storedHashToken.split(':');
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const originalHash = parts[2];
  try {
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch (err) {
    return false;
  }
}

export async function setUserPasswordInDb(uid: string, password: string) {
  try {
    const user = await getUserByUid(uid);
    if (!user) return null;
    const pwdToken = hashPassword(password);
    const existingPerms = (user.permissions || []).filter((p: string) => !p.startsWith('__auth_pwd:'));
    const updatedPerms = [pwdToken, ...existingPerms];
    const [updated] = await db
      .update(users)
      .set({
        permissions: updatedPerms,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();
    return updated || null;
  } catch (error) {
    console.error('Failed to set user password in db:', error);
    return null;
  }
}

// 7e. Staff Assignments Management
export async function getStaffAssignmentsFromDb(userUid: string) {
  try {
    return await db
      .select()
      .from(staffAssignments)
      .where(eq(staffAssignments.userUid, userUid))
      .orderBy(desc(staffAssignments.createdAt));
  } catch (error) {
    console.error('Failed to get staff assignments from database:', error);
    return [];
  }
}

export async function addStaffAssignmentToDb(data: {
  userUid: string;
  role: string;
  board: string;
  classLevel: string;
  subject: string;
  contentTypes?: string[];
}) {
  try {
    const [inserted] = await db
      .insert(staffAssignments)
      .values({
        userUid: data.userUid,
        role: data.role,
        board: data.board || 'All',
        classLevel: data.classLevel || 'All',
        subject: data.subject || 'All',
        contentTypes: data.contentTypes || [],
      })
      .returning();

    return inserted;
  } catch (error) {
    console.error('Failed to add staff assignment to database:', error);
    throw new Error('Failed to create staff assignment', { cause: error });
  }
}

export async function deleteStaffAssignmentFromDb(assignmentId: number, userUid?: string) {
  try {
    const whereCondition = userUid
      ? and(eq(staffAssignments.id, assignmentId), eq(staffAssignments.userUid, userUid))
      : eq(staffAssignments.id, assignmentId);

    const [deleted] = await db
      .delete(staffAssignments)
      .where(whereCondition)
      .returning();

    return deleted || null;
  } catch (error) {
    console.error('Failed to delete staff assignment from database:', error);
    throw new Error('Failed to delete staff assignment', { cause: error });
  }
}

export async function setStaffAssignmentsInDb(
  userUid: string,
  role: string,
  assignments: Array<{
    board: string;
    classLevel: string;
    subject: string;
    contentTypes?: string[];
  }>
) {
  try {
    // Delete existing assignments for this staff member
    await db.delete(staffAssignments).where(eq(staffAssignments.userUid, userUid));

    if (!assignments || assignments.length === 0) {
      return [];
    }

    const inserted = await db
      .insert(staffAssignments)
      .values(
        assignments.map((a) => ({
          userUid,
          role,
          board: a.board || 'All',
          classLevel: a.classLevel || 'All',
          subject: a.subject || 'All',
          contentTypes: a.contentTypes || [],
        }))
      )
      .returning();

    return inserted;
  } catch (error) {
    console.error('Failed to set staff assignments in database:', error);
    throw new Error('Failed to save staff assignments', { cause: error });
  }
}

export async function getUserWithDetailsFromDb(uid: string) {
  try {
    const user = await getUserByUid(uid);
    if (!user) return null;

    const assignments = await getStaffAssignmentsFromDb(uid);
    return {
      ...user,
      status: user.status || 'Active',
      permissions: user.permissions || [],
      assignments,
    };
  } catch (error) {
    console.error('Failed to get user with details from database:', error);
    return null;
  }
}

// Content Management CRUD
export async function getBoardsFromDb() {
  return await db.select().from(boards).orderBy(desc(boards.createdAt));
}

export async function addBoardToDb(name: string) {
  const normalizedName = name.toLowerCase().trim();
  const existing = await db
    .select()
    .from(boards)
    .where(sql`LOWER(TRIM(${boards.name})) = ${normalizedName}`)
    .limit(1);
  if (existing.length > 0) throw new Error('DUPLICATE_BOARD');
  return await db.insert(boards).values({ name }).returning();
}

export async function updateBoardInDb(id: number, data: { name?: string; status?: string }) {
  if (data.name) {
    const normalizedName = data.name.toLowerCase().trim();
    const existing = await db
      .select()
      .from(boards)
      .where(and(sql`LOWER(TRIM(${boards.name})) = ${normalizedName}`, sql`${boards.id} != ${id}`))
      .limit(1);
    if (existing.length > 0) throw new Error('DUPLICATE_BOARD');
  }
  return await db.update(boards).set({ ...data, updatedAt: new Date() }).where(eq(boards.id, id)).returning();
}

export async function deleteBoardFromDb(id: number) {
  return await db.delete(boards).where(eq(boards.id, id)).returning();
}

export async function getClassesFromDb() {
  return await db.select().from(classes).orderBy(desc(classes.createdAt));
}

export async function addClassToDb(boardId: number, name: string) {
  const normalizedName = name.toLowerCase().trim();
  const existing = await db
    .select()
    .from(classes)
    .where(and(eq(classes.boardId, boardId), sql`LOWER(TRIM(${classes.name})) = ${normalizedName}`))
    .limit(1);
  if (existing.length > 0) throw new Error('DUPLICATE_CLASS');
  return await db.insert(classes).values({ boardId, name }).returning();
}

export async function updateClassInDb(id: number, data: { name?: string; status?: string }) {
  if (data.name) {
    const classRecord = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    if (classRecord.length > 0) {
      const boardId = classRecord[0].boardId;
      const normalizedName = data.name.toLowerCase().trim();
      const existing = await db
        .select()
        .from(classes)
        .where(and(eq(classes.boardId, boardId), sql`LOWER(TRIM(${classes.name})) = ${normalizedName}`, sql`${classes.id} != ${id}`))
        .limit(1);
      if (existing.length > 0) throw new Error('DUPLICATE_CLASS');
    }
  }
  return await db.update(classes).set({ ...data, updatedAt: new Date() }).where(eq(classes.id, id)).returning();
}

export async function deleteClassFromDb(id: number) {
  return await db.delete(classes).where(eq(classes.id, id)).returning();
}

export async function getSubjectsFromDb() {
  return await db.select().from(subjects).orderBy(desc(subjects.createdAt));
}

export async function addSubjectToDb(classId: number, name: string) {
  const normalizedName = name.toLowerCase().trim();
  const existing = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.classId, classId), sql`LOWER(TRIM(${subjects.name})) = ${normalizedName}`))
    .limit(1);
  if (existing.length > 0) throw new Error('DUPLICATE_SUBJECT');
  return await db.insert(subjects).values({ classId, name }).returning();
}

export async function updateSubjectInDb(id: number, data: { name?: string; status?: string }) {
  if (data.name) {
    const subjectRecord = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
    if (subjectRecord.length > 0) {
      const classId = subjectRecord[0].classId;
      const normalizedName = data.name.toLowerCase().trim();
      const existing = await db
        .select()
        .from(subjects)
        .where(and(eq(subjects.classId, classId), sql`LOWER(TRIM(${subjects.name})) = ${normalizedName}`, sql`${subjects.id} != ${id}`))
        .limit(1);
      if (existing.length > 0) throw new Error('DUPLICATE_SUBJECT');
    }
  }
  return await db.update(subjects).set({ ...data, updatedAt: new Date() }).where(eq(subjects.id, id)).returning();
}

export async function deleteSubjectFromDb(id: number) {
  return await db.delete(subjects).where(eq(subjects.id, id)).returning();
}

export async function getChaptersFromDb() {
  return await db.select().from(chapters).orderBy(desc(chapters.createdAt));
}

export async function addChapterToDb(subjectId: number, name: string) {
  const normalizedName = name.toLowerCase().trim();
  const existing = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.subjectId, subjectId), sql`LOWER(TRIM(${chapters.name})) = ${normalizedName}`))
    .limit(1);
  if (existing.length > 0) throw new Error('DUPLICATE_CHAPTER');
  return await db.insert(chapters).values({ subjectId, name }).returning();
}

export async function updateChapterInDb(id: number, data: { name?: string; status?: string; draftStatus?: string }) {
  if (data.name) {
    const chapterRecord = await db.select().from(chapters).where(eq(chapters.id, id)).limit(1);
    if (chapterRecord.length > 0) {
      const subjectId = chapterRecord[0].subjectId;
      const normalizedName = data.name.toLowerCase().trim();
      const existing = await db
        .select()
        .from(chapters)
        .where(and(eq(chapters.subjectId, subjectId), sql`LOWER(TRIM(${chapters.name})) = ${normalizedName}`, sql`${chapters.id} != ${id}`))
        .limit(1);
      if (existing.length > 0) throw new Error('DUPLICATE_CHAPTER');
    }
  }
  return await db.update(chapters).set({ ...data, updatedAt: new Date() }).where(eq(chapters.id, id)).returning();
}

export async function deleteChapterFromDb(id: number) {
  return await db.delete(chapters).where(eq(chapters.id, id)).returning();
}

export async function getSyllabusFromDb() {
  return await db.select().from(syllabus).orderBy(desc(syllabus.createdAt));
}

export async function addSyllabusToDb(subjectId: number, content: string) {
  return await db.insert(syllabus).values({ subjectId, content }).returning();
}

export async function updateSyllabusInDb(id: number, content: string) {
  return await db.update(syllabus).set({ content, updatedAt: new Date() }).where(eq(syllabus.id, id)).returning();
}

export async function deleteSyllabusFromDb(id: number) {
  return await db.delete(syllabus).where(eq(syllabus.id, id)).returning();
}
export async function getAdminComprehensiveStats() {
  try {
    const [
      totalUsersRes,
      adminUsersRes,
      studentUsersRes,
      totalResultsRes,
      totalCertsRes,
      openReportsRes,
      resolvedReportsRes,
      recentResults,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(roles) AS r WHERE LOWER(r) IN ('admin', 'superadmin', 'administrator'))`
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          sql`NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(roles) AS r WHERE LOWER(r) IN ('admin', 'superadmin', 'administrator'))`
        ),
      db.select({ count: sql<number>`count(*)` }).from(testResults),
      db.select({ count: sql<number>`count(*)` }).from(certificates),
      db
        .select({ count: sql<number>`count(*)` })
        .from(contentReports)
        .where(eq(contentReports.status, 'OPEN')),
      db
        .select({ count: sql<number>`count(*)` })
        .from(contentReports)
        .where(eq(contentReports.status, 'RESOLVED')),
      db
        .select({ percentage: testResults.percentage })
        .from(testResults)
        .limit(200),
    ]);

    const totalSubmissions = Number(totalResultsRes[0]?.count || 0);
    const passCount = recentResults.filter((r) => (r.percentage || 0) >= 50).length;
    const passRate =
      recentResults.length > 0
        ? Math.round((passCount / recentResults.length) * 100)
        : null;

    return {
      totalUsers: Number(totalUsersRes[0]?.count || 0),
      adminCount: Number(adminUsersRes[0]?.count || 0),
      studentCount: Number(studentUsersRes[0]?.count || 0),
      totalSubmissions,
      totalCertificates: Number(totalCertsRes[0]?.count || 0),
      openReportsCount: Number(openReportsRes[0]?.count || 0),
      resolvedReportsCount: Number(resolvedReportsRes[0]?.count || 0),
      passRate,
    };
  } catch (error) {
    console.error('Failed to compute admin comprehensive stats:', error);
    throw new Error('Failed to compute admin stats', { cause: error });
  }
}

export async function getAllCertificatesFromDb() {
  try {
    return await db.select().from(certificates).orderBy(desc(certificates.issueDate));
  } catch (error) {
    console.error('Error fetching all certificates:', error);
    return [];
  }
}

export async function revokeCertificateInDb(certificateId: string, _revokedBy?: string, _reason?: string) {
  try {
    await db.update(certificates)
      .set({ status: 'REVOKED', revokedAt: new Date() })
      .where(eq(certificates.id, certificateId));
    return true;
  } catch (error) {
    console.error('Error revoking certificate:', error);
    return false;
  }
}

export async function restoreCertificateInDb(certificateId: string) {
  try {
    await db.update(certificates)
      .set({ status: 'VALID', revokedAt: null })
      .where(eq(certificates.id, certificateId));
    return true;
  } catch (error) {
    console.error('Error restoring certificate:', error);
    return false;
  }
}

