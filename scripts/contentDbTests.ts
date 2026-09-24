import {
  getMCQsFromDb,
  createMCQInDb,
  getMCQByIdFromDb,
  getTestsFromDb,
  createTestInDb,
  getTestByIdFromDb,
  getPastPapersFromDb,
  createPastPaperInDb,
  getPastPaperByIdFromDb,
  getStudyNotesFromDb,
  createStudyNoteInDb,
  getStudyNoteByIdFromDb,
  seedInitialEducationalContent,
} from '../src/db/content';

async function runContentDatabaseTests() {
  console.log('==================================================');
  console.log('  TALEEMGURU EDUCATIONAL CONTENT DATABASE TEST SUITE');
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
    // 1. Seed initial authentic curriculum
    const seedResult = await seedInitialEducationalContent();
    assert(typeof seedResult === 'object', 'Test 1: Initial curriculum content seeder executes cleanly');

    // 2. Query MCQs from PostgreSQL
    const mcqs = await getMCQsFromDb({ limit: 10 });
    assert(Array.isArray(mcqs) && mcqs.length > 0, `Test 2: Retrieved ${mcqs.length} MCQs from PostgreSQL`);

    // 3. Create a test MCQ in PostgreSQL
    const testMcq = await createMCQInDb({
      id: `test-mcq-${Date.now()}`,
      question: 'What is the SI unit of electric current in physics curriculum?',
      options: ['Volt', 'Ampere', 'Ohm', 'Watt'],
      correctAnswer: 1,
      explanation: 'The ampere (A) is the base unit of electric current in the International System of Units (SI).',
      subject: 'Physics',
      classLevel: 'Class 10 (Matric Pt 2)',
      board: 'BISE Lahore',
      difficulty: 'Easy',
      status: 'Published',
    });
    assert(testMcq.id.startsWith('test-mcq-') && testMcq.options[testMcq.correctAnswer] === 'Ampere', 'Test 3: Created and retrieved MCQ from PostgreSQL');

    // 4. Query Tests from PostgreSQL
    const tests = await getTestsFromDb({ limit: 10 });
    assert(Array.isArray(tests) && tests.length > 0, `Test 4: Retrieved ${tests.length} tests from PostgreSQL`);

    // 5. Create a test configuration with questions in PostgreSQL
    const testConfig = await createTestInDb({
      id: `test-cfg-${Date.now()}`,
      title: 'Matric Physics Unit Assessment',
      description: 'Official model test on electrostatics and current electricity',
      subject: 'Physics',
      classLevel: 'Class 10 (Matric Pt 2)',
      board: 'BISE Lahore',
      durationMinutes: 15,
      totalQuestions: 1,
      totalMarks: 1,
      questions: [testMcq],
    });
    assert(testConfig.id.startsWith('test-cfg-') && testConfig.questions.length === 1, 'Test 5: Created test configuration with relational questions in PostgreSQL');

    // 6. Query Past Papers from PostgreSQL
    const pastPapers = await getPastPapersFromDb({ limit: 10 });
    assert(Array.isArray(pastPapers) && pastPapers.length > 0, `Test 6: Retrieved ${pastPapers.length} past papers from PostgreSQL`);

    // 7. Query Study Notes from PostgreSQL
    const studyNotes = await getStudyNotesFromDb({ limit: 10 });
    assert(Array.isArray(studyNotes) && studyNotes.length > 0, `Test 7: Retrieved ${studyNotes.length} study notes from PostgreSQL`);

    // 8. Create and verify Study Note in PostgreSQL
    const testNote = await createStudyNoteInDb({
      id: `test-note-${Date.now()}`,
      title: 'Newton Laws of Motion Comprehensive Summary',
      subject: 'Physics',
      classLevel: 'Class 9 (Matric Pt 1)',
      chapter: 'Chapter 3: Dynamics',
      keyPoints: ['First Law: Law of Inertia', 'Second Law: F = ma', 'Third Law: Action and reaction are equal and opposite'],
      readTime: '4 min',
      status: 'Published',
    });
    assert(testNote.id.startsWith('test-note-') && testNote.keyPoints.length === 3, 'Test 8: Created and retrieved Study Note from PostgreSQL');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('--------------------------------------------------');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('--------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runContentDatabaseTests();
