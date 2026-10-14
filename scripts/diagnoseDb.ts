import { resolveDatabaseConnectionString, createPool, db } from '../src/db/index';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

async function runDiagnostics() {
  console.log('=== TaleemGuru Database Deep Diagnostic ===');
  const resolved = resolveDatabaseConnectionString();
  console.log('Resolved database connection:', resolved ? { selectedEnvVar: resolved.selectedEnvVar, urlPresent: Boolean(resolved.url), urlLength: resolved.url.length } : 'None');

  if (!resolved) {
    console.error('BLOCKED: No database connection string resolved in environment.');
    return;
  }

  const pool = new Pool({
    connectionString: resolved.url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 10000,
  });

  const startTime = performance.now();
  try {
    console.log('Attempting pool.connect()...');
    const client = await pool.connect();
    const connectTime = performance.now() - startTime;
    console.log(`[OK] Pool connection acquired in ${connectTime.toFixed(2)}ms`);

    try {
      const qStart = performance.now();
      const res = await client.query('SELECT 1');
      const qTime = performance.now() - qStart;
      console.log(`[OK] SELECT 1 executed successfully in ${qTime.toFixed(2)}ms`, res.rows);
    } catch (qErr: any) {
      console.error('[ERROR] SELECT 1 query failed:', {
        message: qErr?.message,
        code: qErr?.code,
        detail: qErr?.detail,
        stack: qErr?.stack,
      });
    } finally {
      client.release();
    }
  } catch (connErr: any) {
    const totalTime = performance.now() - startTime;
    console.error(`[ERROR] Connection acquisition failed after ${totalTime.toFixed(2)}ms:`, {
      message: connErr?.message,
      code: connErr?.code,
      errno: connErr?.errno,
      syscall: connErr?.syscall,
      address: connErr?.address,
      port: connErr?.port,
      stack: connErr?.stack,
    });
  } finally {
    await pool.end();
  }
}

runDiagnostics().catch(console.error);
