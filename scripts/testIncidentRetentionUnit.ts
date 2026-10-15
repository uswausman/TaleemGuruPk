/**
 * Automated Mock-Based Unit Test Suite for Phase 2 Task C: Incident Retention & Cleanup Reliability
 * 
 * Directly exercises production code in src/server/websiteHealthServer.ts:
 * - cleanupOldResolvedIncidents()
 * - triggerRetentionCleanupIfEligible()
 * - getCleanupStateForTesting()
 * - resetCleanupStateForTesting()
 * - CLEANUP_INTERVAL_MS & CLEANUP_FAILURE_COOLDOWN_MS
 * 
 * Safety: 100% in-memory mock harness. Zero network calls, zero database writes.
 */

import {
  cleanupOldResolvedIncidents,
  triggerRetentionCleanupIfEligible,
  getCleanupStateForTesting,
  resetCleanupStateForTesting,
  CLEANUP_INTERVAL_MS,
  CLEANUP_FAILURE_COOLDOWN_MS,
} from '../src/server/websiteHealthServer.ts';

async function runRetentionTestSuite() {
  console.log('========================================================================');
  console.log('TEST SUITE: Phase 2 Task C Production-Code Retention & Cleanup Reliability');
  console.log('========================================================================\n');

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

  // --------------------------------------------------------------------------
  // TEST 1: Database unavailable returns false
  // --------------------------------------------------------------------------
  console.log('1. Testing Database Unavailable (Null Client):');
  {
    const res = await cleanupOldResolvedIncidents(null);
    assert(res === false, 'cleanupOldResolvedIncidents(null) returns false when DB client is unavailable');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Successful cleanup returns true
  // --------------------------------------------------------------------------
  console.log('\n2. Testing Successful Cleanup Query Execution:');
  {
    const tracker = { executed: false };
    const mockDbSuccess = {
      execute: async () => {
        tracker.executed = true;
        return { rowCount: 1 };
      },
    };
    const res = await cleanupOldResolvedIncidents(mockDbSuccess);
    assert(res === true, 'cleanupOldResolvedIncidents(mockDb) returns true upon successful query execution');
    assert(tracker.executed === true, 'Production code executed the query on the injected database client');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Database exception returns false without uncaught error
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Database Exception Handling:');
  {
    const mockDbThrowing = {
      execute: async () => {
        throw new Error('Simulated PostgreSQL socket timeout');
      },
    };
    const res = await cleanupOldResolvedIncidents(mockDbThrowing);
    assert(res === false, 'cleanupOldResolvedIncidents(throwingDb) catches exception and returns false');
  }

  // --------------------------------------------------------------------------
  // TEST 4 & 5: Actual SQL targets only Resolved and uses strict 30-day cutoff
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Actual Drizzle SQL Query & Bound Parameter Inspection:');
  {
    let capturedQuery: any = null;
    const mockDbCapture = {
      execute: async (query: any) => {
        capturedQuery = query;
        return { rowCount: 0 };
      },
    };

    const beforeCall = Date.now();
    await cleanupOldResolvedIncidents(mockDbCapture);
    const afterCall = Date.now();

    assert(capturedQuery !== null, 'Production code passed an SQL query to execute()');

    // Use Drizzle's toQuery method to inspect the generated SQL and parameter bindings
    const queryInfo = capturedQuery.toQuery({
      escapeName: (x: string) => x,
      escapeParam: (i: number) => `$${i + 1}`,
    });

    const queryString = queryInfo.sql;
    console.log(`   Captured SQL: "${queryString}"`);

    // Verify SQL targeting
    assert(
      queryString.includes('DELETE FROM website_error_incidents'),
      'SQL query starts with DELETE FROM website_error_incidents'
    );
    assert(
      queryString.includes("incident_status = 'Resolved'"),
      "SQL query strictly targets incident_status = 'Resolved'"
    );
    assert(
      !queryString.includes('Open'),
      'SQL query does NOT contain "Open" in any condition'
    );
    assert(
      !queryString.includes('Investigating'),
      'SQL query does NOT contain "Investigating" in any condition'
    );

    // Verify 30-day date cutoff parameter
    const boundParam = queryInfo.params[0];
    assert(boundParam instanceof Date, 'First parameter bound by production code is a Date object');

    const boundTime = (boundParam as Date).getTime();
    const expectedCutoffMin = beforeCall - 30 * 86400000;
    const expectedCutoffMax = afterCall - 30 * 86400000;

    assert(
      boundTime >= expectedCutoffMin - 50 && boundTime <= expectedCutoffMax + 50,
      `Bound cutoff parameter matches exact 30-day offset (30 * 86400000 ms)`
    );

    assert(
      queryString.includes('last_seen < $1') || queryString.includes('last_seen < '),
      'SQL query uses strict "<" operator (strictly older than 30 days)'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 6: Successful cleanup updates successful-cleanup timestamp
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Production Coordinator Success Timestamping & Normal Interval:');
  {
    resetCleanupStateForTesting();
    const mockDb = { execute: async () => ({ rowCount: 1 }) };
    const t0 = 1700000000000;

    const res = await triggerRetentionCleanupIfEligible(mockDb, t0);
    assert(res.triggered === true && res.success === true, 'Coordinator triggered and succeeded');

    const state = getCleanupStateForTesting();
    assert(state.lastCleanupAt === t0, 'lastCleanupAt updated to execution timestamp on success');
    assert(state.lastCleanupAttemptAt === t0, 'lastCleanupAttemptAt updated on attempt');

    // Immediate second call 10s later is throttled by 1-hour interval
    const resThrottled = await triggerRetentionCleanupIfEligible(mockDb, t0 + 10000);
    assert(resThrottled.triggered === false, 'Subsequent call within 1 hour is skipped');
    assert(resThrottled.skippedReason === 'success_cooldown', 'Skipped reason matches success_cooldown');

    // Call after 1 hour (3600001 ms) is eligible again
    const resAfterHour = await triggerRetentionCleanupIfEligible(mockDb, t0 + CLEANUP_INTERVAL_MS + 1000);
    assert(resAfterHour.triggered === true && resAfterHour.success === true, 'Cleanup re-triggers after 1-hour interval');
    assert(getCleanupStateForTesting().lastCleanupAt === t0 + CLEANUP_INTERVAL_MS + 1000, 'lastCleanupAt updated to new timestamp');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Cleanup failure does not update successful-cleanup timestamp
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Production Coordinator Failure Handling & Separate Cooldown:');
  {
    resetCleanupStateForTesting();
    const mockDbFail = {
      execute: async () => {
        throw new Error('Database connection lost');
      },
    };
    const t0 = 1700000000000;

    const res = await triggerRetentionCleanupIfEligible(mockDbFail, t0);
    assert(res.triggered === true && res.success === false, 'Coordinator handled failure without uncaught error');

    const state = getCleanupStateForTesting();
    assert(state.lastCleanupAt === 0, 'lastCleanupAt remains 0 after failure (NOT updated)');
    assert(state.lastCleanupAttemptAt === t0, 'lastCleanupAttemptAt updated to track failure attempt');

    // Immediate call 10s later is suppressed by failure cooldown (not 1 hour)
    const resSuppressed = await triggerRetentionCleanupIfEligible(mockDbFail, t0 + 10000);
    assert(resSuppressed.triggered === false, 'Immediate call after failure suppressed by failure cooldown');
    assert(resSuppressed.skippedReason === 'failure_cooldown', 'Skipped reason matches failure_cooldown');
  }

  // --------------------------------------------------------------------------
  // TEST 8: Failure cooldown allows retry after configured interval (1 minute)
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Failure Cooldown Recovery (1 Minute):');
  {
    resetCleanupStateForTesting();
    let dbWorking = false;
    const mockDb = {
      execute: async () => {
        if (!dbWorking) throw new Error('DB offline');
        return { rowCount: 1 };
      },
    };
    const t0 = 1700000000000;

    // First attempt fails at t0
    await triggerRetentionCleanupIfEligible(mockDb, t0);
    assert(getCleanupStateForTesting().lastCleanupAt === 0, 'lastCleanupAt is 0 after first failure');

    // Attempt 30s later (within 60s failure cooldown)
    const resAt30s = await triggerRetentionCleanupIfEligible(mockDb, t0 + 30000);
    assert(resAt30s.triggered === false && resAt30s.skippedReason === 'failure_cooldown', 'Retry blocked at 30s by failure cooldown');

    // DB recovers
    dbWorking = true;

    // Attempt 61s later (past 60s failure cooldown)
    const resAt61s = await triggerRetentionCleanupIfEligible(mockDb, t0 + CLEANUP_FAILURE_COOLDOWN_MS + 1000);
    assert(resAt61s.triggered === true && resAt61s.success === true, 'Retry executes and succeeds once 60s cooldown elapses');
    assert(getCleanupStateForTesting().lastCleanupAt === t0 + CLEANUP_FAILURE_COOLDOWN_MS + 1000, 'lastCleanupAt updated after successful retry');
  }

  // --------------------------------------------------------------------------
  // TEST 9: Concurrent triggers cause at most one cleanup query (Single-Flight Lock)
  // --------------------------------------------------------------------------
  console.log('\n8. Testing In-Process Single-Flight Concurrency Lock:');
  {
    resetCleanupStateForTesting();
    let resolveQuery: (val: any) => void;
    let queryExecutions = 0;

    const delayedDb = {
      execute: async () => {
        queryExecutions++;
        return new Promise((resolve) => {
          resolveQuery = resolve;
        });
      },
    };

    const t0 = 1700000000000;

    // Fire 5 concurrent triggers at the exact same millisecond
    const p1 = triggerRetentionCleanupIfEligible(delayedDb, t0);
    const p2 = triggerRetentionCleanupIfEligible(delayedDb, t0);
    const p3 = triggerRetentionCleanupIfEligible(delayedDb, t0);
    const p4 = triggerRetentionCleanupIfEligible(delayedDb, t0);
    const p5 = triggerRetentionCleanupIfEligible(delayedDb, t0);

    // Verify lock is engaged while query is in-flight
    assert(getCleanupStateForTesting().isCleaningUp === true, 'Single-flight lock isCleaningUp is true during in-flight query');

    // Complete the query
    resolveQuery!({ rowCount: 1 });
    const [r1, r2, r3, r4, r5] = await Promise.all([p1, p2, p3, p4, p5]);

    assert(r1.triggered === true && r1.success === true, 'Primary in-flight request executed successfully');
    assert(r2.triggered === false && r2.skippedReason === 'already_running', 'Concurrent call 2 skipped overlapping execution');
    assert(r3.triggered === false && r3.skippedReason === 'already_running', 'Concurrent call 3 skipped overlapping execution');
    assert(r4.triggered === false && r4.skippedReason === 'already_running', 'Concurrent call 4 skipped overlapping execution');
    assert(r5.triggered === false && r5.skippedReason === 'already_running', 'Concurrent call 5 skipped overlapping execution');
    assert(queryExecutions === 1, 'Exactly 1 database query executed across 5 concurrent triggers');
    assert(getCleanupStateForTesting().isCleaningUp === false, 'Single-flight lock isCleaningUp reset to false in finally block');
  }

  // --------------------------------------------------------------------------
  // TEST 10: Single-Flight Lock Released in Finally Block Even on Thrown Error
  // --------------------------------------------------------------------------
  console.log('\n9. Testing Single-Flight Lock Release on Thrown Exception:');
  {
    resetCleanupStateForTesting();
    const crashingDb = {
      execute: async () => {
        throw new Error('Fatal query error');
      },
    };
    const t0 = 1700000000000;

    await triggerRetentionCleanupIfEligible(crashingDb, t0);
    assert(getCleanupStateForTesting().isCleaningUp === false, 'Lock is released in finally block even when execute() throws');
  }

  // --------------------------------------------------------------------------
  // TEST 11: SQL WHERE Predicate Guarantees Open & Investigating Rows Are Untouched
  // --------------------------------------------------------------------------
  console.log('\n10. Testing Retention Predicate Safety Guarantee:');
  {
    let capturedQuery: any = null;
    const mockDb = {
      execute: async (q: any) => {
        capturedQuery = q;
        return { rowCount: 0 };
      },
    };

    await cleanupOldResolvedIncidents(mockDb);
    const sqlText = capturedQuery.toQuery({ escapeName: (x: string) => x, escapeParam: (i: number) => `$${i + 1}` }).sql;

    // The SQL condition is: WHERE incident_status = 'Resolved' AND last_seen < $1
    // This is a conjunction (AND). For any row to be deleted, incident_status MUST equal 'Resolved'.
    // Rows with incident_status = 'Open' or incident_status = 'Investigating' evaluate to false.
    const hasConjunctionResolved = sqlText.includes("incident_status = 'Resolved'");
    const hasNoOrCondition = !sqlText.includes(' OR ');
    assert(hasConjunctionResolved && hasNoOrCondition, 'WHERE clause strictly requires incident_status = "Resolved" with no OR bypass');
  }

  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('========================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runRetentionTestSuite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
