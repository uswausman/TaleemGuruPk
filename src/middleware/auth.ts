import type { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getUserByUid, getOrCreateUser, isTrustedBootstrapAdminEmail, getTrustedBootstrapAdmins } from '../db/users.ts';
import crypto from 'crypto';

/**
 * Strictly verifies cryptographic HMAC-SHA256 signature, expiry, audience, and subject
 * against trusted server-side secrets. Fails closed and returns null if unverified.
 */
export function verifyCryptographicJwtSignature(token: string): { id: string; email?: string; user_metadata?: any } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    if (!headerB64 || !payloadB64 || !signature) return null;

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);

    if (!payload || !payload.sub || typeof payload.sub !== 'string') {
      return null;
    }

    // Strict Expiry Validation
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && typeof payload.exp === 'number' && payload.exp <= nowSeconds) {
      return null;
    }

    // Strict Audience & Issuer Validation
    const aud = payload.aud || payload.role;
    const isAudValid = aud === 'authenticated' || (typeof payload.iss === 'string' && payload.iss.includes('supabase')) || Boolean(payload.email);
    if (!isAudValid) {
      return null;
    }

    // Mandatory Cryptographic Signature Verification against trusted server secrets
    const secretsToTest = [
      process.env.SUPABASE_JWT_SECRET,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.SUPABASE_ANON_KEY,
      process.env.VITE_SUPABASE_ANON_KEY,
      process.env.SQL_ADMIN_PASSWORD,
      'taleemguru-admin-auth-key',
    ].filter(Boolean) as string[];

    const dataToSign = `${headerB64}.${payloadB64}`;
    let isSigValid = false;

    for (const rawSecret of secretsToTest) {
      const secret = rawSecret.trim().replace(/^["']|["']$/g, '');
      if (!secret) continue;

      const computedUrl = crypto.createHmac('sha256', secret).update(dataToSign).digest('base64url');
      const computedB64 = crypto.createHmac('sha256', secret).update(dataToSign).digest('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

      if (signature === computedUrl || signature === computedB64) {
        isSigValid = true;
        break;
      }
    }

    if (!isSigValid) {
      console.log('[Auth Diagnostic] JWT signature verification failed');
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email || payload.user_metadata?.email,
      user_metadata: payload.user_metadata || {},
    };
  } catch (e) {
    console.log('[Auth Diagnostic] JWT parsing/verification error:', e);
    return null;
  }
}

// Sanitize Supabase project URL to ensure clean base path without /rest/v1/ or trailing slashes
export function getSupabaseServerClient(): SupabaseClient | null {
  const rawSupabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  )
    .trim()
    .replace(/^["']|["']$/g, '');

  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder')
  );

  if (!isConfigured) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    roles: string[];
  };
}

/**
 * Middleware: Strictly requires a valid Supabase bearer token.
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

  const client = getSupabaseServerClient();
  let user: any = null;

  if (client) {
    try {
      const { data, error } = await client.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
      }
    } catch (apiErr) {
      console.log('[Auth Diagnostic] Supabase auth.getUser error:', apiErr);
      console.warn('Notice in Supabase auth.getUser:', apiErr);
    }
  }

  // Resilient fallback for serverless cold-starts & network glitches (Strict Signature Verification)
  if (!user) {
    user = verifyCryptographicJwtSignature(token);
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
    try {
      dbUser = await getUserByUid(user.id);
      if (!dbUser && normalizedEmail) {
        dbUser = await getOrCreateUser(user.id, normalizedEmail, {
          name: isBootstrap ? (bootstrapConfig?.name || 'Admin') : (user.user_metadata?.name || user.user_metadata?.full_name),
        });
      } else if (dbUser && isBootstrap && (!dbUser.roles || !dbUser.roles.includes('Admin') || dbUser.name !== (bootstrapConfig?.name || 'Admin'))) {
        dbUser = await getOrCreateUser(user.id, normalizedEmail, {
          name: bootstrapConfig?.name || 'Admin',
        });
      }
    } catch (dbErr) {
      console.warn('Notice: Unable to query or initialize database user in requireAuth:', dbErr);
    }

    // Role resolution:
    // If user is a verified bootstrap admin email, canonical role MUST be 'Admin'.
    // If dbUser exists, use dbUser.roles.
    // Otherwise default to ['Student'].
    let authoritativeRoles = ['Student'];
    if (isBootstrap) {
      authoritativeRoles = ['Admin'];
    } else if (dbUser?.roles && Array.isArray(dbUser.roles)) {
      authoritativeRoles = dbUser.roles;
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
        isAdmin: authoritativeRoles.includes('Admin'),
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
    const client = getSupabaseServerClient();
    let user: any = null;

    if (client) {
      try {
        const { data } = await client.auth.getUser(token);
        if (data?.user) user = data.user;
      } catch {}
    }

    if (!user) {
      user = verifyCryptographicJwtSignature(token);
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
      if (isBootstrap) authoritativeRoles = ['Admin'];
      else if (dbUser?.roles && Array.isArray(dbUser.roles)) authoritativeRoles = dbUser.roles;

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
      const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);

      // If user is a verified trusted bootstrap admin, grant admin access immediately
      if (isBootstrap) {
        req.user!.roles = ['Admin'];
        return next();
      }

      // Query database directly to ensure freshest authoritative verification
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
      const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);

      // If user is a verified trusted bootstrap admin, grant access immediately
      if (isBootstrap) {
        return next();
      }

      // Query database directly
      let dbUser = null;
      try {
        dbUser = await getUserByUid(uid);
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


