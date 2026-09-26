import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

/**
 * Sanitizes and validates Supabase connection strings to prevent authentication failures on Supabase Pooler (Port 6543 / 5432).
 */
export function sanitizeSupabaseConnectionString(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    
    // Check if connecting via Supabase Pooler (e.g. *.pooler.supabase.com)
    if (host.includes('pooler.supabase.com')) {
      let projectRef = 'gshwabwmhzxbxbetqgcp';
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
      if (supabaseUrl) {
        try {
          const sHost = new URL(supabaseUrl).hostname;
          projectRef = sHost.split('.')[0] || projectRef;
        } catch (e) {}
      }
      
      // Supabase pooler requires username format: postgres.[project_ref]
      if (parsed.username === 'postgres' && projectRef && !parsed.username.includes('.')) {
        parsed.username = `postgres.${projectRef}`;
      }
      
      // Transaction pooler uses port 6543
      if (parsed.port === '5432' || !parsed.port) {
        parsed.port = '6543';
      }
      return parsed.toString();
    }
  } catch (e) {
    // If URL parsing fails, return original string
  }
  return urlStr;
}

/**
 * Resolves the primary connection string from standard environment variables.
 * Supports standard Vercel, Supabase, Neon, and general PostgreSQL configurations.
 */
export function resolveDatabaseConnectionString(): { url: string; selectedEnvVar: string } | undefined {
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  // 1. Authoritative Supabase connection variables
  const supabaseCandidates = [
    { name: 'SUPABASE_DATABASE_URL', val: process.env.SUPABASE_DATABASE_URL },
    { name: 'SUPABASE_DB_URL', val: process.env.SUPABASE_DB_URL },
  ];

  for (const item of supabaseCandidates) {
    if (item.val && item.val.trim().length > 0) {
      const sanitized = sanitizeSupabaseConnectionString(item.val.trim());
      return { url: sanitized, selectedEnvVar: item.name };
    }
  }

  // 2. Fallback candidate connection variables (DATABASE_URL, POSTGRES_URL, etc.)
  const candidates = [
    { name: 'DATABASE_URL', val: process.env.DATABASE_URL },
    { name: 'POSTGRES_URL', val: process.env.POSTGRES_URL },
    { name: 'POSTGRES_PRISMA_URL', val: process.env.POSTGRES_PRISMA_URL },
    { name: 'POSTGRES_URL_NON_POOLING', val: process.env.POSTGRES_URL_NON_POOLING },
    { name: 'PG_CONNECTION_STRING', val: process.env.PG_CONNECTION_STRING },
  ];

  for (const candidate of candidates) {
    if (candidate.val && typeof candidate.val === 'string' && candidate.val.trim().length > 0) {
      const rawUrl = candidate.val.trim();
      
      // If we are on Vercel or in Production, check if candidate points to Supabase.
      if (isVercel || isProd) {
        try {
          const host = new URL(rawUrl).host.toLowerCase();
          if (host.includes('supabase')) {
            const sanitized = sanitizeSupabaseConnectionString(rawUrl);
            return { url: sanitized, selectedEnvVar: candidate.name };
          } else {
            console.warn(`[Database] WARNING: Skipping non-Supabase database candidate ${candidate.name} (host: ${host}) in production to prevent silent override of authoritative Supabase database.`);
            continue;
          }
        } catch (e) {
          if (rawUrl.toLowerCase().includes('supabase')) {
            const sanitized = sanitizeSupabaseConnectionString(rawUrl);
            return { url: sanitized, selectedEnvVar: candidate.name };
          } else {
            console.warn(`[Database] WARNING: Skipping unparseable non-Supabase candidate ${candidate.name} in production.`);
            continue;
          }
        }
      }

      const sanitized = sanitizeSupabaseConnectionString(rawUrl);
      return { url: sanitized, selectedEnvVar: candidate.name };
    }
  }

  return undefined;
}

function redactConnectionString(url?: string): string {
  if (!url) return 'none';
  try {
    const parsed = new URL(url);
    // This perfectly extracts protocol, host, and pathname, completely excluding credentials and search query params
    return `${parsed.protocol}//***:***@${parsed.host}${parsed.pathname}`;
  } catch (e) {
    // Fallback simple redactor: strip credentials and query params
    let cleaned = url.replace(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@/gi, 'postgres://***:***@');
    const qIndex = cleaned.indexOf('?');
    if (qIndex !== -1) {
      cleaned = cleaned.substring(0, qIndex);
    }
    return cleaned;
  }
}

function isLocalHost(host?: string): boolean {
  if (!host) return true;
  const clean = host.toLowerCase().trim();
  return clean === 'localhost' || clean === '127.0.0.1' || clean === '::1';
}

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    try {
      const isProduction =
        process.env.NODE_ENV === 'production' ||
        process.env.VERCEL === '1' ||
        process.env.VERCEL_ENV === 'production';

      // 1. Authoritative Cloud SQL / Socket Configuration (AI Studio / GCP / Cloud Run)
      if (process.env.SQL_HOST) {
        const isUnixSocket = process.env.SQL_HOST.startsWith('/');
        console.info(`[Database] Initializing connection pool with SQL_HOST: ${process.env.SQL_HOST}`);
        global._postgresPool = new Pool({
          host: process.env.SQL_HOST,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
          ssl: isUnixSocket ? false : (process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined),
          max: 10,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 15000,
        });
      }
      // 2. Authoritative Database / Postgres URL (Vercel, Supabase, Neon, Cloud SQL TCP)
      else {
        const resolved = resolveDatabaseConnectionString();
        const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
        if (resolved && resolved.url) {
          const connectionString = resolved.url;
          const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
          const hasSslDisabled = connectionString.includes('sslmode=disable') || process.env.SQL_SSL === 'false';

          const redacted = redactConnectionString(connectionString);
          console.info(`[Database] Initializing connection pool via ${resolved.selectedEnvVar}: ${redacted}`);

          global._postgresPool = new Pool({
            connectionString,
            ssl: isLocal || hasSslDisabled ? false : { rejectUnauthorized: false },
            max: isVercel ? 2 : 10,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 15000,
          });
        }
        // 3. Discrete Remote Parameters (POSTGRES_HOST / PGHOST)
        else if (process.env.POSTGRES_HOST && !isLocalHost(process.env.POSTGRES_HOST)) {
          console.info(`[Database] Initializing connection pool with POSTGRES_HOST: ${process.env.POSTGRES_HOST}`);
          global._postgresPool = new Pool({
            host: process.env.POSTGRES_HOST,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DATABASE,
            port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432,
            ssl: { rejectUnauthorized: false },
            max: isVercel ? 2 : 10,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 15000,
          });
        } else if (process.env.PGHOST && !isLocalHost(process.env.PGHOST)) {
          console.info(`[Database] Initializing connection pool with PGHOST: ${process.env.PGHOST}`);
          global._postgresPool = new Pool({
            host: process.env.PGHOST,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE,
            port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
            ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
            max: isVercel ? 2 : 10,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 15000,
          });
        }
        // 4. Production Protection: NEVER silently fallback to localhost:5432 in production
        else if (isProduction) {
          const configError = new Error(
            'Database configuration error: Missing required DATABASE_URL or POSTGRES_URL in production environment'
          );

          // Guarded stub pool that guarantees immediate sanitized rejection without crashing process startup
          const stubPool = {
            connect: async () => { throw configError; },
            query: async () => { throw configError; },
            on: () => stubPool,
            end: async () => {},
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
          } as unknown as Pool;

          global._postgresPool = stubPool;
          return stubPool;
        }
        // 5. Local Development Fallback only
        else {
          global._postgresPool = new Pool({
            host: process.env.PGHOST || 'localhost',
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE || 'postgres',
            port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
            max: 10,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 15000,
          });
        }
      }

      global._postgresPool.on('error', (err) => {
        const msg = err?.message || '';
        console.warn('[Database] Pool client error encountered:', msg);
        // Clear global pool so the next query re-initializes a fresh connection pool
        global._postgresPool = undefined;
      });
    } catch (outerErr: any) {
      console.error('Fatal synchronous error initializing database pool:', outerErr);
      const configError = new Error(
        'Database configuration error: Fatal synchronous connection error during startup: ' + (outerErr?.message || String(outerErr))
      );
      const stubPool = {
        connect: async () => { throw configError; },
        query: async () => { throw configError; },
        on: () => stubPool,
        end: async () => {},
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      } as unknown as Pool;
      global._postgresPool = stubPool;
    }
  }
  return global._postgresPool!;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
