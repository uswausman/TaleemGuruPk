import { recordLiveError, updateErrorStatus } from '../src/server/websiteHealthServer.ts';
import { db } from '../src/db/index.ts';
import { websiteErrorIncidents } from '../src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';

async function runConcurrentTest() {
  console.log('====================================================');
  console.log('STARTING ATOMIC CONCURRENT DEDUPLICATION QA TEST');
  console.log('====================================================\n');

  if (!db) {
    console.error('Database connection not available for test. Skipping.');
    process.exit(1);
  }

  const testId = Date.now();
  const testRoute = `/api/test/concurrent-dedup-${testId}`;
  const testMessage = `Concurrent stress test failure ${testId}`;

  console.log(`1. Firing 25 simultaneous identical error events for route: ${testRoute}...`);

  // Fire 25 concurrent recordLiveError requests
  const promises = [];
  for (let i = 0; i < 25; i++) {
    promises.push(
      recordLiveError({
        severity: 'CRITICAL',
        category: 'API',
        method: 'POST',
        statusCode: 500,
        route: testRoute,
        errorMessage: testMessage,
      })
    );
  }

  await Promise.all(promises);

  console.log('   All 25 concurrent requests resolved.');

  // Verify single row and occurrence count
  const rows = await db
    .select()
    .from(websiteErrorIncidents)
    .where(eq(websiteErrorIncidents.route, testRoute));

  console.log(`   Rows matching route: ${rows.length} (Expected: 1)`);
  if (rows.length !== 1) {
    console.error(`[FAIL] Expected exactly 1 row, but found ${rows.length}`);
    process.exit(1);
  }

  const record = rows[0];
  console.log(`   Occurrence Count: ${record.occurrenceCount} (Expected: 25)`);
  console.log(`   Incident Status: ${record.incidentStatus} (Expected: Open)`);

  if (record.occurrenceCount !== 25) {
    console.error(`[FAIL] Expected occurrenceCount to be 25, got ${record.occurrenceCount}`);
    process.exit(1);
  }

  // 2. Test reopening resolved incident
  console.log('\n2. Marking incident as Resolved and testing automatic reopening...');
  const updated = await updateErrorStatus(record.id, 'Resolved', 'test-admin@taleemguru.pk');
  if (!updated) {
    console.error('[FAIL] Could not mark incident as Resolved.');
    process.exit(1);
  }

  const resolvedRows = await db
    .select()
    .from(websiteErrorIncidents)
    .where(eq(websiteErrorIncidents.id, record.id));
  console.log(`   Current Status after resolve update: ${resolvedRows[0].incidentStatus} (Expected: Resolved)`);

  console.log('   Firing new error event for the resolved incident...');
  await recordLiveError({
    severity: 'CRITICAL',
    category: 'API',
    method: 'POST',
    statusCode: 500,
    route: testRoute,
    errorMessage: testMessage,
  });

  const reopenedRows = await db
    .select()
    .from(websiteErrorIncidents)
    .where(eq(websiteErrorIncidents.id, record.id));

  const reopenedRecord = reopenedRows[0];
  console.log(`   Status after new occurrence: ${reopenedRecord.incidentStatus} (Expected: Open)`);
  console.log(`   New Occurrence Count: ${reopenedRecord.occurrenceCount} (Expected: 26)`);

  if (reopenedRecord.incidentStatus !== 'Open' || reopenedRecord.occurrenceCount !== 26) {
    console.error(`[FAIL] Reopen check failed. Status: ${reopenedRecord.incidentStatus}, Count: ${reopenedRecord.occurrenceCount}`);
    process.exit(1);
  }

  // Clean up isolated test row
  console.log('\n3. Cleaning up test record...');
  await db.delete(websiteErrorIncidents).where(eq(websiteErrorIncidents.id, record.id));
  console.log('   Test record cleaned up.');

  console.log('\n====================================================');
  console.log('ATOMIC CONCURRENT DEDUPLICATION QA TEST PASSED (100%)');
  console.log('====================================================');
  process.exit(0);
}

runConcurrentTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
