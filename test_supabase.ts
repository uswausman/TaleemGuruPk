
// Test script for sanitizeSupabaseConnectionString
import { sanitizeSupabaseConnectionString } from './src/db/index.js';

// Mock process.env
const originalEnv = { ...process.env };
process.env.VITE_SUPABASE_URL = 'https://lebvwcznizcezmcemnjl.supabase.co';

function test(name: string, url: string, expectedProject: string, envOverrides: Record<string, string> = {}) {
  process.env = { ...originalEnv, ...envOverrides };
  const sanitized = sanitizeSupabaseConnectionString(url);
  const parsed = new URL(sanitized);
  const user = parsed.username;
  console.log(`Test: ${name}`);
  console.log(`  Input: ${url}`);
  console.log(`  Sanitized User: ${user}`);
  const pass = user === `postgres.${expectedProject}`;
  console.log(`  Result: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) {
    console.log(`  Expected: postgres.${expectedProject}`);
  }
}

console.log('--- Running Tests ---');

// 1. Explicit ID matches derived (should pass)
test('Explicit matches derived', 'postgres://postgres:pass@db.pooler.supabase.com:5432/postgres', 'lebvwcznizcezmcemnjl', { SUPABASE_PROJECT_ID: 'lebvwcznizcezmcemnjl', VITE_SUPABASE_URL: 'https://lebvwcznizcezmcemnjl.supabase.co' });

// 2. Missing project ID, valid Supabase URL (should derive)
test('Derive from URL', 'postgres://postgres:pass@db.pooler.supabase.com:5432/postgres', 'lebvwcznizcezmcemnjl', { VITE_SUPABASE_URL: 'https://lebvwcznizcezmcemnjl.supabase.co' });

// 3. Missing everything (fallback)
test('Use fallback', 'postgres://postgres:pass@db.pooler.supabase.com:5432/postgres', 'lebvwcznizcezmcemnjl', { VITE_SUPABASE_URL: '' });

// 4. Non-Supabase host
const nonSupabaseUrl = 'postgres://postgres:pass@db.other.com:5432/postgres';
const res = sanitizeSupabaseConnectionString(nonSupabaseUrl);
console.log(`Test: Non-Supabase host -> ${res === nonSupabaseUrl ? 'PASS' : 'FAIL'}`);

console.log('--- Tests Complete ---');
