import { sanitizeSupabaseConnectionString } from './src/db/index.ts';

// --- TEST RUNNER ---
let passedCount = 0;
let failedCount = 0;

function runTest(name: string, fn: () => void) {
  delete process.env.SUPABASE_PROJECT_ID;
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failedCount++;
  }
}

function assertEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg} - Expected: "${expected}", Got: "${actual}"`);
  }
}

console.log('=== Running Supabase Connection String Sanitizer Tests ===\n');

// 1. Valid pooler URL with explicit SUPABASE_PROJECT_ID and missing port (defaults to 6543)
runTest('1. Valid pooler URL with explicit SUPABASE_PROJECT_ID (default port 6543)', () => {
  process.env.SUPABASE_PROJECT_ID = 'lebvwcznizcezmcemnjl';
  const input = 'postgres://postgres:secret@aws-0-eu-central-1.pooler.supabase.com/postgres';
  const expected = 'postgres://postgres.lebvwcznizcezmcemnjl:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';
  assertEqual(sanitizeSupabaseConnectionString(input), expected, 'ConnectionString rewrite failed');
});

// 2. Valid pooler URL derived from VITE_SUPABASE_URL (.supabase.co) preserving explicit port 5432
runTest('2. Valid pooler URL derived from VITE_SUPABASE_URL (.supabase.co) preserving explicit port 5432', () => {
  process.env.VITE_SUPABASE_URL = 'https://lebvwcznizcezmcemnjl.supabase.co';
  const input = 'postgres://postgres:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  const expected = 'postgres://postgres.lebvwcznizcezmcemnjl:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  assertEqual(sanitizeSupabaseConnectionString(input), expected, 'Explicit port 5432 should be preserved');
});

// 3. Valid pooler URL derived from SUPABASE_URL (.supabase.net) preserving explicit port 6543
runTest('3. Valid pooler URL derived from SUPABASE_URL (.supabase.net) preserving explicit port 6543', () => {
  process.env.SUPABASE_URL = 'https://lebvwcznizcezmcemnjl.supabase.net';
  const input = 'postgres://postgres:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';
  const expected = 'postgres://postgres.lebvwcznizcezmcemnjl:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';
  assertEqual(sanitizeSupabaseConnectionString(input), expected, 'Explicit port 6543 should be preserved');
});

// 4. Project ID Mismatch Error
runTest('4. Project ID Mismatch Error', () => {
  process.env.SUPABASE_PROJECT_ID = 'projA';
  process.env.SUPABASE_URL = 'https://projB.supabase.co';
  const input = 'postgres://postgres:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  let threw = false;
  try {
    sanitizeSupabaseConnectionString(input);
  } catch (err: any) {
    threw = true;
    assertEqual(err.message, 'Database configuration error: SUPABASE_PROJECT_ID mismatch with configured SUPABASE_URL', 'Error message mismatch');
  }
  if (!threw) throw new Error('Expected function to throw on project ID mismatch');
});

// 5. Missing Configuration Error
runTest('5. Missing Configuration Error', () => {
  const input = 'postgres://postgres:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  let threw = false;
  try {
    sanitizeSupabaseConnectionString(input);
  } catch (err: any) {
    threw = true;
    assertEqual(err.message, 'Database configuration error: Missing required SUPABASE_PROJECT_ID or valid SUPABASE_URL for pooler connection', 'Error message mismatch');
  }
  if (!threw) throw new Error('Expected function to throw on missing configuration');
});

// 6. Invalid SUPABASE_PROJECT_ID Format Error
runTest('6. Invalid SUPABASE_PROJECT_ID Format Error', () => {
  process.env.SUPABASE_PROJECT_ID = 'invalid project id!';
  const input = 'postgres://postgres:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  let threw = false;
  try {
    sanitizeSupabaseConnectionString(input);
  } catch (err: any) {
    threw = true;
    assertEqual(err.message, 'Database configuration error: Invalid SUPABASE_PROJECT_ID format', 'Error message mismatch');
  }
  if (!threw) throw new Error('Expected function to throw on invalid SUPABASE_PROJECT_ID format');
});

// 7. Bare supabase.co Hostname Rejection
runTest('7. Bare supabase.co Hostname Rejection', () => {
  process.env.SUPABASE_URL = 'https://supabase.co';
  const input = 'postgres://postgres:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  let threw = false;
  try {
    sanitizeSupabaseConnectionString(input);
  } catch (err: any) {
    threw = true;
    assertEqual(err.message, 'Database configuration error: Missing required SUPABASE_PROJECT_ID or valid SUPABASE_URL for pooler connection', 'Error message mismatch');
  }
  if (!threw) throw new Error('Expected function to reject bare domain and throw missing config');
});

// 8. Multi-subdomain Hostname Rejection
runTest('8. Multi-subdomain Hostname Rejection', () => {
  process.env.SUPABASE_URL = 'https://sub.sub.supabase.co';
  const input = 'postgres://postgres:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  let threw = false;
  try {
    sanitizeSupabaseConnectionString(input);
  } catch (err: any) {
    threw = true;
    assertEqual(err.message, 'Database configuration error: Missing required SUPABASE_PROJECT_ID or valid SUPABASE_URL for pooler connection', 'Error message mismatch');
  }
  if (!threw) throw new Error('Expected function to reject multi-subdomain and throw missing config');
});

// 9. Arbitrary Non-Supabase Hostname Rejection
runTest('9. Arbitrary Non-Supabase Hostname Rejection', () => {
  process.env.SUPABASE_URL = 'https://example.com';
  const input = 'postgres://postgres:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  let threw = false;
  try {
    sanitizeSupabaseConnectionString(input);
  } catch (err: any) {
    threw = true;
    assertEqual(err.message, 'Database configuration error: Missing required SUPABASE_PROJECT_ID or valid SUPABASE_URL for pooler connection', 'Error message mismatch');
  }
  if (!threw) throw new Error('Expected function to reject arbitrary host and throw missing config');
});

// 10. Non-Pooler Connection String Unchanged
runTest('10. Non-Pooler Connection String Unchanged', () => {
  const input = 'postgres://postgres:secret@db.example.com:5432/postgres';
  assertEqual(sanitizeSupabaseConnectionString(input), input, 'Non-pooler connection string should remain unchanged');
});

// 11. postgres.<matching-ref> User Name
runTest('11. postgres.<matching-ref> User Name', () => {
  process.env.SUPABASE_PROJECT_ID = 'lebvwcznizcezmcemnjl';
  const input = 'postgres://postgres.lebvwcznizcezmcemnjl:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  const expected = 'postgres://postgres.lebvwcznizcezmcemnjl:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  assertEqual(sanitizeSupabaseConnectionString(input), expected, 'Matching qualified postgres username should pass');
});

// 12. postgres.<conflicting-ref> User Name Error
runTest('12. postgres.<conflicting-ref> User Name Error', () => {
  process.env.SUPABASE_PROJECT_ID = 'lebvwcznizcezmcemnjl';
  const input = 'postgres://postgres.conflictingRef:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  let threw = false;
  try {
    sanitizeSupabaseConnectionString(input);
  } catch (err: any) {
    threw = true;
    assertEqual(err.message, 'Database configuration error: Connection string username project reference mismatch', 'Error message mismatch');
  }
  if (!threw) throw new Error('Expected function to throw on postgres.<conflicting-ref> username');
});

// 13. Valid Custom Database Username Containing Dot Preserved
runTest('13. Valid Custom Database Username Containing Dot Preserved', () => {
  process.env.SUPABASE_PROJECT_ID = 'lebvwcznizcezmcemnjl';
  const input = 'postgres://my_custom.role:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  const expected = 'postgres://my_custom.role:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  assertEqual(sanitizeSupabaseConnectionString(input), expected, 'Custom username containing dot should be preserved');
});

// 14. Malformed URL Input Safe Handling
runTest('14. Malformed URL Input Safe Handling', () => {
  const input = 'not-a-valid-url';
  assertEqual(sanitizeSupabaseConnectionString(input), input, 'Malformed URL should be returned unchanged');
});

// 15. Attacker domain containing pooler.supabase.com rejected
runTest('15. Attacker domain containing pooler.supabase.com rejected', () => {
  process.env.SUPABASE_PROJECT_ID = 'lebvwcznizcezmcemnjl';
  const input = 'postgres://postgres:secret@pooler.supabase.com.attacker.com:5432/postgres';
  assertEqual(sanitizeSupabaseConnectionString(input), input, 'Attacker domain should not trigger pooler rewrite');
});

// 16. postgres. Username with Empty Project Reference Error
runTest('16. postgres. Username with Empty Project Reference Error', () => {
  process.env.SUPABASE_PROJECT_ID = 'lebvwcznizcezmcemnjl';
  const input = 'postgres://postgres.:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  let threw = false;
  try {
    sanitizeSupabaseConnectionString(input);
  } catch (err: any) {
    threw = true;
    assertEqual(err.message, 'Database configuration error: Connection string username project reference mismatch', 'Error message mismatch');
  }
  if (!threw) throw new Error('Expected function to throw on postgres. username with empty project reference');
});

console.log(`\n=== Test Results: ${passedCount} PASSED, ${failedCount} FAILED ===`);
if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
