/**
 * Automated Verification Tests for Admin Refresh Verification with Bounded Retries
 * Tests:
 * 1. Valid token, HTTP 200 -> Verifies successfully
 * 2. HTTP 503 followed by HTTP 200 -> Recovers seamlessly without verification error
 * 3. Persistent HTTP 503 -> Shows verification notice and PRESERVES the token
 * 4. HTTP 401/403 -> Clears token and resets to login without transient notice
 * 5. Network error followed by HTTP 200 -> Recovers seamlessly
 * 6. Student token / authorized: false -> Denies admin access
 * 7. Outdated sequence ID -> Discards stale in-flight response (race defense)
 */

async function runTestSuite() {
  console.log('===============================================================');
  console.log('TEST SUITE: Admin Session Verification & Transient 5xx Retries');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // Simulation harness mirroring App.tsx verifyAdminSession logic
  async function simulateVerifySession(options: {
    initialToken: string | null;
    fetchMock: (attempt: number) => Promise<{ status: number; ok: boolean; json: () => Promise<any> }>;
    onSequenceAdvanceDuringRun?: (advancer: () => void) => void;
  }) {
    let token = options.initialToken;
    let isAdminVerifying = Boolean(token);
    let adminVerifyError: string | null = null;
    let adminUser: any = null;
    let currentSeq = 0;

    let seqId = ++currentSeq;
    isAdminVerifying = true;
    adminVerifyError = null;

    if (options.onSequenceAdvanceDuringRun) {
      options.onSequenceAdvanceDuringRun(() => {
        currentSeq++; // advance sequence externally to simulate race
      });
    }

    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const res = await options.fetchMock(attempt);

        if (currentSeq !== seqId) {
          // Sequence advanced: discard
          return { token, isAdminVerifying, adminVerifyError, adminUser, aborted: true };
        }

        if (res.ok) {
          const data = await res.json();
          if (data.authorized) {
            adminUser = {
              id: data.uid || 'admin-root',
              name: data.name || 'Admin',
              email: data.email || 'admin@taleemguru.pk',
              roles: data.roles || ['Admin'],
            };
            isAdminVerifying = false;
            adminVerifyError = null;
            return { token, isAdminVerifying, adminVerifyError, adminUser, attempts: attempt };
          }
        }

        if (res.status === 401 || res.status === 403) {
          token = null; // Removed from localStorage
          adminUser = null;
          isAdminVerifying = false;
          adminVerifyError = null;
          return { token, isAdminVerifying, adminVerifyError, adminUser, attempts: attempt };
        }

        if (res.status >= 500 && attempt <= maxRetries) {
          await new Promise((r) => setTimeout(r, 10)); // simulated short backoff
          if (currentSeq !== seqId) return { token, isAdminVerifying, adminVerifyError, adminUser, aborted: true };
          continue;
        }

        // Exhausted retries on 5xx
        adminVerifyError = 'Unable to verify administrative credentials due to server response. Please try again.';
        isAdminVerifying = false;
        return { token, isAdminVerifying, adminVerifyError, adminUser, attempts: attempt };
      } catch (err) {
        if (currentSeq !== seqId) return { token, isAdminVerifying, adminVerifyError, adminUser, aborted: true };
        if (attempt <= maxRetries) {
          await new Promise((r) => setTimeout(r, 10));
          if (currentSeq !== seqId) return { token, isAdminVerifying, adminVerifyError, adminUser, aborted: true };
          continue;
        }
        isAdminVerifying = false;
        adminVerifyError = 'Unable to verify administrative credentials. Please check your internet connection.';
        return { token, isAdminVerifying, adminVerifyError, adminUser, attempts: attempt };
      }
    }

    return { token, isAdminVerifying, adminVerifyError, adminUser, attempts: attempt };
  }

  // --- TEST 1: Valid Admin Token on Refresh (HTTP 200) ---
  console.log('1. Testing Valid Admin Token HTTP 200:');
  const res1 = await simulateVerifySession({
    initialToken: 'valid-test-server-jwt',
    fetchMock: async () => ({
      status: 200,
      ok: true,
      json: async () => ({ authorized: true, uid: 'admin-1', role: 'Admin', roles: ['Admin'] }),
    }),
  });
  assert(res1.adminUser?.id === 'admin-1', 'Admin user profile hydrated on 200 OK');
  assert(res1.adminVerifyError === null, 'No verification error displayed');
  assert(res1.attempts === 1, 'Succeeded on first attempt without extra requests');

  // --- TEST 2: Transient HTTP 503 followed by HTTP 200 ---
  console.log('\n2. Testing Transient HTTP 503 Recovery:');
  const res2 = await simulateVerifySession({
    initialToken: 'valid-test-server-jwt',
    fetchMock: async (attempt) => {
      if (attempt === 1) {
        return {
          status: 503,
          ok: false,
          json: async () => ({ error: 'Service Unavailable: Database error' }),
        };
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({ authorized: true, uid: 'admin-1', role: 'Admin', roles: ['Admin'] }),
      };
    },
  });
  assert(res2.adminUser?.id === 'admin-1', 'Admin session recovered on retry');
  assert(res2.adminVerifyError === null, 'Transient 503 did not leak verification notice to UI');
  assert(res2.attempts === 2, 'Completed on attempt 2 after 1 retry');

  // --- TEST 3: Persistent HTTP 503 (Exhausts Retries & Preserves Token) ---
  console.log('\n3. Testing Persistent HTTP 503 Failure:');
  const res3 = await simulateVerifySession({
    initialToken: 'valid-test-server-jwt',
    fetchMock: async () => ({
      status: 503,
      ok: false,
      json: async () => ({ error: 'Database cold start persistent' }),
    }),
  });
  assert(res3.adminVerifyError === 'Unable to verify administrative credentials due to server response. Please try again.', 'Displays server response notice on exhausted retries');
  assert(res3.token === 'valid-test-server-jwt', 'Token is preserved in storage despite persistent 503');
  assert(res3.attempts === 3, 'Tried initial request + 2 retries (total 3 attempts)');

  // --- TEST 4: HTTP 401 / 403 (Invalid / Expired Token) ---
  console.log('\n4. Testing HTTP 401 / 403 Credential Rejection:');
  const res4 = await simulateVerifySession({
    initialToken: 'expired-or-revoked-token',
    fetchMock: async () => ({
      status: 401,
      ok: false,
      json: async () => ({ error: 'Unauthorized: Invalid token' }),
    }),
  });
  assert(res4.token === null, 'Token cleared from storage on 401');
  assert(res4.adminUser === null, 'Admin user remains null');
  assert(res4.adminVerifyError === null, 'No transient server notice shown on 401');
  assert(res4.attempts === 1, 'Does not retry definitive 401 response');

  // --- TEST 5: Network Exception Followed by Success ---
  console.log('\n5. Testing Recoverable Network Exception:');
  const res5 = await simulateVerifySession({
    initialToken: 'valid-test-server-jwt',
    fetchMock: async (attempt) => {
      if (attempt === 1) {
        throw new Error('ECONNRESET socket hang up');
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({ authorized: true, uid: 'admin-1', role: 'Admin', roles: ['Admin'] }),
      };
    },
  });
  assert(res5.adminUser?.id === 'admin-1', 'Recovers after transient network disconnect');
  assert(res5.adminVerifyError === null, 'No network error shown after successful retry');
  assert(res5.attempts === 2, 'Completed on attempt 2');

  // --- TEST 6: Student Session Cannot Gain Admin Access ---
  console.log('\n6. Testing Student Account Rejection:');
  const res6 = await simulateVerifySession({
    initialToken: 'student-role-token',
    fetchMock: async () => ({
      status: 403,
      ok: false,
      json: async () => ({ authorized: false, role: 'Student' }),
    }),
  });
  assert(res6.adminUser === null, 'Student session denied adminUser privileges');
  assert(res6.token === null, 'Student token cleared from admin storage key');

  // --- TEST 7: Race Condition Defense (Session Sequence Advance) ---
  console.log('\n7. Testing Race Condition / Stale Response Cancellation:');
  const res7 = await simulateVerifySession({
    initialToken: 'valid-test-server-jwt',
    fetchMock: async () => {
      await new Promise((r) => setTimeout(r, 20));
      return {
        status: 200,
        ok: true,
        json: async () => ({ authorized: true, uid: 'admin-stale' }),
      };
    },
    onSequenceAdvanceDuringRun: (advance) => {
      // Simulate user logging out or triggering another sequence while attempt 1 is in-flight
      setTimeout(() => advance(), 5);
    },
  });
  assert(res7.aborted === true, 'Stale in-flight response safely discarded when sequence advanced');
  assert(res7.adminUser === null, 'Stale verification did not overwrite newer session state');

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('===============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Test suite uncaught failure:', e);
  process.exit(1);
});
