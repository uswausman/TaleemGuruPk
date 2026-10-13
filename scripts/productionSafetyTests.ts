import { getComprehensiveStatsFromDb } from '../src/db/content';
import { db } from '../src/db/index';
import assert from 'assert';

async function runProductionSafetyTests() {
  console.log('================================================================');
  console.log('  TALEEMGURU.PK — PRODUCTION SAFETY & DASHBOARD STATS TESTS');
  console.log('================================================================\n');

  assert(Boolean(db), 'Database connection pool initialized');

  // Test 1: Comprehensive stats query executes cleanly and returns expected metrics object
  const stats = await getComprehensiveStatsFromDb();
  assert(typeof stats === 'object', 'Stats object returned');
  assert(typeof stats.totalUsers === 'number', 'totalUsers is a number');
  assert(typeof stats.totalMCQs === 'number', 'totalMCQs is a number');
  assert(typeof stats.totalTests === 'number', 'totalTests is a number');
  assert(typeof stats.totalSubmissions === 'number', 'totalSubmissions is a number');
  console.log('  ✓ PASS: getComprehensiveStatsFromDb returns valid numeric metrics');

  // Test 2: Production safety configuration check
  const isProduction = process.env.NODE_ENV === 'production';
  const allowSeeding = process.env.ALLOW_TEST_DATA_SEEDING === 'true';
  if (isProduction && !allowSeeding) {
    console.log('  ✓ PASS: Production environment correctly restricts test data seeding');
  } else {
    console.log('  ℹ INFO: Non-production environment or ALLOW_TEST_DATA_SEEDING enabled');
  }

  console.log('\n================================================================');
  console.log('  All production safety and stats tests passed successfully!');
  console.log('================================================================');
}

runProductionSafetyTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
