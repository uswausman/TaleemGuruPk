import { db } from '../src/db/index';
import { users, testResults, examAttempts, certificates, tests } from '../src/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import {
  getStudentDashboardStats,
  getStudentPerformanceAnalytics,
  submitExamAttemptInDb,
  startExamAttemptInDb,
} from '../src/db/exams';
import { getTestByIdFromDb } from '../src/db/content';
import { mapSupabaseUserToStudentProfile } from '../src/lib/supabaseService';
import { v4 as uuidv4 } from 'uuid';

async function runEndToEndStudentDashboardQA() {
  console.log('================================================================');
  console.log('🚀 END-TO-END QA: STUDENT DASHBOARD ZERO & AUTHENTIC TEST CYCLE');
  console.log('================================================================\n');

  // Count existing genuine test results before test
  const existingResultsCountRes = await db.select({ count: count() }).from(testResults);
  const initialTotalResults = Number(existingResultsCountRes[0]?.count || 0);
  console.log(`[Baseline Check] Total existing results in production DB: ${initialTotalResults}`);

  // STEP 1: Create a brand-new student account
  const testStudentUid = `qa-student-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const testStudentEmail = `student.qa.${Date.now()}@taleemguru.pk`;
  const testStudentName = 'Fatima Zahra';

  console.log(`\n[STEP 1] Registering fresh candidate: ${testStudentName} (${testStudentEmail})`);

  // Insert fresh student record into database
  await db.insert(users).values({
    uid: testStudentUid,
    email: testStudentEmail,
    name: testStudentName,
    roles: ['Student'],
    points: 0,
    streakDays: 0,
    testsTaken: 0,
    status: 'Active',
    classLevel: 'Class 10 (Matric Pt 2)',
    board: 'BISE Lahore',
    targetExam: 'MDCAT / BISE Board Exam',
    avatar: '👩‍🎓',
  });

  // Verify client mapping from Supabase auth object
  const authPayload = {
    id: testStudentUid,
    email: testStudentEmail,
    user_metadata: {
      full_name: testStudentName,
      board: 'BISE Lahore',
      class_level: 'Class 10 (Matric Pt 2)',
      target_exam: 'MDCAT / BISE Board Exam',
    },
  };
  const mappedProfile = mapSupabaseUserToStudentProfile(authPayload, false);

  console.log('\n[STEP 2] Verifying initial statistics immediately after registration:');
  console.log({
    'Tests Taken': mappedProfile.testsTaken,
    'Points': mappedProfile.points,
    'Streak': mappedProfile.streakDays,
    'Certificates': mappedProfile.certificates.length,
    'Saved Questions': mappedProfile.savedQuestionIds.length,
    'Wrong Questions': mappedProfile.wrongQuestionIds.length,
  });

  if (
    mappedProfile.testsTaken !== 0 ||
    mappedProfile.points !== 0 ||
    mappedProfile.streakDays !== 0 ||
    mappedProfile.certificates.length !== 0 ||
    mappedProfile.savedQuestionIds.length !== 0 ||
    mappedProfile.wrongQuestionIds.length !== 0
  ) {
    throw new Error('FAILED: Brand-new student mapped profile did not start with 0 for all counters!');
  }
  console.log('✓ PASS: Profile mapping starts with real zero statistics.');

  // STEP 3: Verify server-side dashboard endpoint data for brand-new student
  const initialDashboard = await getStudentDashboardStats(testStudentUid);
  console.log('\n[STEP 3] Verifying Database Dashboard Stats for fresh student:');
  console.log(initialDashboard.summary);
  console.log(`Recent attempts count: ${initialDashboard.recentAttempts.length}`);

  if (
    initialDashboard.summary.totalTestsAttempted !== 0 ||
    initialDashboard.summary.totalTestsPassed !== 0 ||
    initialDashboard.summary.averagePercentage !== 0 ||
    initialDashboard.summary.highestPercentage !== 0 ||
    initialDashboard.summary.totalTimeSpentSeconds !== 0 ||
    initialDashboard.summary.certificatesEarned !== 0 ||
    initialDashboard.summary.bookmarksCount !== 0 ||
    initialDashboard.recentAttempts.length !== 0
  ) {
    throw new Error('FAILED: Initial database dashboard returned non-zero stats or non-empty attempts!');
  }
  console.log('✓ PASS: Database dashboard summary has 0 tests, 0% accuracy, 0 points, and empty recent attempts.');

  // STEP 4: Verify performance analytics for fresh student
  const initialAnalytics = await getStudentPerformanceAnalytics(testStudentUid);
  console.log('\n[STEP 4] Verifying Performance Analytics for fresh student:');
  console.log({
    hasData: initialAnalytics.hasData,
    totalTests: initialAnalytics.totalTests,
    averagePercentage: initialAnalytics.averagePercentage,
    overallAccuracy: initialAnalytics.overallAccuracy,
    subjectBreakdown: initialAnalytics.subjectBreakdown,
  });

  if (
    initialAnalytics.hasData !== false ||
    initialAnalytics.totalTests !== 0 ||
    initialAnalytics.averagePercentage !== 0 ||
    initialAnalytics.overallAccuracy !== 0 ||
    initialAnalytics.subjectBreakdown.length !== 0
  ) {
    throw new Error('FAILED: Performance analytics returned hasData=true or populated arrays for new student!');
  }
  console.log('✓ PASS: Performance analytics is completely empty (hasData: false) with zero stats.');

  // STEP 5: Student takes exactly ONE real test
  console.log('\n[STEP 5] Student commences and completes exactly ONE real exam session...');

  const testId = 'test-mdcat-biology-mock';

  // Start exam attempt
  const startRes = await startExamAttemptInDb({
    userUid: testStudentUid,
    studentEmail: testStudentEmail,
    studentName: testStudentName,
    testId,
  });
  console.log(`Started exam session with Attempt ID: ${startRes.attemptId}`);
  console.log(`Test Title: "${startRes.test.title}", Total MCQs: ${startRes.test.totalQuestions}`);

  // Construct authentic answers by answering the questions correctly
  const fullTest = await getTestByIdFromDb(testId);
  const realQuestions = fullTest?.questions || [];
  const submittedAnswers: Record<string, any> = {};

  realQuestions.forEach((q: any) => {
    submittedAnswers[q.id] = {
      selectedOption: q.correctAnswer,
      markedForReview: false,
      timeSpentSeconds: 15,
    };
  });

  // Submit completed exam attempt
  const submitRes = await submitExamAttemptInDb({
    attemptId: startRes.attemptId,
    userUid: testStudentUid,
    submittedAnswers,
    timeSpentSeconds: 180,
  });

  console.log(`Successfully submitted attempt. Score: ${submitRes.result.marksObtained}/${submitRes.result.totalMarks} (${submitRes.result.percentage}%)`);
  if (submitRes.certificateId) {
    console.log(`Earned certificate ID: ${submitRes.certificateId}`);
  }

  // STEP 6: Verify updated statistics immediately from database
  console.log('\n[STEP 6] Verifying updated dashboard statistics after completing ONE test:');
  const updatedDashboard = await getStudentDashboardStats(testStudentUid);
  console.log(updatedDashboard.summary);
  console.log('Recent attempts:', updatedDashboard.recentAttempts.map((a) => ({
    title: a.testTitle,
    score: `${a.marksObtained}/${a.totalMarks}`,
    percentage: `${a.percentage}%`,
  })));

  if (updatedDashboard.summary.totalTestsAttempted !== 1) {
    throw new Error(`FAILED: Expected totalTestsAttempted = 1, got ${updatedDashboard.summary.totalTestsAttempted}`);
  }
  if (updatedDashboard.summary.totalTestsPassed !== 1) {
    throw new Error(`FAILED: Expected totalTestsPassed = 1, got ${updatedDashboard.summary.totalTestsPassed}`);
  }
  if (updatedDashboard.summary.averagePercentage !== 100) {
    throw new Error(`FAILED: Expected averagePercentage = 100, got ${updatedDashboard.summary.averagePercentage}`);
  }
  if (updatedDashboard.summary.highestPercentage !== 100) {
    throw new Error(`FAILED: Expected highestPercentage = 100, got ${updatedDashboard.summary.highestPercentage}`);
  }
  if (updatedDashboard.summary.totalTimeSpentSeconds !== 180) {
    throw new Error(`FAILED: Expected totalTimeSpentSeconds = 180, got ${updatedDashboard.summary.totalTimeSpentSeconds}`);
  }
  if (updatedDashboard.summary.certificatesEarned < 1) {
    throw new Error(`FAILED: Expected certificatesEarned >= 1, got ${updatedDashboard.summary.certificatesEarned}`);
  }
  if (updatedDashboard.recentAttempts.length !== 1) {
    throw new Error(`FAILED: Expected exactly 1 recent attempt, got ${updatedDashboard.recentAttempts.length}`);
  }
  console.log('✓ PASS: Dashboard summary updated accurately to 1 test, 100% accuracy, 180s duration, 1 certificate, 1 recent attempt.');

  // STEP 7: Verify updated performance analytics
  console.log('\n[STEP 7] Verifying updated performance analytics after completing ONE test:');
  const updatedAnalytics = await getStudentPerformanceAnalytics(testStudentUid);
  console.log({
    hasData: updatedAnalytics.hasData,
    totalTests: updatedAnalytics.totalTests,
    passRate: `${updatedAnalytics.passRate}%`,
    averagePercentage: `${updatedAnalytics.averagePercentage}%`,
    totalQuestionsAnswered: updatedAnalytics.totalQuestionsAnswered,
    totalCorrect: updatedAnalytics.totalCorrect,
    totalWrong: updatedAnalytics.totalWrong,
    overallAccuracy: `${updatedAnalytics.overallAccuracy}%`,
    subjectBreakdown: updatedAnalytics.subjectBreakdown,
  });

  if (
    !updatedAnalytics.hasData ||
    updatedAnalytics.totalTests !== 1 ||
    updatedAnalytics.averagePercentage !== 100 ||
    updatedAnalytics.overallAccuracy !== 100 ||
    updatedAnalytics.totalWrong !== 0 ||
    updatedAnalytics.subjectBreakdown.length !== 1 ||
    updatedAnalytics.subjectBreakdown[0].subject !== 'Biology'
  ) {
    throw new Error('FAILED: Updated performance analytics did not match the single completed test!');
  }
  console.log('✓ PASS: Performance analytics accurately reports hasData: true, 1 test, 100% accuracy, Biology subject.');

  // STEP 8: Clean up test QA record so production remains pristine
  console.log('\n[STEP 8] Cleaning up temporary QA student records...');
  await db.delete(testResults).where(eq(testResults.userUid, testStudentUid));
  await db.delete(examAttempts).where(eq(examAttempts.userUid, testStudentUid));
  await db.delete(certificates).where(eq(certificates.userUid, testStudentUid));
  await db.delete(users).where(eq(users.uid, testStudentUid));

  // Verify historical data count
  const finalResultsCountRes = await db.select({ count: count() }).from(testResults);
  const finalTotalResults = Number(finalResultsCountRes[0]?.count || 0);
  console.log(`[Verification] Production testResults count is intact: ${finalTotalResults} (Initial: ${initialTotalResults})`);

  if (finalTotalResults !== initialTotalResults) {
    throw new Error('FAILED: Production test results count changed after QA cleanup!');
  }

  console.log('\n================================================================');
  console.log('🎉 END-TO-END QA PASSED: STUDENT DASHBOARD DATA ENGINE IS 100% AUTHENTIC');
  console.log('================================================================');
}

runEndToEndStudentDashboardQA()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('QA Execution Failed:', err);
    process.exit(1);
  });
