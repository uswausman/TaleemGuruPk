import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

/**
 * Resolves the primary connection string from standard environment variables.
 * Supports standard Vercel, Supabase, Neon, and general PostgreSQL configurations.
 */
export function resolveDatabaseConnectionString(): string | undefined {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.SUPABASE_DATABASE_URL,
    process.env.SUPABASE_DB_URL,
    process.env.PG_CONNECTION_STRING,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return undefined;
}

function isLocalHost(host?: string): boolean {
  if (!host) return true;
  const clean = host.toLowerCase().trim();
  return clean === 'localhost' || clean === '127.0.0.1' || clean === '::1';
}

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    const isProduction =
      process.env.NODE_ENV === 'production' ||
      process.env.VERCEL === '1' ||
      process.env.VERCEL_ENV === 'production';

    // 1. Authoritative Cloud SQL / Socket Configuration (AI Studio / GCP / Cloud Run)
    if (process.env.SQL_HOST) {
      const isUnixSocket = process.env.SQL_HOST.startsWith('/');
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        ssl: isUnixSocket ? false : (process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined),
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    }
    // 2. Authoritative Database / Postgres URL (Vercel, Supabase, Neon, Cloud SQL TCP)
    else {
      const connectionString = resolveDatabaseConnectionString();
      if (connectionString) {
        const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
        const hasSslDisabled = connectionString.includes('sslmode=disable') || process.env.SQL_SSL === 'false';

        global._postgresPool = new Pool({
          connectionString,
          ssl: isLocal || hasSslDisabled ? false : { rejectUnauthorized: false },
          max: 10,
          connectionTimeoutMillis: 15000,
        });
      }
      // 3. Discrete Remote Parameters (POSTGRES_HOST / PGHOST)
      else if (process.env.POSTGRES_HOST && !isLocalHost(process.env.POSTGRES_HOST)) {
        global._postgresPool = new Pool({
          host: process.env.POSTGRES_HOST,
          user: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_DATABASE,
          port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432,
          ssl: { rejectUnauthorized: false },
          max: 10,
          connectionTimeoutMillis: 15000,
        });
      } else if (process.env.PGHOST && !isLocalHost(process.env.PGHOST)) {
        global._postgresPool = new Pool({
          host: process.env.PGHOST,
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE,
          port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
          ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
          max: 10,
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
          connectionTimeoutMillis: 15000,
        });
      }
    }

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err?.message || 'SQL Client Error');
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
