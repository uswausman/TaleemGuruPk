import { db } from './index.ts';
import { users, testResults, examAttempts, mcqs, tests, pastPapers, studyNotes, documents, documentDownloadEvents, staffAssignments } from './schema.ts';
import { sql, eq, and, gte, lte, count, avg, desc, inArray } from 'drizzle-orm';

export interface AnalyticsDateFilter {
  range?: 'today' | '7days' | '30days' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
}

function getDateCondition(column: any, filter?: AnalyticsDateFilter) {
  if (!filter || !filter.range || filter.range === 'all') {
    return undefined;
  }

  const now = new Date();
  let start = new Date();

  if (filter.range === 'today') {
    start.setHours(0, 0, 0, 0);
    return gte(column, start);
  } else if (filter.range === '7days') {
    start.setDate(now.getDate() - 7);
    return gte(column, start);
  } else if (filter.range === '30days') {
    start.setDate(now.getDate() - 30);
    return gte(column, start);
  } else if (filter.range === 'custom' && filter.startDate && filter.endDate) {
    const customStart = new Date(filter.startDate);
    const customEnd = new Date(filter.endDate);
    customEnd.setHours(23, 59, 59, 999);
    return and(gte(column, customStart), lte(column, customEnd));
  }

  return undefined;
}

// 1. ADMIN GLOBAL ANALYTICS
export async function getAdminAnalytics(filter?: AnalyticsDateFilter) {
  const dateCondUsers = getDateCondition(users.createdAt, filter);
  const dateCondResults = getDateCondition(testResults.createdAt, filter);
  const dateCondAttempts = getDateCondition(examAttempts.createdAt, filter);
  const dateCondDownloads = getDateCondition(documentDownloadEvents.downloadedAt, filter);

  // Registered users count
  const totalUsersQuery = dateCondUsers
    ? db.select({ count: count() }).from(users).where(dateCondUsers)
    : db.select({ count: count() }).from(users);

  // Active users (users who took a test or logged an attempt or download in period)
  const activeUsersQuery = db
    .select({ count: sql<number>`count(DISTINCT ${testResults.userUid})` })
    .from(testResults)
    .where(dateCondResults);

  // Tests started (exam attempts)
  const testsStartedQuery = dateCondAttempts
    ? db.select({ count: count() }).from(examAttempts).where(dateCondAttempts)
    : db.select({ count: count() }).from(examAttempts);

  // Tests completed (test results)
  const testsCompletedQuery = dateCondResults
    ? db.select({ count: count() }).from(testResults).where(dateCondResults)
    : db.select({ count: count() }).from(testResults);

  // Average score & Pass rates
  const resultsQuery = dateCondResults
    ? db.select({ percentage: testResults.percentage, passed: sql<boolean>`${testResults.percentage} >= 50` }).from(testResults).where(dateCondResults)
    : db.select({ percentage: testResults.percentage, passed: sql<boolean>`${testResults.percentage} >= 50` }).from(testResults);

  // Downloads count
  const downloadsQuery = dateCondDownloads
    ? db.select({ count: count() }).from(documentDownloadEvents).where(dateCondDownloads)
    : db.select({ count: count() }).from(documentDownloadEvents);

  // Content counts
  const mcqsCountQuery = db.select({ count: count() }).from(mcqs);
  const testsCountQuery = db.select({ count: count() }).from(tests);
  const pastPapersCountQuery = db.select({ count: count() }).from(pastPapers);
  const notesCountQuery = db.select({ count: count() }).from(studyNotes);

  // Popular Subjects (from testResults)
  const popularSubjectsQuery = db
    .select({
      subject: testResults.subject,
      count: count(),
    })
    .from(testResults)
    .groupBy(testResults.subject)
    .orderBy(desc(count()))
    .limit(5);

  // Teacher / Content contributions
  const contributionsQuery = db
    .select({
      author: tests.createdBy,
      count: count(),
    })
    .from(tests)
    .where(sql`${tests.createdBy} IS NOT NULL`)
    .groupBy(tests.createdBy)
    .orderBy(desc(count()))
    .limit(5);

  const [
    totalUsersRes,
    activeUsersRes,
    testsStartedRes,
    testsCompletedRes,
    resultsRes,
    downloadsRes,
    mcqsRes,
    testsRes,
    pastPapersRes,
    notesRes,
    popularSubjectsRes,
    contributionsRes,
  ] = await Promise.all([
    totalUsersQuery,
    activeUsersQuery,
    testsStartedQuery,
    testsCompletedQuery,
    resultsQuery,
    downloadsQuery,
    mcqsCountQuery,
    testsCountQuery,
    pastPapersCountQuery,
    notesCountQuery,
    popularSubjectsQuery,
    contributionsQuery,
  ]);

  const totalUsers = Number(totalUsersRes[0]?.count || 0);
  const activeUsers = Number(activeUsersRes[0]?.count || 0);
  const testsStarted = Number(testsStartedRes[0]?.count || 0);
  const testsCompleted = Number(testsCompletedRes[0]?.count || 0);
  const totalDownloads = Number(downloadsRes[0]?.count || 0);

  const totalScores = resultsRes.reduce((acc, r) => acc + (r.percentage || 0), 0);
  const averageScore = resultsRes.length > 0 ? Math.round(totalScores / resultsRes.length) : 0;
  const passCount = resultsRes.filter((r) => r.percentage >= 50).length;
  const passRate = resultsRes.length > 0 ? Math.round((passCount / resultsRes.length) * 100) : 0;

  return {
    role: 'admin',
    totalUsers,
    activeUsers,
    testsStarted,
    testsCompleted,
    totalAttempts: testsStarted,
    averageScore,
    passRate,
    totalDownloads,
    contentStats: {
      mcqs: Number(mcqsRes[0]?.count || 0),
      tests: Number(testsRes[0]?.count || 0),
      pastPapers: Number(pastPapersRes[0]?.count || 0),
      studyNotes: Number(notesRes[0]?.count || 0),
    },
    popularSubjects: popularSubjectsRes.map((s) => ({ subject: s.subject, attempts: Number(s.count) })),
    teacherContributions: contributionsRes.map((c) => ({ author: c.author || 'System', testsAuthored: Number(c.count) })),
  };
}

// 2. TEACHER COHORT ANALYTICS
export async function getTeacherAnalytics(teacherUid: string, filter?: AnalyticsDateFilter) {
  // Get teacher assignments or authored items
  const assignments = await db
    .select()
    .from(staffAssignments)
    .where(eq(staffAssignments.userUid, teacherUid));

  const subjectsTaught = assignments.map((a) => a.subject).filter((s) => s !== 'All');

  const dateCondResults = getDateCondition(testResults.createdAt, filter);
  const dateCondAttempts = getDateCondition(examAttempts.createdAt, filter);

  // Tests authored or in teacher subjects
  const authoredTests = await db
    .select({ id: tests.id })
    .from(tests)
    .where(eq(tests.createdBy, teacherUid));

  const authTestIds = authoredTests.map((t) => t.id);

  if (authTestIds.length === 0) {
    return {
      role: 'teacher',
      teacherUid,
      authoredTestsCount: 0,
      testsStarted: 0,
      testsCompleted: 0,
      averageScore: 0,
      passRate: 0,
      cohortSubmissions: 0,
    };
  }

  // Results for tests authored by teacher or in teacher subjects
  const results = await db
    .select()
    .from(testResults)
    .where(dateCondResults ? and(dateCondResults, inArray(testResults.testId, authTestIds)) : inArray(testResults.testId, authTestIds));

  const totalSubmissions = results.length;
  const totalScores = results.reduce((acc, r) => acc + (r.percentage || 0), 0);
  const averageScore = totalSubmissions > 0 ? Math.round(totalScores / totalSubmissions) : 0;
  const passCount = results.filter((r) => r.percentage >= 50).length;
  const passRate = totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0;

  // Attempts started
  const attempts = await db
    .select({ count: count() })
    .from(examAttempts)
    .where(dateCondAttempts ? and(dateCondAttempts, inArray(examAttempts.testId, authTestIds)) : inArray(examAttempts.testId, authTestIds));

  return {
    role: 'teacher',
    teacherUid,
    authoredTestsCount: authTestIds.length,
    testsStarted: Number(attempts[0]?.count || 0),
    testsCompleted: totalSubmissions,
    averageScore,
    passRate,
    cohortSubmissions: totalSubmissions,
  };
}

// 3. STUDENT PERSONAL PERFORMANCE ANALYTICS
export async function getStudentAnalytics(studentUid: string, filter?: AnalyticsDateFilter) {
  const dateCondResults = getDateCondition(testResults.createdAt, filter);
  const dateCondAttempts = getDateCondition(examAttempts.createdAt, filter);

  const results = await db
    .select()
    .from(testResults)
    .where(dateCondResults ? and(eq(testResults.userUid, studentUid), dateCondResults) : eq(testResults.userUid, studentUid))
    .orderBy(desc(testResults.createdAt));

  const attempts = await db
    .select({ count: count() })
    .from(examAttempts)
    .where(dateCondAttempts ? and(eq(examAttempts.userUid, studentUid), dateCondAttempts) : eq(examAttempts.userUid, studentUid));

  const totalTestsTaken = results.length;
  const totalScores = results.reduce((acc, r) => acc + (r.percentage || 0), 0);
  const averageScore = totalTestsTaken > 0 ? Math.round(totalScores / totalTestsTaken) : 0;
  const passCount = results.filter((r) => r.percentage >= 50).length;
  const passRate = totalTestsTaken > 0 ? Math.round((passCount / totalTestsTaken) * 100) : 0;

  return {
    role: 'student',
    studentUid,
    testsStarted: Number(attempts[0]?.count || 0),
    testsCompleted: totalTestsTaken,
    averageScore,
    passRate,
    recentResults: results.slice(0, 10).map((r) => ({
      testTitle: r.testTitle,
      subject: r.subject,
      score: r.marksObtained,
      totalMarks: r.totalMarks,
      percentage: r.percentage,
      grade: r.grade,
      createdAt: r.createdAt,
    })),
  };
}
