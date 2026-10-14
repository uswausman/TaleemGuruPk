import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function test() {
  if (!db) {
    console.log('No db');
    return;
  }
  try {
    await db.execute(sql`SELECT 1`);
    console.log('Success');
  } catch (err: any) {
    console.log('Caught Drizzle error:', {
      message: err?.message,
      code: err?.code,
      cause: err?.cause,
      constructor: err?.constructor?.name,
    });
  }
}

test().catch(console.error);
