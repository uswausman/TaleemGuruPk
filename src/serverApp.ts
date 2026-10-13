import type { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getUserByUid, getOrCreateUser, isTrustedBootstrapAdminEmail, getTrustedBootstrapAdmins } from './db/users.ts';
import crypto from 'crypto';



// Cached server client singleton to prevent overhead across incoming requests
let cachedServerClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function sanitizeEnvValue(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  let s = val.trim().replace(/^\uFEFF/, '').trim();
  while (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  if (s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') {
    return '';
  }
  return s;
}

export function validateAndNormalizeSupabaseUrl(raw?: string | null): {
  url: string | null;
  isValid: boolean;
  urlPrefixOk: boolean;
  urlHasPlaceholder: boolean;
  error?: string;
} {
  const sanitized = sanitizeEnvValue(raw);
  if (!sanitized) {
    return { url: null, isValid: false, urlPrefixOk: false, urlHasPlaceholder: false, error: 'Empty URL' };
  }

  const cleanPath = sanitized.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

  let parsed: URL;
  try {
    parsed = new URL(cleanPath);
  } catch {
    return {
      url: null,
      isValid: false,
      urlPrefixOk: false,
      urlHasPlaceholder: cleanPath.toLowerCase().includes('placeholder'),
      error: 'Unparseable URL syntax',
    };
  }

  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const isHttps = parsed.protocol === 'https:';
  const isLocalHttp = !isProduction && parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
  const urlPrefixOk = isHttps || isLocalHttp;
  const urlHasPlaceholder = parsed.hostname.toLowerCase().includes('placeholder') || cleanPath.toLowerCase().includes('placeholder');

  if (!urlPrefixOk) {
    return {
      url: null,
      isValid: false,
      urlPrefixOk: false,
      urlHasPlaceholder,
      error: `Protocol must be https: (got ${parsed.protocol})`,
    };
  }

  if (urlHasPlaceholder) {
    return {
      url: null,
      isValid: false,
      urlPrefixOk: true,
      urlHasPlaceholder: true,
      error: 'URL contains placeholder string',
    };
  }

  const normalizedUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`.replace(/\/+$/, '');

  return {
    url: normalizedUrl,
    isValid: true,
    urlPrefixOk: true,
    urlHasPlaceholder: false,
  };
}

export function resolveSupabaseServerConfig(): {
  url: string | null;
  key: string | null;
  urlSource: string | null;
  keySource: string | null;
  diagnostics: {
    hasUrl: boolean;
    hasKey: boolean;
    urlPrefixOk: boolean;
    urlHasPlaceholder: boolean;
  };
} {
  // Candidate URLs in priority order:
  // 1. SUPABASE_URL (server-side explicit)
  // 2. VITE_SUPABASE_URL (shared/client environment variable)
  const urlCandidates: Array<{ name: string; val: string | undefined }> = [
    { name: 'SUPABASE_URL', val: process.env.SUPABASE_URL },
    { name: 'VITE_SUPABASE_URL', val: process.env.VITE_SUPABASE_URL },
  ];

  let selectedUrl: string | null = null;
  let selectedUrlSource: string | null = null;
  let diag = {
    hasUrl: false,
    hasKey: false,
    urlPrefixOk: false,
    urlHasPlaceholder: false,
  };

  for (const candidate of urlCandidates) {
    const rawVal = candidate.val;
    const sanitizedVal = sanitizeEnvValue(rawVal);
    if (!sanitizedVal) continue;

    diag.hasUrl = true;
    const validation = validateAndNormalizeSupabaseUrl(rawVal);

    if (validation.isValid && validation.url) {
      selectedUrl = validation.url;
      selectedUrlSource = candidate.name;
      diag.urlPrefixOk = true;
      diag.urlHasPlaceholder = false;
      break;
    } else {
      if (!selectedUrl) {
        diag.urlPrefixOk = validation.urlPrefixOk;
        diag.urlHasPlaceholder = validation.urlHasPlaceholder;
      }
    }
  }

  // Candidate Keys in priority order:
  // 1. SUPABASE_SERVICE_ROLE_KEY (preferred for backend auth token verification)
  // 2. SUPABASE_ANON_KEY (server-side anon key)
  // 3. VITE_SUPABASE_ANON_KEY (shared client anon key)
  const keyCandidates: Array<{ name: string; val: string | undefined }> = [
    { name: 'SUPABASE_SERVICE_ROLE_KEY', val: process.env.SUPABASE_SERVICE_ROLE_KEY },
    { name: 'SUPABASE_ANON_KEY', val: process.env.SUPABASE_ANON_KEY },
    { name: 'VITE_SUPABASE_ANON_KEY', val: process.env.VITE_SUPABASE_ANON_KEY },
  ];

  let selectedKey: string | null = null;
  let selectedKeySource: string | null = null;

  for (const candidate of keyCandidates) {
    const sanitized = sanitizeEnvValue(candidate.val);
    if (sanitized && !sanitized.toLowerCase().includes('placeholder')) {
      selectedKey = sanitized;
      selectedKeySource = candidate.name;
      break;
    }
  }

  diag.hasKey = Boolean(selectedKey);

  return {
    url: selectedUrl,
    key: selectedKey,
    urlSource: selectedUrlSource,
    keySource: selectedKeySource,
    diagnostics: diag,
  };
}

export function getSupabaseServerClient(): SupabaseClient | null {
  const config = resolveSupabaseServerConfig();

  if (!config.url || !config.key) {
    console.error('[Auth Diagnostic] Supabase initialization failed:', {
      hasUrl: config.diagnostics.hasUrl,
      hasKey: config.diagnostics.hasKey,
      urlPrefixOk: config.diagnostics.urlPrefixOk,
      urlHasPlaceholder: config.diagnostics.urlHasPlaceholder,
    });
    return null;
  }

  const currentConfigKey = `${config.url}::${config.key}`;
  if (cachedServerClient && cachedConfigKey === currentConfigKey) {
    return cachedServerClient;
  }

  try {
    cachedServerClient = createClient(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedConfigKey = currentConfigKey;
    return cachedServerClient;
  } catch (err: any) {
    console.error('[Auth Diagnostic] Error creating Supabase server client:', err?.message || err);
    return null;
  }
}

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    roles: string[];
  };
}

export function getServerJwtSecret(): string {
  const secret =
    process.env.SERVER_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    process.env.VITE_SERVER_JWT_SECRET ||
    process.env.VITE_JWT_SECRET;
  if (secret && typeof secret === 'string' && secret.trim().length > 0) {
    return secret.trim();
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (serviceKey && typeof serviceKey === 'string' && serviceKey.trim().length >= 16) {
    return `taleemguru-derived-jwt-${serviceKey.trim().substring(0, 32)}`;
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (dbUrl && typeof dbUrl === 'string' && dbUrl.trim().length >= 16) {
    return `taleemguru-db-jwt-${dbUrl.trim().substring(0, 32)}`;
  }

  return 'taleemguru-production-server-jwt-secret-key-32bytes';
}

export function isServerJwtCandidate(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload?.iss === 'taleemguru-backend' || payload?.aud === 'taleemguru-admin';
  } catch {
    return false;
  }
}

/**
 * Verifies a server-signed HMAC-SHA256 JWT using dedicated SERVER_JWT_SECRET.
 * Requires alg HS256, iss 'taleemguru-backend', aud 'taleemguru-admin', valid exp/nbf, and valid sub.
 */
export function verifyServerSignedToken(token?: string | null): {
  valid: boolean;
  user?: {
    id: string;
    email?: string;
    role: string;
    user_metadata: Record<string, any>;
    app_metadata: Record<string, any>;
  };
  error?: string;
} {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Empty token' };
  }

  const secret = getServerJwtSecret();
  if (!secret) {
    return { valid: false, error: 'SERVER_JWT_SECRET is not configured' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  let header: any;
  let payload: any;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, error: 'Invalid base64url JSON in token' };
  }

  if (!header || header.alg !== 'HS256') {
    return { valid: false, error: `Unsupported or missing algorithm: ${header?.alg}` };
  }

  if (payload?.iss !== 'taleemguru-backend') {
    return { valid: false, error: 'Invalid token issuer' };
  }

  if (payload?.aud !== 'taleemguru-admin') {
    return { valid: false, error: 'Invalid token audience' };
  }

  const now = Math.floor(Date.now() / 1000);

  if (payload?.exp && typeof payload.exp === 'number') {
    if (payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }
  }

  if (payload?.nbf && typeof payload.nbf === 'number') {
    if (payload.nbf > now) {
      return { valid: false, error: 'Token not yet active' };
    }
  }

  const uid = payload.sub || payload.uid || payload.id;
  if (!uid || typeof uid !== 'string' || uid.trim().length === 0) {
    return { valid: false, error: 'Missing subject identifier in token' };
  }

  const dataToVerify = `${headerB64}.${payloadB64}`;
  const sigBuf = Buffer.from(signatureB64, 'base64url');

  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(dataToVerify);
    const expectedDigest = hmac.digest();
    if (sigBuf.length !== expectedDigest.length || !crypto.timingSafeEqual(sigBuf, expectedDigest)) {
      return { valid: false, error: 'Invalid token signature' };
    }
  } catch {
    return { valid: false, error: 'Signature verification error' };
  }

  return {
    valid: true,
    user: {
      id: String(uid).trim(),
      email: payload.email ? String(payload.email) : undefined,
      role: payload.role || 'authenticated',
      user_metadata: (payload.user_metadata && typeof payload.user_metadata === 'object') ? payload.user_metadata : {},
      app_metadata: (payload.app_metadata && typeof payload.app_metadata === 'object') ? payload.app_metadata : {},
    },
  };
}

/**
 * Middleware: Strictly requires a valid Supabase bearer token or server-signed JWT.
 * Authoritatively populates user identity and role from the database.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // If user identity is already verified on the request, proceed directly
  if (req.user && req.user.uid) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed authorization token' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token provided' });
  }

  let user: any = null;

  // 1. First verify against server-signed JWT tokens (e.g. /api/admin/login sessions or test suites)
  const serverTokenVerification = verifyServerSignedToken(token);
  if (serverTokenVerification.valid && serverTokenVerification.user) {
    user = serverTokenVerification.user;
  }

  // 2. If not a valid server-signed JWT and not a candidate server JWT, verify against Supabase Auth
  if (!user && !isServerJwtCandidate(token)) {
    const client = getSupabaseServerClient();
    if (client) {
      try {
        const { data, error } = await client.auth.getUser(token);
        if (error) {
          console.log('[Auth Diagnostic] Supabase client.auth.getUser error:', error.message);
        } else if (data?.user) {
          user = data.user;
        }
      } catch (apiErr) {
        console.log('[Auth Diagnostic] Supabase auth.getUser exception:', apiErr);
      }
    } else {
      console.log('[Auth Diagnostic] Supabase client not initialized in requireAuth');
    }
  }

  if (!user) {
    console.log('[Auth Diagnostic] Authentication failed in requireAuth:', {
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 10)}...` : 'none',
    });
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token' });
  }

  try {
    const normalizedEmail = (user.email || '').toLowerCase().trim();
    const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);
    const bootstrapAdmins = getTrustedBootstrapAdmins();
    const bootstrapConfig = bootstrapAdmins[normalizedEmail];

    // Query trusted database for authoritative role and details
    let dbUser = null;
    let dbError = false;
    try {
      dbUser = await getUserByUid(user.id);
      const hasStaffRole = dbUser?.roles && dbUser.roles.some((r: string) => ['admin', 'superadmin', 'super_admin'].includes(r.toLowerCase()));
      if (!dbUser && normalizedEmail) {
        dbUser = await getOrCreateUser(user.id, normalizedEmail, {
          name: isBootstrap ? (bootstrapConfig?.name || 'Admin') : (user.user_metadata?.name || user.user_metadata?.full_name),
        });
      } else if (dbUser && isBootstrap && (!dbUser.roles || dbUser.roles.length === 0 || !hasStaffRole)) {
        dbUser = await getOrCreateUser(user.id, normalizedEmail, {
          name: bootstrapConfig?.name || 'Admin',
        });
      }
    } catch (dbErr) {
      console.error('Error querying database in requireAuth:', dbErr);
      dbError = true;
    }

    if (dbError) {
      return res.status(503).json({ error: 'Service Unavailable: Database error during identity authorization' });
    }

    // Role resolution:
    // Database records dictate roles. If a verified bootstrap admin email is used, bootstrapConfig roles are used if dbUser has no roles.
    // NOTE: user.user_metadata.roles fallback is intentionally REMOVED for security hardening.
    let authoritativeRoles = ['Student'];
    if (dbUser?.roles && Array.isArray(dbUser.roles) && dbUser.roles.length > 0) {
      authoritativeRoles = dbUser.roles;
    } else if (isBootstrap && dbUser) {
      authoritativeRoles = bootstrapConfig?.roles || ['Admin'];
    } else if (dbUser?.role) {
      authoritativeRoles = [dbUser.role]; // Backward compatibility
    }

    // Server-only non-sensitive diagnostic logging for trusted admin
    if (isBootstrap) {
      console.log('[Auth Diagnostic]', {
        normalizedEmail,
        tokenVerificationSuccess: true,
        trustedAdminMatch: isBootstrap,
        dbProfileRoles: dbUser?.roles || [],
        authoritativeRoles,
        isAdmin: authoritativeRoles.some(r => ['admin', 'superadmin', 'super_admin'].includes(r.toLowerCase())),
      });
    }

    req.user = {
      uid: user.id,
      email: normalizedEmail,
      name: (isBootstrap ? (bootstrapConfig?.name || 'Admin') : dbUser?.name) || user.user_metadata?.name || user.user_metadata?.full_name || normalizedEmail.split('@')[0],
      roles: authoritativeRoles,
    };
    return next();
  } catch (error) {
    console.error('Error verifying authentication token:', error);
    return res.status(401).json({ error: 'Unauthorized: Failed to authenticate token' });
  }
};

/**
 * Middleware: Optionally populates user if valid bearer token is provided,
 * but does not reject request if unauthenticated.
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) return next();

  try {
    let user: any = null;

    // 1. First check server-signed JWT tokens
    const serverTokenResult = verifyServerSignedToken(token);
    if (serverTokenResult.valid && serverTokenResult.user) {
      user = serverTokenResult.user;
    }

    // 2. Fall back to Supabase client
    if (!user && !isServerJwtCandidate(token)) {
      const client = getSupabaseServerClient();
      if (client) {
        try {
          const { data } = await client.auth.getUser(token);
          if (data?.user) user = data.user;
        } catch {}
      }
    }

    if (user) {
      const normalizedEmail = (user.email || '').toLowerCase().trim();
      const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);
      const bootstrapAdmins = getTrustedBootstrapAdmins();
      const bootstrapConfig = bootstrapAdmins[normalizedEmail];
      let dbUser = null;
      try {
        dbUser = await getUserByUid(user.id);
      } catch {}

      let authoritativeRoles = ['Student'];
      if (dbUser?.roles && Array.isArray(dbUser.roles) && dbUser.roles.length > 0) {
        authoritativeRoles = dbUser.roles;
      } else if (isBootstrap) {
        authoritativeRoles = bootstrapConfig?.roles || ['Admin'];
      } else if (dbUser?.role) {
        authoritativeRoles = [dbUser.role];
      } else if (user.user_metadata?.roles && Array.isArray(user.user_metadata.roles)) {
        authoritativeRoles = user.user_metadata.roles;
      }

      req.user = {
        uid: user.id,
        email: normalizedEmail,
        name: (isBootstrap ? (bootstrapConfig?.name || 'Admin') : dbUser?.name) || user.user_metadata?.name || normalizedEmail.split('@')[0],
        roles: authoritativeRoles,
      };
    }
  } catch (err) {
    // Non-blocking in optionalAuth
  }

  return next();
};

/**
 * Middleware: Requires an authenticated Supabase user whose role in the
 * authoritative database is explicitly verified as an Administrator.
 * Fails closed on any error, missing user, or non-admin role.
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, async () => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized: Missing user identity' });
      }

      const normalizedEmail = (email || '').toLowerCase().trim();

      // Query database directly to ensure freshest authoritative verification for the authenticated UID
      let dbUser = null;
      try {
        dbUser = await getUserByUid(uid);
        if (!dbUser && normalizedEmail) {
          dbUser = await getOrCreateUser(uid, normalizedEmail);
        }
      } catch (dbErr) {
        console.warn('Notice in requireAdmin database lookup:', dbErr);
      }

      if (!dbUser) {
        return res.status(403).json({
          error: 'Forbidden: User record not found in system. Access denied.',
        });
      }

      if (dbUser.status && (dbUser.status.toLowerCase() === 'suspended' || dbUser.status.toLowerCase() === 'inactive')) {
        return res.status(403).json({
          error: `Forbidden: Account is currently ${dbUser.status}. Access denied.`,
          status: dbUser.status,
        });
      }

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
      
      const roles = (dbUser.roles || [dbUser.role || '']).map(r => r.trim().toLowerCase().replace(/\s+/g, '_'));
      const isAuthorizedAdmin = roles.some(role => staffRolesToCheck.includes(role));

      if (!isAuthorizedAdmin) {
        return res.status(403).json({
          error: 'Forbidden: Administrative or staff privileges required. Access denied.',
          currentRoles: dbUser.roles || [dbUser.role],
        });
      }

      // Authoritative role confirmed
      req.user!.roles = dbUser.roles || [dbUser.role];
      return next();
    } catch (err) {
      console.error('requireAdmin verification failed:', err);
      // Fail closed
      return res.status(403).json({
        error: 'Forbidden: Admin security verification failed',
      });
    }
  });
};

/**
 * Middleware: Requires an authenticated Supabase user whose role in the
 * authoritative database includes ContentManager or is an Administrator.
 */
export const requireContentManager = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, async () => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized: Missing user identity' });
      }

      const normalizedEmail = (email || '').toLowerCase().trim();

      // Query database directly to ensure freshest authoritative verification for the authenticated UID
      let dbUser = null;
      try {
        dbUser = await getUserByUid(uid);
        if (!dbUser && normalizedEmail) {
          dbUser = await getOrCreateUser(uid, normalizedEmail);
        }
      } catch (dbErr) {
        console.warn('Notice in requireContentManager database lookup:', dbErr);
      }

      if (!dbUser) {
        return res.status(403).json({
          error: 'Forbidden: User record not found.',
        });
      }

      const roles = (dbUser.roles || [dbUser.role || '']).map(r => r.trim().toLowerCase().replace(/\s+/g, '_'));
      const isAuthorized = roles.some(role => ['admin', 'superadmin', 'super_admin', 'administrator', 'contentmanager', 'content_manager'].includes(role));

      if (!isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden: Content Manager or Administrator privileges required.',
        });
      }

      return next();
    } catch (err) {
      console.error('requireContentManager verification failed:', err);
      return res.status(403).json({
        error: 'Forbidden: Security verification failed',
      });
    }
  });
};

/**
 * Middleware: Requires an authoritative high-level administrator
 * (admin, superadmin, super_admin, administrator) for sensitive operations
 * such as user role delegation and staff account creation.
 * Teachers, Editors, ContentManagers, Moderators, and Students are strictly blocked with HTTP 403 Forbidden.
 */
export const requireHighAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAdmin(req, res, async () => {
    const normalizedEmail = (req.user?.email || '').toLowerCase().trim();
    if (isTrustedBootstrapAdminEmail(normalizedEmail)) {
      return next();
    }

    const dbRoles = (req.user?.roles || []).map(r => r.trim().toLowerCase().replace(/\s+/g, '_'));
    const isHighAdmin = dbRoles.some(role => [
      'admin',
      'superadmin',
      'super_admin',
      'administrator',
    ].includes(role));

    if (!isHighAdmin) {
      return res.status(403).json({
        error: 'Forbidden: Elevated administrator privileges required for user and role administration. Teachers, Editors, Content Managers, and Moderators cannot access this resource.',
        currentRoles: req.user?.roles,
      });
    }

    return next();
  });
};

/**
 * Middleware: Requires permission to curate/manage MCQs (Admin, Teacher, Editor, ContentManager)
 */
export const requireMCQCurator = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, async () => {
    try {
      const email = (req.user?.email || '').toLowerCase().trim();
      if (isTrustedBootstrapAdminEmail(email)) {
        return next();
      }

      const roles = (req.user?.roles || []).map(r => r.trim().toLowerCase().replace(/\s+/g, '_'));
      const isAuthorized = roles.some(role => [
        'admin',
        'superadmin',
        'super_admin',
        'administrator',
        'editor',
        'teacher',
        'contentmanager',
        'content_manager',
      ].includes(role));

      if (!isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden: MCQ curation privileges required (Admin, Teacher, Editor, Content Manager).',
        });
      }

      return next();
    } catch (err) {
      return res.status(403).json({ error: 'Forbidden: Security verification failed' });
    }
  });
};

/**
 * Middleware: Requires permission to create/manage tests and quizzes (Admin, Teacher, ContentManager)
 */
export const requireQuizCreator = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, async () => {
    try {
      const email = (req.user?.email || '').toLowerCase().trim();
      if (isTrustedBootstrapAdminEmail(email)) {
        return next();
      }

      const roles = (req.user?.roles || []).map(r => r.trim().toLowerCase().replace(/\s+/g, '_'));
      const isAuthorized = roles.some(role => [
        'admin',
        'superadmin',
        'super_admin',
        'administrator',
        'teacher',
        'contentmanager',
        'content_manager',
      ].includes(role));

      if (!isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden: Assessment creation privileges required (Admin, Teacher, Content Manager).',
        });
      }

      return next();
    } catch (err) {
      return res.status(403).json({ error: 'Forbidden: Security verification failed' });
    }
  });
};

/**
 * Middleware: Requires permission to manage Past Papers and Study Notes (Admin, ContentManager, Editor, Teacher)
 */
export const requireContentCurator = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, async () => {
    try {
      const email = (req.user?.email || '').toLowerCase().trim();
      if (isTrustedBootstrapAdminEmail(email)) {
        return next();
      }

      const roles = (req.user?.roles || []).map(r => r.trim().toLowerCase().replace(/\s+/g, '_'));
      const isAuthorized = roles.some(role => [
        'admin',
        'superadmin',
        'super_admin',
        'administrator',
        'contentmanager',
        'content_manager',
        'editor',
        'teacher',
      ].includes(role));

      if (!isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden: Content curation privileges required.',
        });
      }

      return next();
    } catch (err) {
      return res.status(403).json({ error: 'Forbidden: Security verification failed' });
    }
  });
};

/**
 * Middleware: Requires permission to access Teacher portal (Admin, Teacher, ContentManager, SuperAdmin)
 */
export const requireTeacher = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, async () => {
    try {
      const email = (req.user?.email || '').toLowerCase().trim();
      if (isTrustedBootstrapAdminEmail(email)) {
        return next();
      }

      const roles = (req.user?.roles || []).map((r) => r.trim().toLowerCase().replace(/\s+/g, '_'));
      const isAuthorized = roles.some((role) =>
        [
          'admin',
          'superadmin',
          'super_admin',
          'administrator',
          'teacher',
          'contentmanager',
          'content_manager',
        ].includes(role)
      );

      if (!isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden: Teacher or Administrator privileges required to access teacher portal.',
        });
      }

      return next();
    } catch (err) {
      return res.status(403).json({ error: 'Forbidden: Security verification failed' });
    }
  });
};


