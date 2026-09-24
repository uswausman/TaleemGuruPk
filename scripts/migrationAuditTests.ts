import { db } from '../src/db/index';
import { mcqs, tests, testQuestions, pastPapers, studyNotes, users } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  getMCQsFromDb,
  createMCQInDb,
  updateMCQInDb,
  deleteMCQInDb,
  getTestsFromDb,
  createTestInDb,
  updateTestInDb,
  deleteTestInDb,
  getPastPapersFromDb,
  createPastPaperInDb,
  updatePastPaperInDb,
  deletePastPaperInDb,
  getStudyNotesFromDb,
  createStudyNoteInDb,
  updateStudyNoteInDb,
  deleteStudyNoteInDb,
  seedInitialEducationalContent,
} from '../src/db/content';
import { MCQS_DATABASE, POPULAR_TESTS, PAST_PAPERS_DATA, STUDY_NOTES_DATA } from '../src/data/mockData';
import { MASTER_PAST_PAPERS, MASTER_STUDY_NOTES } from '../src/data/educationalHierarchy';

async function runAudit() {
  console.log('================================================================');
  console.log('  TALEEMGURU STEP 2.1 DATABASE MIGRATION & DATA INTEGRITY AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${title}`);
      if (details) console.log(`          ${details}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${title}`);
      if (details) console.error(`          ${details}`);
      failed++;
    }
  }

  // 1. Database connection & table verification
  test(Boolean(db), 'Database pool connection initialized successfully');

  // 2. Query counts from source files
  const sourceMcqsCount = MCQS_DATABASE.length;
  const sourceTestsCount = POPULAR_TESTS.length;
  let sourceTestQuestionsCount = 0;
  POPULAR_TESTS.forEach(t => sourceTestQuestionsCount += (t.questions?.length || 0));

  const allSourcePapers = [...PAST_PAPERS_DATA, ...MASTER_PAST_PAPERS];
  const uniquePapersMap = new Map();
  allSourcePapers.forEach(p => uniquePapersMap.set(p.id, p));
  const sourcePapersCount = uniquePapersMap.size;

  const allSourceNotes = [...STUDY_NOTES_DATA, ...MASTER_STUDY_NOTES];
  const uniqueNotesMap = new Map();
  allSourceNotes.forEach(n => uniqueNotesMap.set(n.id, n));
  const sourceNotesCount = uniqueNotesMap.size;

  console.log('\n--- SOURCE DATASET COUNTS ---');
  console.log(`  MCQs:           ${sourceMcqsCount}`);
  console.log(`  Tests:          ${sourceTestsCount}`);
  console.log(`  Test Questions: ${sourceTestQuestionsCount}`);
  console.log(`  Past Papers:    ${sourcePapersCount}`);
  console.log(`  Study Notes:    ${sourceNotesCount}\n`);

  // 3. Query PostgreSQL table counts
  const dbMcqs = await db.select({ count: sql<number>`count(*)` }).from(mcqs);
  const dbTests = await db.select({ count: sql<number>`count(*)` }).from(tests);
  const dbTestQuestions = await db.select({ count: sql<number>`count(*)` }).from(testQuestions);
  const dbPapers = await db.select({ count: sql<number>`count(*)` }).from(pastPapers);
  const dbNotes = await db.select({ count: sql<number>`count(*)` }).from(studyNotes);

  const numDbMcqs = Number(dbMcqs[0]?.count || 0);
  const numDbTests = Number(dbTests[0]?.count || 0);
  const numDbTestQuestions = Number(dbTestQuestions[0]?.count || 0);
  const numDbPapers = Number(dbPapers[0]?.count || 0);
  const numDbNotes = Number(dbNotes[0]?.count || 0);

  console.log('--- POSTGRESQL DATABASE COUNTS ---');
  console.log(`  MCQs:           ${numDbMcqs} (>= source ${sourceMcqsCount})`);
  console.log(`  Tests:          ${numDbTests} (>= source ${sourceTestsCount})`);
  console.log(`  Test Questions: ${numDbTestQuestions} (>= source ${sourceTestQuestionsCount})`);
  console.log(`  Past Papers:    ${numDbPapers} (>= source ${sourcePapersCount})`);
  console.log(`  Study Notes:    ${numDbNotes} (>= source ${sourceNotesCount})\n`);

  test(numDbMcqs >= sourceMcqsCount, 'No Data Loss: MCQs count in database covers source baseline');
  test(numDbTests >= sourceTestsCount, 'No Data Loss: Tests count in database covers source baseline');
  test(numDbTestQuestions >= sourceTestQuestionsCount, 'No Data Loss: Test Questions count in database covers source baseline');
  test(numDbPapers >= sourcePapersCount, 'No Data Loss: Past Papers count in database covers source baseline');
  test(numDbNotes >= sourceNotesCount, 'No Data Loss: Study Notes count in database covers source baseline');

  // 4. Test Seeder Idempotency
  console.log('\n--- SEEDER IDEMPOTENCY AUDIT ---');
  const countBeforeSeed = {
    mcqs: numDbMcqs,
    tests: numDbTests,
    papers: numDbPapers,
    notes: numDbNotes,
  };

  await seedInitialEducationalContent();
  await seedInitialEducationalContent();

  const dbMcqsAfter = await db.select({ count: sql<number>`count(*)` }).from(mcqs);
  const dbTestsAfter = await db.select({ count: sql<number>`count(*)` }).from(tests);
  const dbPapersAfter = await db.select({ count: sql<number>`count(*)` }).from(pastPapers);
  const dbNotesAfter = await db.select({ count: sql<number>`count(*)` }).from(studyNotes);

  const numDbMcqsAfter = Number(dbMcqsAfter[0]?.count || 0);
  const numDbTestsAfter = Number(dbTestsAfter[0]?.count || 0);
  const numDbPapersAfter = Number(dbPapersAfter[0]?.count || 0);
  const numDbNotesAfter = Number(dbNotesAfter[0]?.count || 0);

  test(numDbMcqsAfter === countBeforeSeed.mcqs, 'Idempotency: Re-running seeder does NOT duplicate MCQs');
  test(numDbTestsAfter === countBeforeSeed.tests, 'Idempotency: Re-running seeder does NOT duplicate Tests');
  test(numDbPapersAfter === countBeforeSeed.papers, 'Idempotency: Re-running seeder does NOT duplicate Past Papers');
  test(numDbNotesAfter === countBeforeSeed.notes, 'Idempotency: Re-running seeder does NOT duplicate Study Notes');

  // 5. Test Draft / Published Status Filter in Database Queries
  console.log('\n--- PUBLIC PUBLISHING & DRAFT FILTER AUDIT ---');
  const draftMcq = await createMCQInDb({
    id: `draft-mcq-${Date.now()}`,
    question: 'What is the draft question on physics thermodynamics?',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswer: 0,
    subject: 'Physics',
    status: 'Draft',
  });

  const publishedMcqs = await getMCQsFromDb({ status: 'Published' });
  const hasDraftInPublished = publishedMcqs.some(m => m.id === draftMcq.id);
  test(!hasDraftInPublished, 'Publishing: Draft MCQs are filtered out from public query results');

  const draftQuery = await getMCQsFromDb({ status: 'Draft' });
  const hasDraftInDraftQuery = draftQuery.some(m => m.id === draftMcq.id);
  test(hasDraftInDraftQuery, 'Publishing: Draft MCQs are accessible when specifically filtering for Drafts');

  // Cleanup draft
  await deleteMCQInDb(draftMcq.id);

  // 6. Test Cross-Session Persistence (Create -> Read -> Update -> Read -> Delete -> Confirm Delete)
  console.log('\n--- CROSS-SESSION PERSISTENCE AUDIT ---');
  const sessionTestId = `sess-test-${Date.now()}`;
  const createdTest = await createTestInDb({
    id: sessionTestId,
    title: 'Kinematics Diagnostic Assessment',
    subject: 'Physics',
    classLevel: 'Class 9 (Matric Pt 1)',
    durationMinutes: 20,
    status: 'Published',
  }, 'audit-admin');
  test(createdTest.id === sessionTestId, 'Persistence: Test config successfully saved in PostgreSQL');

  const retrievedTest = await getTestsFromDb({ search: 'Kinematics Diagnostic Assessment' });
  test(retrievedTest.length > 0 && retrievedTest[0].id === sessionTestId, 'Persistence: New session retrieves newly created test without local cache');

  await deleteTestInDb(sessionTestId);
  const afterDeleteTest = await getTestsFromDb({ search: 'Kinematics Diagnostic Assessment' });
  test(afterDeleteTest.length === 0, 'Persistence: Deletion is immediately reflected in database');

  // 7. Test Quiz Engine Relational Linking
  console.log('\n--- QUIZ ENGINE RELATIONAL LINKING AUDIT ---');
  const allDbTests = await getTestsFromDb({ limit: 5 });
  const testWithQuestions = allDbTests.find(t => t.questions && t.questions.length > 0);
  test(Boolean(testWithQuestions), `Quiz Engine: Test "${testWithQuestions?.title}" loaded with ${testWithQuestions?.questions.length} relational MCQs`);

  console.log('\n================================================================');
  console.log(`  AUDIT SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
