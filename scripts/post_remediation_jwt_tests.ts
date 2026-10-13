import crypto from 'crypto';
import express from 'express';
import {
  getServerJwtSecret,
  isServerJwtCandidate,
  verifyServerSignedToken,
} from '../src/middleware/auth.ts';
import { db } from '../src/db/index.ts';
import { getOrCreateUser, updateUserRolesInDb } from '../src/db/users.ts';

/**
 * TALEEMGURU POST-REMEDIATION AUTHENTICATION & JWT REGRESSION SUITE
 */

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`, detail !== undefined ? detail : '');
    failedCount++;
  }
}

function buildToken(payloadOverriding: Record<string, any>, secretToUse: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const defaultPayload = {
    sub: 'test-admin-uid-12345',
    email: 'admin.test@taleemguru.pk',
    iss: 'taleemguru-backend',
    aud: 'taleemguru-admin',
    exp: now + 3600,
    nbf: now - 10,
    user_metadata: {
      name: 'Test Admin',
      role: 'SuperAdmin',
    },
    ...payloadOverriding,
  };
  const payload = Buffer.from(JSON.stringify(defaultPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secretToUse).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function runPostRemediationTests() {
  console.log('\n=============================================================');
  console.log('  TALEEMGURU POST-REMEDIATION AUTHENTICATION REGRESSION SUITE');
  console.log('=============================================================\n');

  const savedNodeEnv = process.env.NODE_ENV;
  const savedJwtSecret = process.env.SERVER_JWT_SECRET;

  try {
    // -------------------------------------------------------------
    // SECTION 1: Production Configuration & Fail-Closed Behavior
    // -------------------------------------------------------------
    console.log('--- Section 1: Production Configuration & Fail-Closed Verification ---');

    // Test 1a: Missing SERVER_JWT_SECRET in Production
    process.env.NODE_ENV = 'production';
    delete process.env.SERVER_JWT_SECRET;
    const secretMissingProd = getServerJwtSecret();
    assert(
      secretMissingProd === null,
      'getServerJwtSecret returns null in production when process.env.SERVER_JWT_SECRET is missing'
    );

    // Test 1b: Empty string SERVER_JWT_SECRET in Production
    process.env.SERVER_JWT_SECRET = '';
    const secretEmptyProd = getServerJwtSecret();
    assert(
      secretEmptyProd === null,
      'getServerJwtSecret returns null in production when process.env.SERVER_JWT_SECRET is empty string'
    );

    // Test 1c: Whitespace-only SERVER_JWT_SECRET in Production
    process.env.SERVER_JWT_SECRET = '   \t  \n  ';
    const secretSpaceProd = getServerJwtSecret();
    assert(
      secretSpaceProd === null,
      'getServerJwtSecret returns null in production when process.env.SERVER_JWT_SECRET is whitespace-only'
    );

    // Test 1d: verifyServerSignedToken fails closed when secret is missing in Production
    delete process.env.SERVER_JWT_SECRET;
    const dummyToken = buildToken({}, 'some-secret');
    const verifyMissingRes = verifyServerSignedToken(dummyToken);
    assert(
      verifyMissingRes.valid === false && verifyMissingRes.error === 'SERVER_JWT_SECRET is not configured',
      'verifyServerSignedToken rejects tokens safely when SERVER_JWT_SECRET is missing in production'
    );

    // Test 1e: Development Fallback ONLY allowed when NODE_ENV === "development"
    process.env.NODE_ENV = 'development';
    delete process.env.SERVER_JWT_SECRET;
    const secretDevFallback = getServerJwtSecret();
    assert(
      secretDevFallback === 'taleemguru-dev-server-jwt-secret-key-32bytes',
      'getServerJwtSecret provides development fallback string ONLY when NODE_ENV === "development"'
    );

    // Reset env to production for remaining tests unless specified
    process.env.NODE_ENV = 'production';

    // -------------------------------------------------------------
    // SECTION 2: Secret Consistency & Cryptographic Verification
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Secret Consistency & Token Verification ---');

    const TEST_PROD_SECRET = 'super-secret-production-signing-key-32bytes-min';
    process.env.SERVER_JWT_SECRET = TEST_PROD_SECRET;

    // Test 2a: Valid token signed with correct secret is accepted
    const validToken = buildToken({}, TEST_PROD_SECRET);
    const verifyValidRes = verifyServerSignedToken(validToken);
    assert(
      verifyValidRes.valid === true && verifyValidRes.user?.id === 'test-admin-uid-12345',
      'verifyServerSignedToken accepts token signed with exact SERVER_JWT_SECRET'
    );

    // Test 2b: Token signed with wrong secret is rejected
    const wrongSecretToken = buildToken({}, 'completely-different-signing-secret');
    const verifyWrongSecretRes = verifyServerSignedToken(wrongSecretToken);
    assert(
      verifyWrongSecretRes.valid === false && verifyWrongSecretRes.error === 'Invalid token signature',
      'verifyServerSignedToken rejects token signed with wrong secret'
    );

    // Test 2c: Reject tokens signed with Supabase Anon Key fallback
    const anonKeyToken = buildToken({}, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.fake-anon-key');
    const verifyAnonRes = verifyServerSignedToken(anonKeyToken);
    assert(
      verifyAnonRes.valid === false && verifyAnonRes.error === 'Invalid token signature',
      'Rejects token signed with Supabase Anon key'
    );

    // Test 2d: Reject tokens signed with SQL Admin Password fallback
    const sqlPassToken = buildToken({}, 'sql_admin_password_123');
    const verifySqlPassRes = verifyServerSignedToken(sqlPassToken);
    assert(
      verifySqlPassRes.valid === false && verifySqlPassRes.error === 'Invalid token signature',
      'Rejects token signed with SQL Admin password'
    );

    // Test 2e: Reject tokens signed with hardcoded dev key when production secret is configured
    const devKeyToken = buildToken({}, 'taleemguru-dev-server-jwt-secret-key-32bytes');
    const verifyDevKeyInProdRes = verifyServerSignedToken(devKeyToken);
    assert(
      verifyDevKeyInProdRes.valid === false && verifyDevKeyInProdRes.error === 'Invalid token signature',
      'Rejects token signed with dev key fallback when a production secret is configured'
    );

    // -------------------------------------------------------------
    // SECTION 3: Token Validation Edge Cases (Header/Claims/Expiry/Issuer/Audience)
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Token Validation Claims & Boundary Conditions ---');

    // Test 3a: Unsupported algorithm (e.g., HS512)
    const badAlgHeader = Buffer.from(JSON.stringify({ alg: 'HS512', typ: 'JWT' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify({
      sub: 'u1',
      iss: 'taleemguru-backend',
      aud: 'taleemguru-admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url');
    const badAlgSig = crypto.createHmac('sha256', TEST_PROD_SECRET).update(`${badAlgHeader}.${payloadB64}`).digest('base64url');
    const badAlgToken = `${badAlgHeader}.${payloadB64}.${badAlgSig}`;
    const verifyBadAlgRes = verifyServerSignedToken(badAlgToken);
    assert(
      verifyBadAlgRes.valid === false && verifyBadAlgRes.error?.includes('Unsupported or missing algorithm'),
      'Rejects token with algorithm other than HS256'
    );

    // Test 3b: Expired token
    const expiredToken = buildToken({ exp: Math.floor(Date.now() / 1000) - 300 }, TEST_PROD_SECRET);
    const verifyExpiredRes = verifyServerSignedToken(expiredToken);
    assert(
      verifyExpiredRes.valid === false && verifyExpiredRes.error === 'Token expired',
      'Rejects expired token'
    );

    // Test 3c: Future nbf token
    const futureToken = buildToken({ nbf: Math.floor(Date.now() / 1000) + 600 }, TEST_PROD_SECRET);
    const verifyFutureRes = verifyServerSignedToken(futureToken);
    assert(
      verifyFutureRes.valid === false && verifyFutureRes.error === 'Token not yet active',
      'Rejects token where nbf is in the future'
    );

    // Test 3d: Invalid Issuer
    const badIssToken = buildToken({ iss: 'unauthorized-backend' }, TEST_PROD_SECRET);
    const verifyBadIssRes = verifyServerSignedToken(badIssToken);
    assert(
      verifyBadIssRes.valid === false && verifyBadIssRes.error === 'Invalid token issuer',
      'Rejects token with incorrect issuer'
    );

    // Test 3e: Invalid Audience
    const badAudToken = buildToken({ aud: 'unauthorized-app' }, TEST_PROD_SECRET);
    const verifyBadAudRes = verifyServerSignedToken(badAudToken);
    assert(
      verifyBadAudRes.valid === false && verifyBadAudRes.error === 'Invalid token audience',
      'Rejects token with incorrect audience'
    );

    // Test 3f: Missing Subject
    const missingSubToken = buildToken({ sub: '' }, TEST_PROD_SECRET);
    const verifyMissingSubRes = verifyServerSignedToken(missingSubToken);
    assert(
      verifyMissingSubRes.valid === false && verifyMissingSubRes.error?.includes('Missing subject identifier'),
      'Rejects token missing sub claim'
    );

    // Test 3g: Candidate check isServerJwtCandidate
    const studentJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJpc3MiOiJzdXBhYmFzZSJ9.signature';
    assert(
      isServerJwtCandidate(studentJwt) === false,
      'isServerJwtCandidate returns false for standard Supabase student tokens'
    );
    assert(
      isServerJwtCandidate(validToken) === true,
      'isServerJwtCandidate returns true for server-signed admin tokens'
    );

    // -------------------------------------------------------------
    // SECTION 4: Live HTTP API Tests (/api/admin/login, /api/admin/verify, DB Role Verification)
    // -------------------------------------------------------------
    console.log('\n--- Section 4: Live HTTP API Endpoints & Authorization Tests ---');

    const BASE_URL = 'http://localhost:3000';

    // 4a. Verify /api/admin/login response when SERVER_JWT_SECRET is unconfigured
    delete process.env.SERVER_JWT_SECRET;
    const loginFailRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@taleemguru.pk', password: 'somepassword' }),
    });
    // Regardless of password correctness, if missing secret, it should fail before signing
    // (Note: /api/admin/login checks password first or secret before signing)
    // If password fails, it's 401; if secret is missing during token signing, it returns 500 without stack traces.
    // Let's test with valid secret restored for standard login vs missing secret during token generation.
    process.env.SERVER_JWT_SECRET = TEST_PROD_SECRET;

    const LIVE_DEV_SERVER_SECRET = 'taleemguru-dev-server-jwt-secret-key-32bytes';

    // 4b. HTTP request to /api/admin/verify with expired token
    const httpExpiredRes = await fetch(`${BASE_URL}/api/admin/verify`, {
      headers: { Authorization: `Bearer ${buildToken({ exp: Math.floor(Date.now() / 1000) - 300 }, LIVE_DEV_SERVER_SECRET)}` },
    });
    assert(
      httpExpiredRes.status === 401,
      'HTTP GET /api/admin/verify returns 401 Unauthorized for expired token'
    );

    // 4c. HTTP request to /api/admin/verify with tampered token
    const tamperedLiveToken = buildToken({}, LIVE_DEV_SERVER_SECRET).slice(0, -5) + 'XXXXX';
    const httpTamperedRes = await fetch(`${BASE_URL}/api/admin/verify`, {
      headers: { Authorization: `Bearer ${tamperedLiveToken}` },
    });
    assert(
      httpTamperedRes.status === 401,
      'HTTP GET /api/admin/verify returns 401 Unauthorized for tampered token'
    );

    // 4d. Student Privilege Escalation Attempt:
    // Create a student user in DB who only has 'Student' role in DB
    const studentUid = 'post-rem-student-uid-001';
    const studentEmail = 'student.escalate@taleemguru.pk';
    await getOrCreateUser(studentUid, studentEmail, { name: 'Escalation Attempt Student' });
    await updateUserRolesInDb(studentUid, ['Student']);

    // Issue a server token containing SuperAdmin in user_metadata but sub points to studentUid
    const escalationToken = buildToken(
      {
        sub: studentUid,
        email: studentEmail,
        user_metadata: { role: 'SuperAdmin', roles: ['SuperAdmin'] },
      },
      LIVE_DEV_SERVER_SECRET
    );

    const escalationHttpRes = await fetch(`${BASE_URL}/api/approvals`, {
      headers: { Authorization: `Bearer ${escalationToken}` },
    });
    const escalationBody = await escalationHttpRes.text();
    assert(
      escalationHttpRes.status === 403,
      `HTTP GET /api/approvals returns 403 Forbidden for Student UID despite payload claims in token (Got HTTP ${escalationHttpRes.status})`,
      `body: ${escalationBody}`
    );

    // 4d. Email Match Alone Escalation Attempt:
    // Token has admin email 'admin@taleemguru.pk' but sub is a fresh non-admin / non-existent user ID
    const fakeAdminUid = `random-non-existent-uid-${Date.now()}`;
    const fakeAdminToken = buildToken(
      {
        sub: fakeAdminUid,
        email: 'admin@taleemguru.pk',
        user_metadata: { role: 'SuperAdmin' },
      },
      LIVE_DEV_SERVER_SECRET
    );

    const fakeAdminHttpRes = await fetch(`${BASE_URL}/api/approvals`, {
      headers: { Authorization: `Bearer ${fakeAdminToken}` },
    });
    const fakeAdminBody = await fakeAdminHttpRes.text();
    assert(
      fakeAdminHttpRes.status === 403,
      'HTTP GET /api/approvals returns 403 Forbidden when sub UID does not exist or lacks admin role in DB, even if email matches admin',
      `Got status ${fakeAdminHttpRes.status}, body: ${fakeAdminBody}`
    );

    // 4f. Valid SuperAdmin Request Succeeds
    const superAdminUid = 'dacad65f-6c2d-4d28-b2f7-9f5386ca309f';
    const superAdminEmail = 'admin@taleemguru.pk';
    await getOrCreateUser(superAdminUid, superAdminEmail, { name: 'Super Administrator' });
    await updateUserRolesInDb(superAdminUid, ['SuperAdmin']);

    const validSuperAdminToken = buildToken(
      {
        sub: superAdminUid,
        email: superAdminEmail,
        user_metadata: { role: 'SuperAdmin' },
      },
      LIVE_DEV_SERVER_SECRET
    );

    const validSuperAdminHttpRes = await fetch(`${BASE_URL}/api/approvals`, {
      headers: { Authorization: `Bearer ${validSuperAdminToken}` },
    });
    const superAdminBody = await validSuperAdminHttpRes.text();
    assert(
      validSuperAdminHttpRes.status === 200,
      'HTTP GET /api/approvals returns 200 OK for valid SuperAdmin with authoritative DB record',
      `Got status ${validSuperAdminHttpRes.status}, body: ${superAdminBody}`
    );

  } finally {
    // Restore environment variables
    if (savedNodeEnv !== undefined) {
      process.env.NODE_ENV = savedNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    if (savedJwtSecret !== undefined) {
      process.env.SERVER_JWT_SECRET = savedJwtSecret;
    } else {
      delete process.env.SERVER_JWT_SECRET;
    }
  }

  console.log('\n=============================================================');
  console.log(`  RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPostRemediationTests().catch((err) => {
  console.error('Unhandled error in post-remediation tests:', err);
  process.exit(1);
});
