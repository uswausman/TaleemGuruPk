import { db } from '../src/db/index';
import { users, testResults, examAttempts } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { getStudentDashboardStats, getStudentPerformanceAnalytics, submitExamAttemptInDb } from '../src/db/exams';
import { mapSupabaseUserToStudentProfile } from '../src/lib/supabaseService';

async function runStudentDashboardAudit() {
  console.log('--- STARTING STUDENT DASHBOARD ZERO/AUTHENTIC DATA AUDIT ---');

  // Test 1: mapSupabaseUserToStudentProfile generates pristine zero stats
  const mockSupabaseStudent = {
    id: 'test-new-student-uid-12345',
    email: 'newstudent@example.com',
    user_metadata: {
      full_name: 'Ahmad Khan',
      board: 'BISE Lahore',
      class_level: 'Class 10 (Matric Pt 2)',
    },
  };

  const studentProfile = mapSupabaseUserToStudentProfile(mockSupabaseStudent, false);
  console.log('[Check 1] Pristine student profile mapped from auth:');
  console.log({
    name: studentProfile.name,
    points: studentProfile.points,
    streakDays: studentProfile.streakDays,
    testsTaken: studentProfile.testsTaken,
    savedQuestions: studentProfile.savedQuestionIds.length,
    wrongQuestions: studentProfile.wrongQuestionIds.length,
    certificates: studentProfile.certificates.length,
  });

  if (
    studentProfile.points !== 0 ||
    studentProfile.streakDays !== 0 ||
    studentProfile.testsTaken !== 0 ||
    studentProfile.savedQuestionIds.length !== 0 ||
    studentProfile.wrongQuestionIds.length !== 0 ||
    studentProfile.certificates.length !== 0
  ) {
    throw new Error('FAIL: Fresh student profile does not have zero statistics!');
  }
  console.log('✓ PASS: Fresh student profile starts with exactly 0 for all activity counters.');

  // Test 2: Query DB for nonexistent / newly registered student UID
  const brandNewUid = `new-student-${Date.now()}`;
  const freshStats = await getStudentDashboardStats(brandNewUid);
  console.log('[Check 2] Database dashboard stats for brand new student:');
  console.log(freshStats.summary);

  if (
    freshStats.summary.totalTestsAttempted !== 0 ||
    freshStats.summary.totalTestsPassed !== 0 ||
    freshStats.summary.averagePercentage !== 0 ||
    freshStats.summary.highestPercentage !== 0 ||
    freshStats.summary.totalTimeSpentSeconds !== 0 ||
    freshStats.summary.certificatesEarned !== 0 ||
    freshStats.summary.bookmarksCount !== 0 ||
    freshStats.recentAttempts.length !== 0
  ) {
    throw new Error('FAIL: Database dashboard stats for new student returned non-zero values!');
  }
  console.log('✓ PASS: Database returns genuine zero/empty dashboard summary for student with no activity.');

  // Test 3: Performance analytics for brand new student
  const freshPerf = await getStudentPerformanceAnalytics(brandNewUid);
  console.log('[Check 3] Performance analytics for brand new student:');
  console.log({
    hasData: freshPerf.hasData,
    totalTests: freshPerf.totalTests,
    overallAccuracy: freshPerf.overallAccuracy,
    subjectBreakdown: freshPerf.subjectBreakdown.length,
  });

  if (
    freshPerf.hasData !== false ||
    freshPerf.totalTests !== 0 ||
    freshPerf.overallAccuracy !== 0 ||
    freshPerf.subjectBreakdown.length !== 0
  ) {
    throw new Error('FAIL: Fresh student has non-empty performance analytics!');
  }
  console.log('✓ PASS: Performance analytics correctly returns hasData=false and 0 stats.');

  console.log('--- ALL STUDENT DASHBOARD AUTHENTIC DATA CHECKS PASSED ---');
}

runStudentDashboardAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Audit failed:', err);
    process.exit(1);
  });
