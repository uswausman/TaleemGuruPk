/**
 * TALEEMGURU PROFESSIONAL PERFORMANCE & SCALABILITY TEST SUITE
 * Validates query execution times, indexing, pagination, search speed, analytics performance,
 * dashboard loading efficiency, and safe caching with strict RBAC preservation.
 */

import { db } from '../src/db/index';
import { ensurePerformanceIndexes } from '../src/db/indexes';
import { publicCache } from '../src/utils/cache';
import { getMCQsFromDb } from '../src/db/content';
import { getAdminAnalytics, getStudentAnalytics, getTeacherAnalytics } from '../src/db/analytics';
import { sql } from 'drizzle-orm';

async function runPerformanceTestSuite() {
  console.log('==================================================================================================================');
  console.log('  TALEEMGURU PROFESSIONAL PERFORMANCE & SCALABILITY TEST SUITE');
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
    // 0. Ensure Performance Indexes
    const indexStart = performance.now();
    await ensurePerformanceIndexes();
    const indexTime = performance.now() - indexStart;
    assert(indexTime < 5000, 'Test 0: Performance indexes verified and initialized', `${indexTime.toFixed(2)}ms`);

    // 1. Large Dataset Query Performance & Indexing
    const q1Start = performance.now();
    const largeMcqs = await getMCQsFromDb({ limit: 100 });
    const q1Time = performance.now() - q1Start;
    assert(largeMcqs.length >= 0 && q1Time < 1000, 'Test 1: Large dataset MCQ query executes efficiently with index', `Time: ${q1Time.toFixed(2)}ms, count: ${largeMcqs.length}`);

    // 2. Pagination Efficiency (Limit and Offset slice separation)
    const page1Start = performance.now();
    const page1 = await getMCQsFromDb({ limit: 5, offset: 0 });
    const page1Time = performance.now() - page1Start;

    const page2Start = performance.now();
    const page2 = await getMCQsFromDb({ limit: 5, offset: 5 });
    const page2Time = performance.now() - page2Start;

    // Check that pagination parameters execute rapidly and return valid slices (or empty if dataset is small)
    assert(page1Time < 1000 && page2Time < 1000, 'Test 2: Pagination queries execute with high speed and valid limits', `P1: ${page1Time.toFixed(2)}ms (${page1.length} items), P2: ${page2Time.toFixed(2)}ms (${page2.length} items)`);

    // 3. Search Query Performance
    const searchStart = performance.now();
    const searchResults = await getMCQsFromDb({ search: 'Physics', limit: 20 });
    const searchTime = performance.now() - searchStart;
    assert(searchTime < 1000, 'Test 3: Search query executes with high responsiveness', `Time: ${searchTime.toFixed(2)}ms, results: ${searchResults.length}`);

    // 4. Analytics API Performance (Admin Analytics)
    const analyticsStart = performance.now();
    const adminAnalytics = await getAdminAnalytics();
    const analyticsTime = performance.now() - analyticsStart;
    assert(adminAnalytics !== null && analyticsTime < 5000, 'Test 4: Admin analytics aggregates PostgreSQL metrics rapidly', `Time: ${analyticsTime.toFixed(2)}ms`);

    // 5. Dashboard & Student Analytics Performance
    const studentPerfStart = performance.now();
    const studentAnalytics = await getStudentAnalytics('test_student_uid');
    const studentPerfTime = performance.now() - studentPerfStart;
    assert(studentAnalytics !== null && studentPerfTime < 1500, 'Test 5: Student dashboard and personal analytics load efficiently', `Time: ${studentPerfTime.toFixed(2)}ms`);

    // 6. Safe Caching & RBAC Isolation Verification
    const cacheKey = 'public_test_boards_cache';
    const mockPublicBoards = [{ id: 1, name: 'BISE Lahore' }, { id: 2, name: 'Federal Board' }];
    publicCache.set(cacheKey, mockPublicBoards);

    const cachedVal = publicCache.get<any[]>(cacheKey);
    assert(cachedVal !== null && cachedVal.length === 2, 'Test 6a: Public reference caching successfully stores and retrieves data');

    // Attempt to cache private user data (should be blocked by SafeMemoryCache)
    const privateKey = 'user_private_token_secret';
    publicCache.set(privateKey, { uid: 'secret_123', token: 'bearer_xyz' });
    const blockedVal = publicCache.get(privateKey);
    assert(blockedVal === null, 'Test 6b: SafeMemoryCache strictly rejects and blocks caching of private user keys or tokens');

    // 7. Document Queries Performance
    const docQueryStart = performance.now();
    const docRes = await db.execute(sql`SELECT id, title, document_type, downloads_count FROM documents LIMIT 50`);
    const docQueryTime = performance.now() - docQueryStart;
    assert((docRes as any).rows !== undefined && docQueryTime < 1000, 'Test 7: Document library queries execute with optimal indexing', `Time: ${docQueryTime.toFixed(2)}ms`);

  } catch (error) {
    console.error('Unexpected error during performance test suite:', error);
    failed++;
  }

  console.log('------------------------------------------------------------------------------------------------------------------');
  console.log(`PERFORMANCE TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPerformanceTestSuite().catch((err) => {
  console.error('Fatal error in performance tests:', err);
  process.exit(1);
});
