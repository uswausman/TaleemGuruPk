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
import { requireAuth, requireAdmin, requireHighAdmin, requireContentManager, getSupabaseServerClient, type AuthRequest } from './middleware/auth.ts';
import { isAcademicAssignmentAllowed } from './lib/permissions.ts';
import {
  getOrCreateUser,
  getUserByUid,
  updateUserProfile,
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
} from './db/users.ts';

const app = express();

// Authoritatively synchronize configured administrative identities with database
syncBootstrapAdmins().catch((err) => {
  console.warn('[Server] Initial admin bootstrap sync notice:', err);
});

// Security Headers for API responses
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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

// 1. Health check
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

documentRouter.post('/brand', async (req: Request, res: Response) => {
  try {
    let inputBuffer: Buffer;
    let filename = (req.query.filename as string) || 'document.pdf';
    let title = (req.query.title as string) || 'Study Document';

    if (Buffer.isBuffer(req.body)) {
      inputBuffer = req.body;
    } else if (req.body?.fileBase64) {
      inputBuffer = Buffer.from(req.body.fileBase64, 'base64');
      if (req.body.filename) filename = req.body.filename;
      if (req.body.title) title = req.body.title;
    } else if (req.body?.url) {
      const response = await fetch(req.body.url);
      if (!response.ok) {
        return res.status(400).json({ error: 'Could not fetch remote document from provided URL' });
      }
      inputBuffer = Buffer.from(await response.arrayBuffer());
      if (req.body.filename) filename = req.body.filename;
      if (req.body.title) title = req.body.title;
    } else {
      return res.status(400).json({ error: 'Missing fileBase64, url, or binary body' });
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
    console.error('[DocumentRouter] Error branding PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to brand document' });
  }
});

documentRouter.get('/download', async (req: Request, res: Response) => {
  try {
    const rawUrl = req.query.url as string;
    let filename = (req.query.filename as string) || 'TaleemGuru_Document.pdf';
    const title = (req.query.title as string) || 'TaleemGuru Study Resource';

    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing required document url parameter' });
    }

    // Security check: only allow safe http/https URLs or safe relative asset paths
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://') && !rawUrl.startsWith('/')) {
      return res.status(400).json({ error: 'Invalid URL scheme' });
    }

    let inputBuffer: Buffer;
    let contentType = 'application/pdf';

    if (rawUrl.startsWith('/')) {
      const localFilePath = path.join(process.cwd(), 'public', rawUrl.replace(/^\/+/, ''));
      if (!fs.existsSync(localFilePath)) {
        return res.status(404).json({ error: 'Document file not found' });
      }
      inputBuffer = fs.readFileSync(localFilePath);
    } else {
      const fetchResponse = await fetch(rawUrl);
      if (!fetchResponse.ok) {
        return res.status(fetchResponse.status).json({ error: 'Failed to retrieve remote document' });
      }
      inputBuffer = Buffer.from(await fetchResponse.arrayBuffer());
      const remoteType = fetchResponse.headers.get('content-type');
      if (remoteType) contentType = remoteType;
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');

    // If PDF, apply TaleemGuru footer branding
    if (contentType.includes('pdf') || rawUrl.toLowerCase().endsWith('.pdf') || sanitizedFilename.toLowerCase().endsWith('.pdf')) {
      const brandedResult = await brandPdfBuffer(inputBuffer, { title });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename.endsWith('.pdf') ? sanitizedFilename : `${sanitizedFilename}_TaleemGuru.pdf`}"`);
      res.setHeader('X-TaleemGuru-Branded', 'true');
      res.setHeader('X-TaleemGuru-Was-Already-Branded', brandedResult.wasAlreadyBranded.toString());
      return res.send(brandedResult.buffer);
    }

    // If text/markdown, apply TaleemGuru academic header & footer
    if (contentType.includes('text') || contentType.includes('markdown')) {
      const brandedText = brandTextContent(inputBuffer.toString('utf-8'), title);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
      return res.send(brandedText);
    }

    // For other document formats (DOCX/XLSX/etc.), preserve format without corrupting
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    return res.send(inputBuffer);
  } catch (error: any) {
    console.error('[DocumentRouter] Error processing download:', error);
    res.status(500).json({ error: error.message || 'Error processing document download' });
  }
});

apiRouter.use('/documents', documentRouter);

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

    // Optional environment-level administrator password for offline server environments
    if (!authenticatedUser && process.env.ADMIN_PASSWORD) {
      if (cleanPassword === process.env.ADMIN_PASSWORD && isTrustedBootstrapAdminEmail(cleanEmail)) {
        authenticatedUser = {
          id: `admin-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`,
          email: cleanEmail,
          user_metadata: { name: 'Administrator' },
        };
        authFailed = false;
      }
    }

    // If authentication failed (wrong password, unknown user, unverified credentials), reject with 401
    if (authFailed || !authenticatedUser) {
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

    res.json({ profile });
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

    res.json({ success: true, profile: updated });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
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
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const topUsers = await getTopLeaderboard(limit);
    res.json({ leaderboard: topUsers });
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
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

    const allowedRoles = ['Student', 'Teacher', 'Editor', 'ContentManager', 'Moderator', 'Admin', 'SuperAdmin'];
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
      return res.status(409).json({ error: `A user with email ${cleanEmail} already exists in the system.` });
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
          }
        }
      } catch (authCreateErr) {
        console.warn('Notice during Supabase user registration execution:', authCreateErr);
      }
    }

    // Authoritative profile insertion into application database with securely hashed credentials
    const createdUser = await createUserInDb({
      uid: authUid,
      email: cleanEmail,
      name: cleanName,
      roles: cleanRoles,
      password: password,
      status: initialStatus,
    });

    // Record audit log
    await saveAuditLogToDb({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'admin@taleemguru.pk',
      adminName: req.user!.name,
      action: 'STAFF_USER_CREATED',
      targetType: 'user',
      targetId: authUid,
      details: `Created new ${cleanRoles.join(', ')} account (${initialStatus}) for ${cleanEmail} (${cleanName})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      user: createdUser,
    });
  } catch (error: any) {
    console.error('Error creating staff user:', error);
    return res.status(500).json({ error: 'Failed to create staff account' });
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

    const allowedRoles = ['Student', 'Admin', 'Teacher', 'Editor', 'ContentManager', 'Moderator', 'SuperAdmin'];
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
    const targetIsSuperAdmin = previousRoles.some(r => r.toLowerCase() === 'superadmin' || r.toLowerCase() === 'super_admin') || isTrustedBootstrapAdminEmail(previousUser.email);
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

    res.json({ success: true, user: updatedUser, previousRoles });
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
    const targetIsSuperAdmin = targetUser.roles.some(r => r.toLowerCase() === 'superadmin' || r.toLowerCase() === 'super_admin') || isTrustedBootstrapAdminEmail(targetUser.email);

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

    res.json({ success: true, user: updated });
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

    res.json({ success: true, user: updated });
  } catch (error: any) {
    console.error('Error editing user profile by admin:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
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

    res.json({ success: true, user: updated });
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
    const stats = await getAdminComprehensiveStats();
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

// 26. Admin Management: System Health
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
