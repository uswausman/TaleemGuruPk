import {
  initExamSystemTables,
  startExamAttemptInDb,
  saveExamAnswerInDb,
  submitExamAttemptInDb,
  getExamAttemptResultFromDb,
  getAdminExamAttemptsFromDb,
  getUserExamHistoryFromDb,
} from '../src/db/exams';
import {
  createMCQInDb,
  createTestInDb,
  seedInitialEducationalContent,
} from '../src/db/content';

async function runExamEngineTests() {
  console.log('==================================================');
  console.log('  TALEEMGURU STEP 4: ASSESSMENT & EXAM ENGINE TEST SUITE');
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
    // 1. Initialize tables & seed data
    await seedInitialEducationalContent();
    await initExamSystemTables();
    assert(true, 'Test 1: Exam system tables initialized successfully');

    // 2. Create MCQs for testing
    const q1 = await createMCQInDb({
      id: `exam-test-q1-${Date.now()}`,
      question: 'What is the speed of light in vacuum?',
      options: ['3 x 10^8 m/s', '3 x 10^6 m/s', '3 x 10^4 m/s', '3 x 10^2 m/s'],
      correctAnswer: 0,
      explanation: 'The speed of light in vacuum is approximately 300,000 km/s or 3 x 10^8 m/s.',
      subject: 'Physics',
      classLevel: 'Class 10 (Matric Pt 2)',
      board: 'BISE Lahore',
      difficulty: 'Easy',
      status: 'Published',
    });

    const q2 = await createMCQInDb({
      id: `exam-test-q2-${Date.now()}`,
      question: 'Which of the following is a scalar quantity?',
      options: ['Velocity', 'Acceleration', 'Mass', 'Force'],
      correctAnswer: 2,
      explanation: 'Mass has magnitude only and no direction, making it a scalar quantity.',
      subject: 'Physics',
      classLevel: 'Class 10 (Matric Pt 2)',
      board: 'BISE Lahore',
      difficulty: 'Easy',
      status: 'Published',
    });

    assert(Boolean(q1.id && q2.id), 'Test 2: Created assessment test questions in MCQ bank');

    // 3. Create a Test Config with negative marking and randomization
    const testConfig = await createTestInDb({
      id: `exam-test-config-${Date.now()}`,
      title: 'Physics Mechanics Standard Board Examination',
      description: 'Comprehensive evaluation covering Class 10 Physics Mechanics',
      subject: 'Physics',
      classLevel: 'Class 10 (Matric Pt 2)',
      board: 'BISE Lahore',
      testType: 'Chapter Test',
      category: 'Classroom',
      durationMinutes: 20,
      totalQuestions: 2,
      totalMarks: 2,
      passPercentage: 50,
      negativeMarking: true,
      negativeMarkValue: 0.25,
      randomizeQuestions: false,
      randomizeOptions: false,
      allowRetake: true,
      maxAttempts: 3,
      reviewPolicy: 'immediate',
      questions: [q1, q2],
      status: 'Published',
    });

    assert(testConfig.id.startsWith('exam-test-config-'), 'Test 3: Created examination config with rules in PostgreSQL');

    // 4. Start Exam Attempt
    const sessionResponse = await startExamAttemptInDb({
      testId: testConfig.id,
      studentName: 'Ahmad Khan',
      studentEmail: 'ahmad@example.com',
      userId: 'student-uuid-12345',
    });

    assert(Boolean(sessionResponse.attemptId), 'Test 4: Started examination session and created attemptId in PostgreSQL');
    assert(sessionResponse.test.questions.length === 2, 'Test 5: Delivered secure question payload');
    
    // Security verification: check that correct answer index is NOT exposed in safe questions payload
    const safeQ = sessionResponse.test.questions[0] as any;
    assert(safeQ.correctAnswer === undefined, 'Test 6: Anti-tampering check: Correct answers hidden from candidate payload');

    // 5. Autosave an Answer
    const saveRes = await saveExamAnswerInDb({
      attemptId: sessionResponse.attemptId,
      userUid: 'student-uuid-12345',
      questionId: q1.id,
      selectedOption: 0, // Correct answer
      markedForReview: false,
      timeSpentSeconds: 25,
    });
    assert(saveRes.success === true, 'Test 7: Autosaved question response to active attempt in PostgreSQL');

    // 6. Submit Exam with 1 correct and 1 wrong answer (to test negative marking)
    const submitRes = await submitExamAttemptInDb({
      attemptId: sessionResponse.attemptId,
      userUid: 'student-uuid-12345',
      submittedAnswers: {
        [q1.id]: { selectedOption: 0, timeSpentSeconds: 25 }, // Correct (+1)
        [q2.id]: { selectedOption: 0, timeSpentSeconds: 30 }, // Wrong (0 instead of 2, penalty -0.25)
      },
      timeSpentSeconds: 55,
    });

    assert(Boolean(submitRes && submitRes.result), 'Test 8: Exam submitted and evaluated server-side');
    
    // Authoritative score calculation: 1 correct (1 mark) - 1 wrong (0.25 mark penalty) = 0.75 marks
    const result = submitRes.result;
    assert(result.correctCount === 1, 'Test 9: Server verified 1 correct answer');
    assert(result.wrongCount === 1, 'Test 10: Server verified 1 incorrect answer');
    assert(result.marksObtained === 0.75, `Test 11: Server computed negative marking accurately: expected 0.75, got ${result.marksObtained}`);
    assert(result.percentage === 38, `Test 12: Computed percentage accurately: expected 38%, got ${result.percentage}%`);
    assert(result.grade === 'F', `Test 13: Assigned correct grade for score below pass threshold`);

    // 7. Test Successful Exam Submission (Grade A / Pass + Certificate ID)
    const session2 = await startExamAttemptInDb({
      testId: testConfig.id,
      studentName: 'Fatima Noor',
      studentEmail: 'fatima@example.com',
      userId: 'student-uuid-67890',
    });

    const submitRes2 = await submitExamAttemptInDb({
      attemptId: session2.attemptId,
      userUid: 'student-uuid-67890',
      submittedAnswers: {
        [q1.id]: { selectedOption: 0, timeSpentSeconds: 15 }, // Correct (+1)
        [q2.id]: { selectedOption: 2, timeSpentSeconds: 18 }, // Correct (+1)
      },
      timeSpentSeconds: 33,
    });

    const result2 = submitRes2.result;
    assert(result2.correctCount === 2 && result2.percentage === 100, 'Test 14: Server evaluated 100% score for full correct attempt');
    assert(result2.grade === 'A+', 'Test 15: Server assigned Grade A+ for perfect score');
    assert(Boolean(submitRes2.certificateId), 'Test 16: Certificate of achievement issued with verifiable ID');

    // 8. Retrieve Result from DB
    const fetchedResult = await getExamAttemptResultFromDb(session2.attemptId, 'student-uuid-67890');
    assert(fetchedResult.marksObtained === 2 && fetchedResult.percentage === 100, 'Test 17: Retrieved authoritative result from PostgreSQL');

    // 9. Query User Exam History
    const history = await getUserExamHistoryFromDb('student-uuid-67890');
    assert(Array.isArray(history) && history.length >= 1, 'Test 18: Retrieved candidate exam history from PostgreSQL');

    // 10. Query Administrative Exam Attempts & Statistics
    const adminAttempts = await getAdminExamAttemptsFromDb({ testId: testConfig.id });
    assert(adminAttempts.attempts.length >= 2, 'Test 19: Administrator queried exam attempt logs from PostgreSQL');
    assert(adminAttempts.analytics !== null && adminAttempts.analytics.totalAttempts >= 2, 'Test 20: Calculated real-time examination analytics from PostgreSQL');

  } catch (error: any) {
    console.error('Test execution error:', error);
    assert(false, `Unexpected error in test suite: ${error.message}`);
  }

  console.log('==================================================');
  console.log(`  STEP 4 EXAM ENGINE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runExamEngineTests();
