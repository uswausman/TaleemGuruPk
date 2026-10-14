import { Pool } from 'pg';
import { sanitizeSupabaseConnectionString } from '../src/db/index';

const envVars = [
  'DATABASE_URL',
  'SUPABASE_DATABASE_URL',
  'SUPABASE_DB_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'PG_CONNECTION_STRING'
];

async function testAll() {
  for (const v of envVars) {
    const val = process.env[v];
    if (!val) {
      console.log(`[ENV] ${v}: NOT SET`);
      continue;
    }
    const sanitized = sanitizeSupabaseConnectionString(val);
    console.log(`[ENV] ${v}: PRESENT (len=${val.length})`);
    
    const pool = new Pool({
      connectionString: sanitized,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await pool.connect();
      const res = await client.query('SELECT 1');
      console.log(`  -> SUCCESS with ${v}! rows:`, res.rows);
      client.release();
      await pool.end();
      return; // Found working one
    } catch (err: any) {
      console.log(`  -> FAILED with ${v}:`, err?.message, `(code: ${err?.code})`);
      await pool.end().catch(() => {});
    }
  }
}

testAll().catch(console.error);
