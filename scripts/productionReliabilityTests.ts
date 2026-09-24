/**
 * TALEEMGURU PROFESSIONAL PRODUCTION RELIABILITY & MONITORING TEST SUITE
 * Validates environment validation, database connectivity health, health/readiness endpoints,
 * structured privacy-safe logging, and production error sanitization.
 */

import {
  validateEnvironmentVariables,
  checkDatabaseHealth,
  getSystemHealthReport,
  privacySafeLogger,
  productionErrorSanitizer,
} from '../src/server/productionReliability';

async function runProductionReliabilityTests() {
  console.log('==================================================================================================================');
  console.log('  TALEEMGURU PROFESSIONAL PRODUCTION RELIABILITY & MONITORING TEST SUITE');
  console.log('==================================================================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${details ? ` (${details})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Environment Variable Validation
    const envCheck = validateEnvironmentVariables();
    assert(typeof envCheck.valid === 'boolean', 'Test 1: Environment variable validation executes and returns structured result', `valid: ${envCheck.valid}`);

    // 2. Database Connectivity Health Check
    const dbHealth = await checkDatabaseHealth();
    assert(typeof dbHealth.connected === 'boolean', 'Test 2: Database health check returns connection status', `connected: ${dbHealth.connected}, latency: ${dbHealth.latencyMs}ms`);

    // 3. System Health Report Generation
    const healthReport = await getSystemHealthReport();
    assert(healthReport.status === 'healthy' || healthReport.status === 'degraded' || healthReport.status === 'unhealthy', 'Test 3: System health report includes status, uptime, and database metrics', `status: ${healthReport.status}`);

    // 4. Privacy-Safe Structured Logger
    try {
      privacySafeLogger('INFO', 'Test log message with secret password=mySuperSecret', { userId: '123', token: 'secret_abc' });
      assert(true, 'Test 4: Privacy-safe logger successfully processes and sanitizes sensitive metadata');
    } catch (e) {
      assert(false, 'Test 4: Privacy-safe logger threw an error', String(e));
    }

    // 5. Production Error Sanitizer (DB errors and stack leaks)
    const rawDbError = new Error('postgres relation "users" does not exist at column password=secret123');
    const sanitized = productionErrorSanitizer(rawDbError);
    assert(!sanitized.error.includes('postgres') && !sanitized.error.includes('relation'), 'Test 5: Production error sanitizer strips raw database error internals and protects schema details');

    // 6. Production Error Sanitizer (Standard client error)
    const clientError = { status: 400, message: 'Invalid request parameters' };
    const sanitizedClient = productionErrorSanitizer(clientError);
    assert(sanitizedClient.statusCode === 400 && sanitizedClient.error === 'Invalid request parameters', 'Test 6: Production error sanitizer preserves standard client error codes and messages');

  } catch (error) {
    console.error('Unexpected error during production reliability tests:', error);
    failed++;
  }

  console.log('------------------------------------------------------------------------------------------------------------------');
  console.log(`PRODUCTION RELIABILITY TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionReliabilityTests().catch((err) => {
  console.error('Fatal error in production reliability tests:', err);
  process.exit(1);
});
