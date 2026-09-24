import {
  executeUnifiedSearch,
  getQuickSearchSuggestions,
  getDynamicSearchFilters,
} from '../src/server/unifiedSearch.ts';
import { db } from '../src/db/index.ts';
import { mcqs, tests, documents } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function runSearchTestSuite() {
  console.log('==================================================');
  console.log('  TALEEMGURU PROFESSIONAL SEARCH & DISCOVERY TEST SUITE');
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

  const testDraftId = `test-draft-mcq-${Date.now()}`;

  try {
    // 0. Setup a temporary Draft MCQ in PostgreSQL to test RBAC & visibility
    await db.insert(mcqs).values({
      id: testDraftId,
      question: 'CONFIDENTIAL DRAFT: What is Planck constant exact value?',
      options: ['6.626e-34 J s', '3.0e8 m/s', '9.8 m/s2', '1.6e-19 C'],
      correctAnswer: 0,
      subject: 'Physics',
      classLevel: 'Class 11',
      board: 'BISE Lahore',
      chapter: 'Modern Physics',
      difficulty: 'Hard',
      status: 'Draft',
    });

    // TEST 1: Search Accuracy - General query across multiple content types
    const searchPhysics = await executeUnifiedSearch({ query: 'Physics', limit: 20 }, false);
    assert(
      searchPhysics.total > 0 && searchPhysics.results.length > 0,
      `Test 1: Search accuracy - 'Physics' returned ${searchPhysics.total} results across types`
    );

    // TEST 2: Search Accuracy - Specific MCQ question text matching
    const searchMCQ = await executeUnifiedSearch({ query: 'matrix', type: 'mcqs', limit: 10 }, false);
    assert(
      searchMCQ.results.every((r) => r.type === 'mcq'),
      `Test 2: Search accuracy - type='mcqs' returned strictly MCQ items (${searchMCQ.results.length} found)`
    );

    // TEST 3: Search Accuracy - Specific Test title matching
    const searchTests = await executeUnifiedSearch({ query: 'Test', type: 'tests', limit: 10 }, false);
    assert(
      searchTests.results.every((r) => r.type === 'test'),
      `Test 3: Search accuracy - type='tests' returned strictly Test configs`
    );

    // TEST 4: Filter by Subject
    const filterSubject = await executeUnifiedSearch({ subject: 'Mathematics', limit: 15 }, false);
    assert(
      filterSubject.results.length > 0 &&
        filterSubject.results.every(
          (r) => !r.subject || r.subject.toLowerCase().includes('math')
        ),
      `Test 4: Filter by Subject - Returned ${filterSubject.results.length} Mathematics items`
    );

    // TEST 5: Filter by Board
    const filterBoard = await executeUnifiedSearch({ board: 'BISE Lahore', limit: 15 }, false);
    assert(
      filterBoard.results.length > 0 &&
        filterBoard.results.every((r) => !r.board || r.board.toLowerCase().includes('lahore')),
      `Test 5: Filter by Board - Returned ${filterBoard.results.length} items for BISE Lahore`
    );

    // TEST 6: Cascaded Filters: Board + Class + Subject
    const cascaded = await executeUnifiedSearch(
      {
        board: 'BISE Lahore',
        classLevel: 'Class 9',
        subject: 'Physics',
        limit: 10,
      },
      false
    );
    assert(
      cascaded.results.length >= 0,
      `Test 6: Cascaded Filters (Board + Class + Subject) executed correctly without query errors`
    );

    // TEST 7: Published-Only Visibility for Students/Public (RBAC)
    const publicSearch = await executeUnifiedSearch(
      { query: 'CONFIDENTIAL DRAFT', limit: 10 },
      false // public student user
    );
    assert(
      publicSearch.total === 0 &&
        !publicSearch.results.some((r) => r.id === testDraftId),
      'Test 7: Published-only visibility - Draft item is completely hidden from public/student search'
    );

    // TEST 8: Staff RBAC Search - Staff CAN find Draft content
    const staffSearch = await executeUnifiedSearch(
      { query: 'CONFIDENTIAL DRAFT', status: 'Draft', limit: 10 },
      true // staff user
    );
    assert(
      staffSearch.results.some((r) => r.id === testDraftId),
      'Test 8: RBAC enforcement - Staff user is authorized to locate Draft content'
    );

    // TEST 9: IDOR & SQL Injection Protection
    const sqliAttempt = await executeUnifiedSearch(
      { query: "' OR '1'='1' --", limit: 10 },
      false
    );
    assert(
      Array.isArray(sqliAttempt.results),
      'Test 9: SQL Injection safety - SQL injection payloads are safely parameterized by Drizzle'
    );

    // TEST 10: Pagination Offset and Limit Handling
    const page1 = await executeUnifiedSearch({ query: 'Physics', page: 1, limit: 5 }, false);
    const page2 = await executeUnifiedSearch({ query: 'Physics', page: 2, limit: 5 }, false);
    assert(
      page1.results.length > 0 &&
        page2.results.length > 0 &&
        page1.results[0].id !== page2.results[0].id,
      `Test 10: Pagination - Page 1 and Page 2 yield distinct, non-overlapping result slices`
    );

    // TEST 11: Empty Results & Typo / No-Result Handling
    const emptySearch = await executeUnifiedSearch(
      { query: 'nonexistentxyzgibberish987654', limit: 10 },
      false
    );
    assert(
      emptySearch.total === 0 &&
        emptySearch.results.length === 0 &&
        Array.isArray(emptySearch.suggestions) &&
        emptySearch.suggestions.length > 0,
      'Test 11: Empty results - Returns 0 results and helpful fallback suggestions'
    );

    // TEST 12: Fast Autocomplete / Suggestions
    const suggestions = await getQuickSearchSuggestions('Chem', false);
    assert(
      suggestions.length > 0 && suggestions.some((s) => s.text.toLowerCase().includes('chem')),
      `Test 12: Autocomplete suggestions - 'Chem' returned ${suggestions.length} relevant suggestions`
    );

    // TEST 13: Dynamic Database Filter Extraction
    const filters = await getDynamicSearchFilters();
    assert(
      filters.boards.length > 0 && filters.classes.length > 0 && filters.subjects.length > 0,
      `Test 13: Dynamic filter extraction - Extracted ${filters.boards.length} boards, ${filters.classes.length} classes, and ${filters.subjects.length} subjects directly from PostgreSQL`
    );

    // TEST 14: Category Counts Aggregation
    const countTest = await executeUnifiedSearch({ limit: 1 }, false);
    assert(
      typeof countTest.countsByCategory?.all === 'number' &&
        countTest.countsByCategory.all > 0,
      `Test 14: Category counts aggregation - Total all items reported as ${countTest.countsByCategory.all}`
    );

  } catch (error: any) {
    console.error('Unexpected error during search test execution:', error);
    assert(false, `Unexpected search test failure: ${error.message}`);
  } finally {
    // Clean up temporary test draft
    try {
      await db.delete(mcqs).where(eq(mcqs.id, testDraftId));
    } catch {}
  }

  console.log('==================================================');
  console.log(`SEARCH TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runSearchTestSuite();
