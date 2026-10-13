import crypto from 'crypto';
import { verifyServerSignedToken } from '../src/middleware/auth.ts';
import { db } from '../src/db/index.ts';
import { getOrCreateUser, updateUserRolesInDb } from '../src/db/users.ts';

const BASE_URL = 'http://localhost:3000';
const DEV_SECRET = 'taleemguru-dev-server-jwt-secret-key-32bytes';

function buildToken(payloadOverriding: Record<string, any>, secretToUse: string = DEV_SECRET): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const defaultPayload = {
    sub: 'test-user-001',
    email: 'test.user@taleemguru.pk',
    iss: 'taleemguru-backend',
    aud: 'taleemguru-admin',
    exp: now + 3600,
    nbf: now - 10,
    ...payloadOverriding,
  };
  const payload = Buffer.from(JSON.stringify(defaultPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secretToUse).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function runNegativeSecurityTests() {
  console.log('=============================================================');
  console.log('  TALEEMGURU NEGATIVE SECURITY & HARDENING TEST SUITE');
  console.log('=============================================================');

  process.env.SERVER_JWT_SECRET = DEV_SECRET;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, descMsg: string, extra?: any) {
    if (condition) {
      console.log(`  ✓ PASS: ${descMsg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${descMsg}`, extra ? extra : '');
      failed++;
    }
  }

  // --- Test 1: Missing SERVER_JWT_SECRET ---
  console.log('\n--- 1. Missing SERVER_JWT_SECRET Configuration ---');
  const originalSecret = process.env.SERVER_JWT_SECRET;
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  delete process.env.SERVER_JWT_SECRET;
  const validTokenStructure = buildToken({}, DEV_SECRET);
  const missingSecretResult = verifyServerSignedToken(validTokenStructure);
  assert(
    missingSecretResult.valid === false && missingSecretResult.error === 'SERVER_JWT_SECRET is not configured',
    'verifyServerSignedToken fails closed when SERVER_JWT_SECRET is unconfigured'
  );
  process.env.SERVER_JWT_SECRET = originalSecret;
  process.env.NODE_ENV = originalEnv;

  // --- Test 2: Tokens signed with public key or password fallback ---
  console.log('\n--- 2. Public Key & Database Password Fallback Rejection ---');
  const anonKeySignedToken = buildToken({}, 'sb-anon-key-123456');
  const dbPasswordSignedToken = buildToken({}, 'sql-admin-password-secret');
  const defaultKeySignedToken = buildToken({}, 'taleemguru-admin-auth-key');

  const resAnon = verifyServerSignedToken(anonKeySignedToken);
  assert(resAnon.valid === false && resAnon.error === 'Invalid token signature', 'Token signed with SUPABASE_ANON_KEY rejected');

  const resDbPass = verifyServerSignedToken(dbPasswordSignedToken);
  assert(resDbPass.valid === false && resDbPass.error === 'Invalid token signature', 'Token signed with SQL_ADMIN_PASSWORD rejected');

  const resDefaultKey = verifyServerSignedToken(defaultKeySignedToken);
  assert(resDefaultKey.valid === false && resDefaultKey.error === 'Invalid token signature', 'Token signed with hardcoded string rejected');

  // --- Test 3: Invalid & Tampered Signature ---
  console.log('\n--- 3. Tampered Token Signature Rejection ---');
  const [h, p, s] = validTokenStructure.split('.');
  const tamperedToken = `${h}.${p}.invalid_signature_hash`;
  const resTampered = verifyServerSignedToken(tamperedToken);
  assert(resTampered.valid === false && resTampered.error === 'Invalid token signature', 'Tampered signature rejected');

  // --- Test 4: Expired Token ---
  console.log('\n--- 4. Expired Token Rejection ---');
  const expiredToken = buildToken({ exp: Math.floor(Date.now() / 1000) - 3600 });
  const resExpired = verifyServerSignedToken(expiredToken);
  assert(resExpired.valid === false && resExpired.error === 'Token expired', 'Expired token rejected');

  // --- Test 5: Future Token (nbf in future) ---
  console.log('\n--- 5. Future Not-Before (nbf) Token Rejection ---');
  const futureToken = buildToken({ nbf: Math.floor(Date.now() / 1000) + 3600 });
  const resFuture = verifyServerSignedToken(futureToken);
  assert(resFuture.valid === false && resFuture.error === 'Token not yet active', 'Future nbf token rejected');

  // --- Test 6: Incorrect Issuer (iss) ---
  console.log('\n--- 6. Invalid Issuer (iss) Rejection ---');
  const badIssuerToken = buildToken({ iss: 'untrusted-issuer' });
  const resBadIss = verifyServerSignedToken(badIssuerToken);
  assert(resBadIss.valid === false && resBadIss.error === 'Invalid token issuer', 'Token with bad iss claim rejected');

  // --- Test 7: Incorrect Audience (aud) ---
  console.log('\n--- 7. Invalid Audience (aud) Rejection ---');
  const badAudienceToken = buildToken({ aud: 'untrusted-audience' });
  const resBadAud = verifyServerSignedToken(badAudienceToken);
  assert(resBadAud.valid === false && resBadAud.error === 'Invalid token audience', 'Token with bad aud claim rejected');

  // --- Test 8: Live Middleware Tests over HTTP ---
  console.log('\n--- 8. Real Middleware HTTP End-to-End Rejection Tests ---');
  
  // 8a. Expired token against real /api/admin/verify endpoint
  const httpExpiredRes = await fetch(`${BASE_URL}/api/admin/verify`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  assert(httpExpiredRes.status === 401, 'HTTP /api/admin/verify returns 401 Unauthorized for expired token');

  // 8b. Bad signature token against real /api/mcqs endpoint
  const httpTamperedRes = await fetch(`${BASE_URL}/api/mcqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tamperedToken}` },
    body: JSON.stringify({ question: 'Test?' }),
  });
  assert(httpTamperedRes.status === 401, 'HTTP /api/mcqs returns 401 Unauthorized for tampered token');

  // --- Test 9: Student Privilege Escalation via User Metadata ---
  console.log('\n--- 9. Student Privilege Escalation Protection ---');
  const studentEscalationUid = 'neg-student-escalate-001';
  const studentEscalationEmail = 'neg.student@taleemguru.pk';
  await getOrCreateUser(studentEscalationUid, studentEscalationEmail, { name: 'Escalating Student' });
  await updateUserRolesInDb(studentEscalationUid, ['Student']);

  // Craft token with user_metadata claiming Admin/SuperAdmin roles
  const escalationToken = buildToken({
    sub: studentEscalationUid,
    email: studentEscalationEmail,
    user_metadata: { roles: ['SuperAdmin', 'Admin'] },
  });

  const httpEscalationRes = await fetch(`${BASE_URL}/api/approvals`, {
    headers: { Authorization: `Bearer ${escalationToken}` },
  });
  assert(httpEscalationRes.status === 403, 'HTTP /api/approvals returns 403 Forbidden despite user_metadata claims (DB roles are authoritative)');

  // --- Test 10: Missing User Record in Database ---
  console.log('\n--- 10. Missing User Record in Database Handling ---');
  const missingUidToken = buildToken({
    sub: 'non-existent-user-uid-99999',
    email: 'unknown.user@taleemguru.pk',
  });
  const httpMissingUserRes = await fetch(`${BASE_URL}/api/approvals`, {
    headers: { Authorization: `Bearer ${missingUidToken}` },
  });
  assert(httpMissingUserRes.status === 403, 'HTTP /api/approvals returns 403 Forbidden for missing DB user record');

  // --- Test 11: Valid SuperAdmin Session Succeeds ---
  console.log('\n--- 11. Valid SuperAdmin Session Success Verification ---');
  const superAdminUid = 'dacad65f-6c2d-4d28-b2f7-9f5386ca309f';
  const superAdminEmail = 'admin@taleemguru.pk';
  await getOrCreateUser(superAdminUid, superAdminEmail, { name: 'Super Administrator' });
  await updateUserRolesInDb(superAdminUid, ['SuperAdmin']);

  const superAdminToken = buildToken({
    sub: superAdminUid,
    email: superAdminEmail,
  });

  const httpVerifyRes = await fetch(`${BASE_URL}/api/admin/verify`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  const httpVerifyJson = await httpVerifyRes.json();
  console.log('HTTP VERIFY RESPONSE JSON:', httpVerifyJson);
  assert(httpVerifyRes.status === 200, 'HTTP /api/admin/verify returns 200 OK for valid SuperAdmin session');
  assert(httpVerifyJson.authorized === true, 'Response JSON confirms authorized === true');
  assert(httpVerifyJson.role === 'SuperAdmin' || (httpVerifyJson.roles && httpVerifyJson.roles.includes('SuperAdmin')), 'Response JSON confirms primary role is SuperAdmin');

  console.log('=============================================================');
  console.log(`  NEGATIVE SECURITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runNegativeSecurityTests().catch((err) => {
  console.error('Fatal error in negative security test suite:', err);
  process.exit(1);
});
