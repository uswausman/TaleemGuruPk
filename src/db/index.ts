import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
  var _drizzleDb: NodePgDatabase<typeof schema> | undefined;
  var _drizzlePoolRef: Pool | undefined;
}

function isValidProjectRefFormat(ref: string): boolean {
  return /^[a-z0-9-]+$/i.test(ref) && ref.length >= 1 && ref.length <= 64;
}

function extractProjectRefFromUrl(urlStr: string): string | undefined {
  if (!urlStr) return undefined;
  try {
    const parsed = new URL(urlStr);
    const hostParts = parsed.hostname.toLowerCase().split('.');
    if (
      hostParts.length === 3 &&
      hostParts[1] === 'supabase' &&
      (hostParts[2] === 'co' || hostParts[2] === 'net')
    ) {
      const ref = hostParts[0];
      if (isValidProjectRefFormat(ref)) {
        return ref;
      }
    }
  } catch (e) {
    // Invalid URL format
  }
  return undefined;
}

/**
 * Sanitizes and validates Supabase connection strings to prevent authentication failures on Supabase Pooler.
 */
export function sanitizeSupabaseConnectionString(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();

    // Exact pooler host validation: must be pooler.supabase.com or *.pooler.supabase.com
    const isPoolerHost = host === 'pooler.supabase.com' || host.endsWith('.pooler.supabase.com');

    if (isPoolerHost) {
      const explicitProjectId = process.env.SUPABASE_PROJECT_ID?.trim();
      if (explicitProjectId && !isValidProjectRefFormat(explicitProjectId)) {
        throw new Error('Database configuration error: Invalid SUPABASE_PROJECT_ID format');
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
      const derivedRef = extractProjectRefFromUrl(supabaseUrl);

      if (explicitProjectId && derivedRef && explicitProjectId !== derivedRef) {
        throw new Error('Database configuration error: SUPABASE_PROJECT_ID mismatch with configured SUPABASE_URL');
      }

      const projectRef = explicitProjectId || derivedRef;

      if (!projectRef) {
        throw new Error('Database configuration error: Missing required SUPABASE_PROJECT_ID or valid SUPABASE_URL for pooler connection');
      }

      if (parsed.username) {
        if (parsed.username.startsWith('postgres.')) {
          const existingUserRef = parsed.username.slice(9);
          if (!existingUserRef || !isValidProjectRefFormat(existingUserRef) || existingUserRef !== projectRef) {
            throw new Error('Database configuration error: Connection string username project reference mismatch');
          }
        } else if (parsed.username === 'postgres') {
          parsed.username = `postgres.${projectRef}`;
        }
        // Custom usernames not starting with 'postgres.' are preserved unchanged without modifying auth behavior
      }

      // Default port to 6543 ONLY when missing; preserve explicit ports (e.g. 5432 or custom)
      if (!parsed.port) {
        parsed.port = '6543';
      }
      return parsed.toString();
    }
  } catch (e: any) {
    if (e?.message?.startsWith('Database configuration error:')) {
      throw e;
    }
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

function logPoolStats(pool: Pool, context: string) {
  console.error(`[Database Pool Diagnostics] ${context}`, {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
}

function wrapPool(pool: Pool): Pool {
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect.bind(pool);

  function isAcquisitionTimeout(err: any): boolean {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    // Connection acquisition timeouts in pg-pool often include this specific phrase
    return msg.includes('connection acquisition timeout');
  }

  pool.query = function (...args: any[]): any {
    const callback = args.length > 0 && typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;

    if (callback) {
      args[args.length - 1] = function (err: any, res: any) {
        if (err && isAcquisitionTimeout(err)) {
          logPoolStats(pool, 'Pool.query acquisition timeout (callback)');
        }
        callback(err, res);
      };
      return originalQuery(...args);
    }

    return originalQuery(...args).catch((err: any) => {
      if (isAcquisitionTimeout(err)) {
        logPoolStats(pool, 'Pool.query acquisition timeout (promise)');
      }
      throw err;
    });
  };

  pool.connect = function (...args: any[]): any {
    const callback = args.length > 0 && typeof args[0] === 'function' ? args[0] : undefined;

    if (callback) {
      args[0] = function (err: any, client: any, done: any) {
        if (err && isAcquisitionTimeout(err)) {
          logPoolStats(pool, 'Pool.connect acquisition timeout (callback)');
        }
        callback(err, client, done);
      };
      return originalConnect(...args);
    }

    return originalConnect(...args).catch((err: any) => {
      if (isAcquisitionTimeout(err)) {
        logPoolStats(pool, 'Pool.connect acquisition timeout (promise)');
      }
      throw err;
    });
  };

  return pool;
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
        global._postgresPool = wrapPool(new Pool({
          host: process.env.SQL_HOST,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
          ssl: isUnixSocket ? false : (process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined),
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
        }));
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

          global._postgresPool = wrapPool(new Pool({
            connectionString,
            ssl: isLocal || hasSslDisabled ? false : { rejectUnauthorized: false },
            max: isVercel ? 5 : 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 30000,
          }));
        }
        // 3. Discrete Remote Parameters (POSTGRES_HOST / PGHOST)
        else if (process.env.POSTGRES_HOST && !isLocalHost(process.env.POSTGRES_HOST)) {
          console.info(`[Database] Initializing connection pool with POSTGRES_HOST: ${process.env.POSTGRES_HOST}`);
          global._postgresPool = wrapPool(new Pool({
            host: process.env.POSTGRES_HOST,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DATABASE,
            port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432,
            ssl: { rejectUnauthorized: false },
            max: isVercel ? 5 : 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 30000,
          }));
        } else if (process.env.PGHOST && !isLocalHost(process.env.PGHOST)) {
          console.info(`[Database] Initializing connection pool with PGHOST: ${process.env.PGHOST}`);
          global._postgresPool = wrapPool(new Pool({
            host: process.env.PGHOST,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE,
            port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
            ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
            max: isVercel ? 5 : 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 30000,
          }));
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
          global._postgresPool = wrapPool(new Pool({
            host: process.env.PGHOST || 'localhost',
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE || 'postgres',
            port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
            max: 10,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 15000,
          }));
        }
      }

      global._postgresPool.on('error', (err) => {
        const msg = err?.message || '';
        console.warn('[Database] Pool client error encountered:', msg);
        logPoolStats(global._postgresPool!, 'Error event');
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

export function getDb(): NodePgDatabase<typeof schema> {
  const currentPool = createPool();
  if (!global._drizzleDb || global._drizzlePoolRef !== currentPool) {
    global._drizzleDb = drizzle(currentPool, { schema });
    global._drizzlePoolRef = currentPool;
    console.info('[DB_POOL_DIAGNOSTIC]', {
      poolCreated: Boolean(currentPool),
      poolReused: false,
      poolReplacement: true,
    });
  }
  return global._drizzleDb;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});
