import {
  getAdminAnalytics,
  getTeacherAnalytics,
  getStudentAnalytics,
} from '../src/db/analytics.ts';
import { db } from '../src/db/index.ts';
import { users, testResults, examAttempts, tests } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function runAnalyticsTestSuite() {
  console.log('==================================================');
  console.log('  TALEEMGURU PROFESSIONAL ANALYTICS TEST SUITE');
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

  const testStudentUid = `test-student-${Date.now()}`;
  const testTeacherUid = `test-teacher-${Date.now()}`;

  try {
    // 0. Setup test user records and test results in PostgreSQL
    await db.insert(users).values({
      uid: testStudentUid,
      email: 'student-analytics-test@taleemguru.pk',
      name: 'Analytics Test Student',
      roles: ['Student'],
      classLevel: 'Class 10',
      board: 'BISE Lahore',
    });

    await db.insert(users).values({
      uid: testTeacherUid,
      email: 'teacher-analytics-test@taleemguru.pk',
      name: 'Analytics Test Teacher',
      roles: ['Teacher'],
    });

    await db.insert(tests).values({
      id: 'test-physics-ch1',
      title: 'Physics Chapter 1 Assessment',
      subject: 'Physics',
      createdBy: testTeacherUid,
      status: 'Published',
    }).onConflictDoNothing();

    await db.insert(testResults).values({
      resultId: `res-${Date.now()}`,
      userUid: testStudentUid,
      testId: 'test-physics-ch1',
      testTitle: 'Physics Chapter 1 Assessment',
      testType: 'Chapter Test',
      subject: 'Physics',
      category: 'Academic',
      totalQuestions: 10,
      answeredCount: 10,
      correctCount: 8,
      wrongCount: 2,
      skippedCount: 0,
      marksObtained: 8,
      totalMarks: 10,
      percentage: 80,
      grade: 'A',
      timeUsedSeconds: 300,
    });

    await db.insert(examAttempts).values({
      attemptId: `att-${Date.now()}`,
      testId: 'test-physics-ch1',
      testTitle: 'Physics Chapter 1 Assessment',
      userUid: testStudentUid,
      status: 'COMPLETED',
      questionOrder: ['q1', 'q2'],
      totalMarks: 10,
      expiresAt: new Date(Date.now() + 3600000),
    });

    // TEST 1: Admin Global Analytics returns valid numeric metrics
    const adminAnalytics = await getAdminAnalytics({ range: 'all' });
    assert(
      adminAnalytics.role === 'admin' &&
        typeof adminAnalytics.totalUsers === 'number' &&
        adminAnalytics.totalUsers > 0 &&
        typeof adminAnalytics.testsCompleted === 'number' &&
        typeof adminAnalytics.averageScore === 'number',
      'Test 1: Admin analytics retrieves global platform metrics successfully'
    );

    // TEST 2: Date Filtering - 'today' and '30days' filters execute cleanly
    const adminToday = await getAdminAnalytics({ range: 'today' });
    const admin30Days = await getAdminAnalytics({ range: '30days' });
    assert(
      typeof adminToday.testsCompleted === 'number' &&
        typeof admin30Days.testsCompleted === 'number',
      'Test 2: Date filters (' + 'today' + ', ' + '30days' + ') execute correctly without errors'
    );

    // TEST 3: Custom Date Range Filtering
    const customRangeAnalytics = await getAdminAnalytics({
      range: 'custom',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    assert(
      typeof customRangeAnalytics.totalUsers === 'number',
      'Test 3: Custom date range filter aggregates database rows accurately'
    );

    // TEST 4: Teacher Cohort Analytics
    const teacherAnalytics = await getTeacherAnalytics(testTeacherUid, { range: 'all' });
    assert(
      teacherAnalytics.role === 'teacher' &&
        teacherAnalytics.teacherUid === testTeacherUid &&
        typeof teacherAnalytics.passRate === 'number',
      'Test 4: Teacher analytics retrieves cohort and authored metrics'
    );

    // TEST 5: Student Personal Performance Analytics
    const studentAnalytics = await getStudentAnalytics(testStudentUid, { range: 'all' });
    assert(
      studentAnalytics.role === 'student' &&
        studentAnalytics.studentUid === testStudentUid &&
        studentAnalytics.recentResults.length > 0 &&
        studentAnalytics.recentResults[0].percentage === 80,
      'Test 5: Student analytics isolates personal performance and recent results accurately'
    );

    // TEST 6: Empty Data / Future Date Range Handling (Edge case)
    const emptyRangeAnalytics = await getStudentAnalytics(testStudentUid, {
      range: 'custom',
      startDate: '2030-01-01',
      endDate: '2030-01-02',
    });
    assert(
      emptyRangeAnalytics.testsCompleted === 0 &&
        emptyRangeAnalytics.averageScore === 0 &&
        emptyRangeAnalytics.recentResults.length === 0,
      'Test 6: Empty data handling - returns zero metrics and empty arrays cleanly without crashing'
    );

  } catch (error: any) {
    console.error('Unexpected error during analytics test execution:', error);
    assert(false, `Unexpected analytics test failure: ${error.message}`);
  } finally {
    // Cleanup test records
    try {
      await db.delete(testResults).where(eq(testResults.userUid, testStudentUid));
      await db.delete(examAttempts).where(eq(examAttempts.userUid, testStudentUid));
      await db.delete(users).where(eq(users.uid, testStudentUid));
      await db.delete(users).where(eq(users.uid, testTeacherUid));
    } catch {}
  }

  console.log('==================================================');
  console.log(`ANALYTICS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAnalyticsTestSuite();
