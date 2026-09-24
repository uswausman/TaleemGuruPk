import {
  runDatabaseIntegrityCheck,
  generateSystemBackupExport,
} from '../src/db/integrityBackup.ts';
import { db } from '../src/db/index.ts';
import { users, tests } from '../src/db/schema.ts';
import { count } from 'drizzle-orm';

async function runBackupIntegrityTestSuite() {
  console.log('==================================================');
  console.log('  TALEEMGURU BACKUP, RECOVERY & INTEGRITY TESTS');
  console.log('==================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Record initial counts before integrity check (to verify non-destructive behavior)
    const [initialUsersCount] = await db.select({ count: count() }).from(users);
    const [initialTestsCount] = await db.select({ count: count() }).from(tests);

    // TEST 1: Run Database Integrity Check
    const report = await runDatabaseIntegrityCheck();
    assert(
      report &&
        report.timestamp &&
        (report.status === 'HEALTHY' || report.status === 'WARNING') &&
        typeof report.summary.totalUsers === 'number' &&
        typeof report.summary.totalTests === 'number',
      'Test 1: Database integrity check runs successfully and returns structured report'
    );

    // TEST 2: Non-destructive behavior verification
    const [afterUsersCount] = await db.select({ count: count() }).from(users);
    const [afterTestsCount] = await db.select({ count: count() }).from(tests);
    assert(
      initialUsersCount.count === afterUsersCount.count &&
        initialTestsCount.count === afterTestsCount.count,
      'Test 2: Non-destructive verification - running integrity checks never modifies or deletes production data'
    );

    // TEST 3: Orphan record detection fields present
    assert(
      typeof report.checks.orphanTestQuestions === 'number' &&
        typeof report.checks.orphanTestResults === 'number' &&
        typeof report.checks.orphanDocumentVersions === 'number',
      'Test 3: Orphan record detection metrics are fully populated'
    );

    // TEST 4: Document hash verification check present
    assert(
      typeof report.checks.invalidDocumentHashes === 'number',
      'Test 4: Document hash verification checks are included in integrity report'
    );

    // TEST 5: Exam / Result consistency check present
    assert(
      typeof report.checks.examConsistencyErrors === 'number',
      'Test 5: Exam and result consistency checks are executed and reported'
    );

    // TEST 6: Backup / Export generation strategy
    const exportBundle = await generateSystemBackupExport();
    assert(
      exportBundle &&
        exportBundle.version === '1.0' &&
        exportBundle.exportTimestamp &&
        exportBundle.integrityReport &&
        Array.isArray(exportBundle.data.users) &&
        Array.isArray(exportBundle.data.tests),
      'Test 6: Safe backup export generates valid administrative JSON export structure'
    );

    // TEST 7: Sensitive credentials exclusion in backup export
    const exportString = JSON.stringify(exportBundle);
    assert(
      !exportString.includes('password') &&
        !exportString.includes('secret') &&
        !exportString.includes('credential'),
      'Test 7: Backup export never exposes passwords, secrets, or sensitive credentials'
    );

  } catch (error: any) {
    console.error('Unexpected error during backup & integrity tests:', error);
    assert(false, `Unexpected test failure: ${error.message}`);
  }

  console.log('==================================================');
  console.log(`BACKUP & INTEGRITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runBackupIntegrityTestSuite();
