import { resolveDatabaseConnectionString, createPool } from '../src/db/index';
import { sql } from 'drizzle-orm';
import { db } from '../src/db/index';

async function testConnection() {
  console.log('=== Database Connection Diagnostic Test ===');
  const resolved = resolveDatabaseConnectionString();
  console.log('Resolved database config:', {
    hasResolved: Boolean(resolved),
    envVar: resolved?.selectedEnvVar,
    urlRedacted: resolved?.url ? resolved.url.replace(/:[^:@]+@/, ':***@') : 'none',
  });

  try {
    const start = performance.now();
    console.log('Attempting db.execute(SELECT 1)...');
    const result = await db.execute(sql`SELECT 1 as test`);
    const latency = Math.round(performance.now() - start);
    console.log(`SUCCESS: Connected to database in ${latency}ms`, result.rows);
  } catch (err: any) {
    console.error('FAILED: Database connection error:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
  }
}

testConnection().catch(console.error);
