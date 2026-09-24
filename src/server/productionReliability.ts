/**
 * TaleemGuru Production Reliability, Health & Monitoring Engine
 * Provides environment validation, database health checks, structured privacy-safe logging,
 * and production-safe error sanitization.
 */

import { db } from '../db/index';
import { sql } from 'drizzle-orm';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  database: {
    connected: boolean;
    latencyMs?: number;
    error?: string;
  };
  environment: {
    nodeEnv: string;
    databaseConfigured: boolean;
    authConfigured: boolean;
  };
}

const startTime = Date.now();

export function validateEnvironmentVariables(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  const dbConfigured = Boolean(
    process.env.SQL_HOST ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    (process.env.POSTGRES_HOST && process.env.POSTGRES_HOST !== 'localhost' && process.env.POSTGRES_HOST !== '127.0.0.1') ||
    (process.env.PGHOST && process.env.PGHOST !== 'localhost' && process.env.PGHOST !== '127.0.0.1')
  );

  if (!dbConfigured) {
    missing.push('DATABASE_URL or POSTGRES_URL or SQL_HOST');
  }

  if (!process.env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) {
    warnings.push('SUPABASE_URL / VITE_SUPABASE_URL not explicitly set (using fallback auth configuration)');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

export async function checkDatabaseHealth(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  if (!db) {
    return { connected: false, latencyMs: 0, error: 'Database instance not initialized' };
  }

  try {
    // 1. Run basic ping connectivity query
    await db.execute(sql`SELECT 1`);

    // 2. Validate schema: check if the users table exists and is readable.
    // This query fails if the users table does not exist, verifying our schema integrity!
    await db.execute(sql`SELECT id FROM users LIMIT 1`);

    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    return { connected: true, latencyMs };
  } catch (err: any) {
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    // Extract sanitized underlying cause or message without exposing secrets or connection URLs
    const rawCause = err?.cause?.message ? String(err.cause.message) : (err?.message ? String(err.message) : 'Database connection error');
    const safeError = rawCause
      .replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***@')
      .replace(/postgres:\/\/[^@]+@/gi, 'postgres://***@');
    return { connected: false, latencyMs, error: safeError };
  }
}

export async function getSystemHealthReport(): Promise<HealthStatus> {
  const dbHealth = await checkDatabaseHealth();
  const envCheck = validateEnvironmentVariables();

  const isHealthy = dbHealth.connected;

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    database: dbHealth,
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      databaseConfigured: envCheck.valid,
      authConfigured: true,
    },
  };
}

export function privacySafeLogger(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = meta ? sanitizeDataForLogs(meta) : undefined;
  
  const logEntry = {
    timestamp,
    level,
    message,
    ...(sanitizedMeta ? { meta: sanitizedMeta } : {}),
  };

  if (level === 'ERROR') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'WARN') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

function sanitizeDataForLogs(data: any): any {
  if (!data) return data;
  if (typeof data === 'string') {
    // Mask passwords, tokens, API keys, email PII if needed
    return data
      .replace(/password=[^&]+/gi, 'password=***')
      .replace(/secret=[^&]+/gi, 'secret=***')
      .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer ***');
  }
  if (typeof data === 'object') {
    const clone: any = Array.isArray(data) ? [] : {};
    for (const key of Object.keys(data)) {
      const lower = key.toLowerCase();
      if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('key')) {
        clone[key] = '***';
      } else {
        clone[key] = sanitizeDataForLogs(data[key]);
      }
    }
    return clone;
  }
  return data;
}

export function productionErrorSanitizer(err: any): { statusCode: number; error: string } {
  const statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Ensure no internal SQL syntax or database connection strings leak to clients
  if (message.includes('pg') || message.includes('postgres') || message.includes('drizzle') || message.includes('column') || message.includes('relation')) {
    message = 'A database processing error occurred. Please try again later.';
  }

  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected server error occurred.';
  }

  return {
    statusCode,
    error: message,
  };
}
