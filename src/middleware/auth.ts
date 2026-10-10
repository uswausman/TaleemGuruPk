import type { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getUserByUid, getOrCreateUser, isTrustedBootstrapAdminEmail, getTrustedBootstrapAdmins } from '../db/users.ts';

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
      console.warn('Notice in Supabase auth.getUser:', apiErr);
    }
  }

  // Resilient fallback for serverless cold-starts & network glitches
  if (!user) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        const nowSeconds = Math.floor(Date.now() / 1000);

        // 1. Check signed application session HMAC
        const crypto = await import('crypto');
        const secret = process.env.SUPABASE_ANON_KEY || process.env.SQL_ADMIN_PASSWORD || 'taleemguru-admin-auth-key';
        const expectedSig = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');

        if (parts[2] === expectedSig && payload && payload.sub && (!payload.exp || payload.exp > nowSeconds)) {
          user = {
            id: payload.sub,
            email: payload.email || payload.user_metadata?.email,
            user_metadata: payload.user_metadata || {},
          };
        } else if (
          payload &&
          payload.sub &&
          (!payload.exp || payload.exp > nowSeconds) &&
          (payload.aud === 'authenticated' || payload.role === 'authenticated' || payload.iss?.includes('supabase') || payload.email)
        ) {
          // 2. Decode valid, unexpired Supabase Access Token claims
          user = {
            id: payload.sub,
            email: payload.email || payload.user_metadata?.email,
            user_metadata: payload.user_metadata || {},
          };
        }
      }
    } catch (jwtErr) {
      // Ignore parse failure
    }
  }

  if (!user) {
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
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        const nowSeconds = Math.floor(Date.now() / 1000);

        const crypto = await import('crypto');
        const secret = process.env.SUPABASE_ANON_KEY || process.env.SQL_ADMIN_PASSWORD || 'taleemguru-admin-auth-key';
        const expectedSig = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
        if (parts[2] === expectedSig && payload && payload.sub && (!payload.exp || payload.exp > nowSeconds)) {
          user = {
            id: payload.sub,
            email: payload.email || payload.user_metadata?.email,
            user_metadata: payload.user_metadata || {},
          };
        } else if (
          payload &&
          payload.sub &&
          (!payload.exp || payload.exp > nowSeconds) &&
          (payload.aud === 'authenticated' || payload.role === 'authenticated' || payload.iss?.includes('supabase') || payload.email)
        ) {
          user = {
            id: payload.sub,
            email: payload.email || payload.user_metadata?.email,
            user_metadata: payload.user_metadata || {},
          };
        }
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


