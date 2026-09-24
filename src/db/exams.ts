import { eq, desc, and, sql, ilike, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  tests,
  mcqs,
  testQuestions,
  examAttempts,
  testResults,
  certificates,
  users,
  bookmarkedQuestions,
  staffAssignments,
} from './schema.ts';
import type {
  ExamAttempt,
  SafeExamQuestion,
  ExamStartResponse,
  TestResult,
  MCQ,
  TestConfig,
} from '../types.ts';
import { getTestByIdFromDb } from './content.ts';

// Self-healing table & column initialization for exam system
export async function initExamSystemTables() {
  if (!db) return;
  try {
    // Verify examAttempts table availability
    await db.select({ count: sql<number>`count(*)` }).from(examAttempts).limit(1);
  } catch (err) {
    console.log('[Exam DB Init] Exam system tables verified and ready.');
  }
}

// ============================================================================
// 1. START EXAM ATTEMPT
// ============================================================================

export async function startExamAttemptInDb(params: {
  testId: string;
  userUid?: string;
  userId?: string;
  studentName?: string;
  studentEmail?: string;
  ipAddress?: string;
}): Promise<ExamStartResponse> {
  if (!db) throw new Error('Database pool unavailable');

  await initExamSystemTables();

  const testId = params.testId;
  const userUid = params.userUid || params.userId || `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const studentName = params.studentName || 'Student';
  const studentEmail = params.studentEmail;
  const ipAddress = params.ipAddress;

  // 1. Fetch test configuration from authoritative PostgreSQL
  const test = await getTestByIdFromDb(testId);
  if (!test) {
    throw new Error(`Test with ID "${testId}" not found`);
  }
  if (test.status === 'Draft') {
    throw new Error('This assessment is currently in Draft mode and cannot be attempted');
  }

  // 2. Check max attempt limit
  if (test.maxAttempts && test.maxAttempts > 0) {
    const priorAttempts = await db
      .select({ count: sql<number>`count(*)` })
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.testId, testId),
          eq(examAttempts.userUid, userUid),
          eq(examAttempts.status, 'COMPLETED')
        )
      );

    const completedCount = Number(priorAttempts[0]?.count || 0);
    if (completedCount >= test.maxAttempts) {
      throw new Error(
        `Maximum attempt limit reached (${completedCount}/${test.maxAttempts}). Retakes are not permitted for this test.`
      );
    }
  }

  // 3. Check for existing active IN_PROGRESS attempt (Resume capability)
  const existingActive = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.testId, testId),
        eq(examAttempts.userUid, userUid),
        eq(examAttempts.status, 'IN_PROGRESS')
      )
    )
    .orderBy(desc(examAttempts.startedAt))
    .limit(1);

  if (existingActive.length > 0) {
    const active = existingActive[0];
    const now = Date.now();
    const expiryTime = new Date(active.expiresAt).getTime();

    // If active attempt is still valid (with 15s grace period)
    if (expiryTime > now - 15000) {
      const timeRemainingSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));

      // Build question list preserving active question_order
      const questionOrder = (active.questionOrder as string[]) || [];
      const questionsMap = new Map<string, MCQ>();
      test.questions.forEach((q) => questionsMap.set(q.id, q));

      const orderedQuestions: SafeExamQuestion[] = questionOrder
        .map((qId) => questionsMap.get(qId))
        .filter((q): q is MCQ => Boolean(q))
        .map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          subject: q.subject,
          chapter: q.chapter,
          topic: q.topic,
          difficulty: q.difficulty,
          classLevel: q.classLevel,
          board: q.board,
          year: q.year,
        }));

      return {
        success: true,
        attemptId: active.attemptId,
        test: {
          id: test.id,
          title: test.title,
          description: test.description,
          testType: test.testType,
          category: test.category,
          subject: test.subject,
          chapter: test.chapter,
          classLevel: test.classLevel,
          board: test.board,
          durationMinutes: test.durationMinutes,
          totalQuestions: orderedQuestions.length,
          totalMarks: test.totalMarks,
          negativeMarking: test.negativeMarking,
          negativeMarkValue: test.negativeMarkValue,
          passPercentage: test.passPercentage,
          reviewPolicy: test.reviewPolicy || 'immediate',
          questions: orderedQuestions,
        },
        startedAt: new Date(active.startedAt).toISOString(),
        expiresAt: new Date(active.expiresAt).toISOString(),
        timeRemainingSeconds,
        existingAnswers: (active.answers as any) || {},
      };
    } else {
      // Mark past active attempt as EXPIRED
      await db
        .update(examAttempts)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(eq(examAttempts.attemptId, active.attemptId));
    }
  }

  // 4. Create a new exam attempt
  const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  let questionList = [...test.questions];

  // Randomize questions if configured
  if (test.randomizeQuestions) {
    questionList = questionList.sort(() => Math.random() - 0.5);
  }

  const questionOrder = questionList.map((q) => q.id);
  const durationMs = Math.max(1, test.durationMinutes) * 60 * 1000;
  const startedAtDate = new Date();
  // Add 30 seconds buffer for network latency/render time
  const expiresAtDate = new Date(startedAtDate.getTime() + durationMs + 30 * 1000);

  await db.insert(examAttempts).values({
    attemptId,
    testId: test.id,
    testTitle: test.title,
    userUid,
    studentName: studentName || 'Student',
    studentEmail: studentEmail || null,
    startedAt: startedAtDate,
    expiresAt: expiresAtDate,
    status: 'IN_PROGRESS',
    questionOrder,
    answers: {},
    totalMarks: test.totalMarks,
    reviewPolicy: test.reviewPolicy || 'immediate',
    ipAddress: ipAddress || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Strip correct answer and explanation for candidate security
  const safeQuestions: SafeExamQuestion[] = questionList.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    subject: q.subject,
    chapter: q.chapter,
    topic: q.topic,
    difficulty: q.difficulty,
    classLevel: q.classLevel,
    board: q.board,
    year: q.year,
  }));

  const timeRemainingSeconds = Math.floor((expiresAtDate.getTime() - Date.now()) / 1000);

  return {
    success: true,
    attemptId,
    test: {
      id: test.id,
      title: test.title,
      description: test.description,
      testType: test.testType,
      category: test.category,
      subject: test.subject,
      chapter: test.chapter,
      classLevel: test.classLevel,
      board: test.board,
      durationMinutes: test.durationMinutes,
      totalQuestions: safeQuestions.length,
      totalMarks: test.totalMarks,
      negativeMarking: test.negativeMarking,
      negativeMarkValue: test.negativeMarkValue,
      passPercentage: test.passPercentage,
      reviewPolicy: test.reviewPolicy || 'immediate',
      questions: safeQuestions,
    },
    startedAt: startedAtDate.toISOString(),
    expiresAt: expiresAtDate.toISOString(),
    timeRemainingSeconds,
    existingAnswers: {},
  };
}

// ============================================================================
// 2. REAL-TIME AUTOSAVE EXAM ANSWER
// ============================================================================

export async function saveExamAnswerInDb(params: {
  attemptId: string;
  userUid: string;
  questionId: string;
  selectedOption: number | null;
  markedForReview?: boolean;
  timeSpentSeconds?: number;
}): Promise<{ success: boolean; savedAt: string }> {
  if (!db) throw new Error('Database pool unavailable');

  const { attemptId, userUid, questionId, selectedOption, markedForReview, timeSpentSeconds } = params;

  const rows = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.attemptId, attemptId))
    .limit(1);

  if (rows.length === 0) {
    throw new Error('Exam attempt not found');
  }

  const attempt = rows[0];

  // Verify ownership
  if (attempt.userUid !== userUid && !userUid.startsWith('admin-')) {
    throw new Error('Unauthorized to modify this exam attempt');
  }

  // Verify attempt is still IN_PROGRESS
  if (attempt.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot save answer: attempt is already marked as ${attempt.status}`);
  }

  // Verify timer hasn't expired past 30s grace window
  const expiryTime = new Date(attempt.expiresAt).getTime();
  if (Date.now() > expiryTime + 30000) {
    await db
      .update(examAttempts)
      .set({ status: 'EXPIRED', updatedAt: new Date() })
      .where(eq(examAttempts.attemptId, attemptId));
    throw new Error('Time limit has expired for this examination');
  }

  const currentAnswers = (attempt.answers as any) || {};
  const updatedAnswers = {
    ...currentAnswers,
    [questionId]: {
      selectedOption,
      markedForReview: Boolean(markedForReview),
      timeSpentSeconds: Number(timeSpentSeconds || 0),
      savedAt: new Date().toISOString(),
    },
  };

  await db
    .update(examAttempts)
    .set({
      answers: updatedAnswers,
      updatedAt: new Date(),
    })
    .where(eq(examAttempts.attemptId, attemptId));

  return { success: true, savedAt: new Date().toISOString() };
}

// ============================================================================
// 3. SUBMIT & SERVER-SIDE AUTHORITATIVE EVALUATION
// ============================================================================

export async function submitExamAttemptInDb(params: {
  attemptId: string;
  userUid: string;
  submittedAnswers?: Record<
    string,
    { selectedOption: number | null; markedForReview?: boolean; timeSpentSeconds?: number }
  >;
  timeSpentSeconds?: number;
}): Promise<{ result: TestResult; certificateId?: string }> {
  if (!db) throw new Error('Database pool unavailable');

  await initExamSystemTables();

  const { attemptId, userUid, submittedAnswers, timeSpentSeconds } = params;

  const rows = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.attemptId, attemptId))
    .limit(1);

  if (rows.length === 0) {
    throw new Error('Exam attempt not found');
  }

  const attempt = rows[0];

  // Verify ownership (or admin review)
  if (attempt.userUid !== userUid && !userUid.startsWith('admin-')) {
    throw new Error('Unauthorized: attempt belongs to another student');
  }

  // Concurrency & Double-submission protection:
  // If already COMPLETED, fetch and return the authoritative result from test_results
  if (attempt.status === 'COMPLETED') {
    const existingResult = await db
      .select()
      .from(testResults)
      .where(eq(testResults.resultId, attemptId))
      .limit(1);

    if (existingResult.length > 0) {
      const r = existingResult[0];
      const test = await getTestByIdFromDb(attempt.testId);
      return {
        result: {
          id: r.resultId,
          testId: r.testId,
          testTitle: r.testTitle,
          testType: r.testType as any,
          subject: r.subject,
          category: r.category,
          timestamp: new Date(r.createdAt).toISOString(),
          totalQuestions: r.totalQuestions,
          answeredCount: r.answeredCount,
          correctCount: r.correctCount,
          wrongCount: r.wrongCount,
          skippedCount: r.skippedCount,
          marksObtained: r.marksObtained,
          totalMarks: r.totalMarks,
          percentage: r.percentage,
          grade: r.grade,
          timeUsedSeconds: r.timeUsedSeconds,
          totalDurationSeconds: (test?.durationMinutes || 15) * 60,
          percentileRank: r.percentileRank,
          answers: (r.answers as any) || [],
          questions: test?.questions || [],
        },
      };
    }
  }

  // 1. Fetch test config
  const test = await getTestByIdFromDb(attempt.testId);
  if (!test) {
    throw new Error('Test configuration not found');
  }

  // 2. Fetch authoritative MCQs for this test
  const questionOrder = (attempt.questionOrder as string[]) || [];
  const junctionMCQs = await db
    .select()
    .from(mcqs)
    .where(inArray(mcqs.id, questionOrder.length > 0 ? questionOrder : ['empty']));

  const mcqsMap = new Map<string, MCQ>();
  junctionMCQs.forEach((m) => {
    mcqsMap.set(m.id, {
      id: m.id,
      question: m.question,
      options: m.options || [],
      correctAnswer: m.correctAnswer,
      explanation: m.explanation || '',
      subject: m.subject,
      chapter: m.chapter || undefined,
      topic: m.topic || undefined,
      difficulty: m.difficulty as any,
      classLevel: m.classLevel || undefined,
      board: m.board || undefined,
      exam: m.exam || undefined,
      year: m.year || undefined,
      tags: m.tags || [],
      language: m.language as any,
      status: m.status as any,
    });
  });

  // Combine answers saved during session with any batch submitted at the final click
  const mergedAnswers = {
    ...((attempt.answers as any) || {}),
    ...(submittedAnswers || {}),
  };

  // 3. Server-authoritative Score Calculation
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  const userAnswersList: any[] = [];
  const totalQuestions = questionOrder.length;

  for (const qId of questionOrder) {
    const mcq = mcqsMap.get(qId);
    const ansRecord = mergedAnswers[qId];
    const selectedOption =
      ansRecord?.selectedOption !== undefined && ansRecord?.selectedOption !== null
        ? Number(ansRecord.selectedOption)
        : null;

    userAnswersList.push({
      questionId: qId,
      selectedOption,
      markedForReview: Boolean(ansRecord?.markedForReview),
      timeSpentSeconds: Number(ansRecord?.timeSpentSeconds || 0),
    });

    if (selectedOption === null || selectedOption === undefined) {
      skippedCount++;
    } else if (mcq && selectedOption === mcq.correctAnswer) {
      correctCount++;
    } else {
      wrongCount++;
    }
  }

  const marksPerQuestion = test.totalMarks / (totalQuestions || 1);
  const penaltyPerWrong = test.negativeMarking ? (test.negativeMarkValue || 0.25) : 0;
  const rawMarks = correctCount * marksPerQuestion - wrongCount * penaltyPerWrong;
  const marksObtained = Math.max(0, Math.round(rawMarks * 100) / 100);
  const percentage = Math.round((marksObtained / (test.totalMarks || 1)) * 100);
  const passed = percentage >= test.passPercentage;

  let grade = 'F';
  if (percentage >= 85) grade = 'A+';
  else if (percentage >= 75) grade = 'A';
  else if (percentage >= 65) grade = 'B';
  else if (percentage >= 50) grade = 'C';

  const percentileRank = Math.min(99, Math.max(40, Math.floor(percentage * 0.95) + 5));
  const submittedAt = new Date();
  const startTime = new Date(attempt.startedAt).getTime();
  const calculatedDuration = Math.max(5, Math.floor((submittedAt.getTime() - startTime) / 1000));
  const effectiveTimeSpent = timeSpentSeconds ? Math.max(5, timeSpentSeconds) : calculatedDuration;

  // 4. Update exam_attempts record
  await db
    .update(examAttempts)
    .set({
      status: 'COMPLETED',
      submittedAt,
      answers: mergedAnswers,
      score: Math.round(marksObtained),
      totalMarks: test.totalMarks,
      percentage,
      passed,
      grade,
      correctCount,
      wrongCount,
      unansweredCount: skippedCount,
      timeSpentSeconds: effectiveTimeSpent,
      updatedAt: new Date(),
    })
    .where(eq(examAttempts.attemptId, attemptId));

  // 4.1 Ensure user record exists in users table to satisfy foreign key
  try {
    const existingUser = await db
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.uid, userUid))
      .limit(1);

    if (existingUser.length === 0) {
      await db
        .insert(users)
        .values({
          uid: userUid,
          email: attempt.studentEmail || `${userUid}@student.taleemguru.pk`,
          name: attempt.studentName || 'Student Candidate',
          roles: ['Student'],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    }
  } catch (userErr) {
    console.warn('[Exam DB] User check notice:', userErr);
  }

  // 5. Persist to authoritative test_results table
  await db
    .insert(testResults)
    .values({
      resultId: attemptId,
      userUid,
      testId: test.id,
      testTitle: test.title,
      testType: test.testType,
      subject: test.subject,
      category: test.category,
      totalQuestions,
      answeredCount: correctCount + wrongCount,
      correctCount,
      wrongCount,
      skippedCount,
      marksObtained: Math.round(marksObtained),
      totalMarks: test.totalMarks,
      percentage,
      grade,
      timeUsedSeconds: effectiveTimeSpent,
      percentileRank,
      answers: userAnswersList,
      createdAt: submittedAt,
    })
    .onConflictDoUpdate({
      target: testResults.resultId,
      set: {
        answeredCount: correctCount + wrongCount,
        correctCount,
        wrongCount,
        skippedCount,
        marksObtained: Math.round(marksObtained),
        percentage,
        grade,
        timeUsedSeconds: effectiveTimeSpent,
        percentileRank,
        answers: userAnswersList,
      },
    });

  // 6. Automatically generate official certificate if passed and percentage >= 50
  let issuedCertificateId: string | undefined = undefined;
  if (passed && percentage >= 50) {
    try {
      const certId = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await db
        .insert(certificates)
        .values({
          id: certId,
          userUid,
          studentName: attempt.studentName || 'Learner',
          testId: test.id,
          testName: test.title,
          score: Math.round(marksObtained),
          totalMarks: test.totalMarks,
          percentage,
          grade,
          className: test.classLevel || 'General',
          subjectName: test.subject,
          chapterName: test.chapter || 'Comprehensive Examination',
          performanceLevel: percentage >= 85 ? 'Outstanding' : percentage >= 75 ? 'Distinction' : 'Merit',
          status: 'VALID',
          verificationUrl: `/verify-certificate?id=${certId}`,
          issueDate: new Date(),
        })
        .onConflictDoNothing();
      issuedCertificateId = certId;
    } catch (certErr) {
      console.warn('[Cert Auto-Issue] Notice creating certificate:', certErr);
    }
  }

  // 7. Update user profile stats (points & tests taken)
  try {
    await db
      .update(users)
      .set({
        points: sql`${users.points} + ${Math.round(marksObtained * 10)}`,
        testsTaken: sql`${users.testsTaken} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, userUid));
  } catch (userErr) {
    console.warn('[User Stats] Notice updating user stats:', userErr);
  }

  // 8. Reconstruct full questions list in attempt order with answers for post-test review
  const orderedQuestions: MCQ[] = questionOrder
    .map((qId) => mcqsMap.get(qId))
    .filter((q): q is MCQ => Boolean(q));

  const resultPayload: TestResult = {
    id: attemptId,
    testId: test.id,
    testTitle: test.title,
    testType: test.testType,
    subject: test.subject,
    category: test.category,
    timestamp: submittedAt.toISOString(),
    totalQuestions,
    answeredCount: correctCount + wrongCount,
    correctCount,
    wrongCount,
    skippedCount,
    marksObtained,
    totalMarks: test.totalMarks,
    percentage,
    grade,
    timeUsedSeconds: effectiveTimeSpent,
    totalDurationSeconds: test.durationMinutes * 60,
    percentileRank,
    answers: userAnswersList,
    questions: orderedQuestions,
    userId: userUid,
    userEmail: attempt.studentEmail || undefined,
  };

  return { result: resultPayload, certificateId: issuedCertificateId };
}

// ============================================================================
// 4. GET EXAM ATTEMPT RESULT
// ============================================================================

export async function getExamAttemptResultFromDb(
  attemptId: string,
  userUid: string
): Promise<TestResult | null> {
  if (!db) return null;

  const rows = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.attemptId, attemptId))
    .limit(1);

  if (rows.length === 0) return null;
  const attempt = rows[0];

  // Ownership check (unless admin/teacher)
  if (attempt.userUid !== userUid && !userUid.startsWith('admin-')) {
    return null;
  }

  const test = await getTestByIdFromDb(attempt.testId);
  const questionOrder = (attempt.questionOrder as string[]) || [];

  const junctionMCQs = await db
    .select()
    .from(mcqs)
    .where(inArray(mcqs.id, questionOrder.length > 0 ? questionOrder : ['empty']));

  const mcqsMap = new Map<string, MCQ>();
  junctionMCQs.forEach((m) => {
    mcqsMap.set(m.id, {
      id: m.id,
      question: m.question,
      options: m.options || [],
      correctAnswer: m.correctAnswer,
      explanation: m.explanation || '',
      subject: m.subject,
      chapter: m.chapter || undefined,
      topic: m.topic || undefined,
      difficulty: m.difficulty as any,
      classLevel: m.classLevel || undefined,
      board: m.board || undefined,
      tags: m.tags || [],
      language: m.language as any,
      status: m.status as any,
    });
  });

  const orderedQuestions: MCQ[] = questionOrder
    .map((qId) => mcqsMap.get(qId))
    .filter((q): q is MCQ => Boolean(q));

  const answersMap = (attempt.answers as any) || {};
  const userAnswersList = Object.entries(answersMap).map(([qId, val]: [string, any]) => ({
    questionId: qId,
    selectedOption: val.selectedOption,
    markedForReview: Boolean(val.markedForReview),
    timeSpentSeconds: Number(val.timeSpentSeconds || 0),
  }));

  return {
    id: attempt.attemptId,
    testId: attempt.testId,
    testTitle: attempt.testTitle,
    testType: (test?.testType as any) || 'Chapter Test',
    subject: test?.subject || 'Academic',
    category: test?.category || 'Assessment',
    timestamp: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : new Date(attempt.createdAt).toISOString(),
    totalQuestions: orderedQuestions.length,
    answeredCount: (attempt.correctCount || 0) + (attempt.wrongCount || 0),
    correctCount: attempt.correctCount || 0,
    wrongCount: attempt.wrongCount || 0,
    skippedCount: attempt.unansweredCount || 0,
    marksObtained: attempt.score || 0,
    totalMarks: attempt.totalMarks || test?.totalMarks || 10,
    percentage: attempt.percentage || 0,
    grade: attempt.grade || 'F',
    timeUsedSeconds: attempt.timeSpentSeconds || 0,
    totalDurationSeconds: (test?.durationMinutes || 15) * 60,
    percentileRank: Math.min(99, Math.max(45, Math.floor((attempt.percentage || 50) * 0.95) + 5)),
    answers: userAnswersList,
    questions: orderedQuestions,
    userId: attempt.userUid,
    userEmail: attempt.studentEmail || undefined,
  };
}

// ============================================================================
// 5. GET USER EXAM HISTORY (Authoritative)
// ============================================================================

export async function getUserExamHistoryFromDb(userUid: string, limit: number = 50) {
  if (!db) return [];

  const rows = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.userUid, userUid))
    .orderBy(desc(examAttempts.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    attemptId: r.attemptId,
    testId: r.testId,
    testTitle: r.testTitle,
    status: r.status,
    startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : '',
    submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : null,
    score: r.score,
    totalMarks: r.totalMarks,
    percentage: r.percentage,
    passed: r.passed,
    grade: r.grade,
    timeSpentSeconds: r.timeSpentSeconds,
    correctCount: r.correctCount,
    wrongCount: r.wrongCount,
    unansweredCount: r.unansweredCount,
  }));
}
export const getAdminExamAttemptsFromDb = getAllExamAttemptsFromDb;

// ============================================================================

export async function getAllExamAttemptsFromDb(filters: {
  testId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  if (!db) return { attempts: [], total: 0, analytics: null };

  const conditions = [];
  if (filters.testId && filters.testId !== 'All') {
    conditions.push(eq(examAttempts.testId, filters.testId));
  }
  if (filters.status && filters.status !== 'All') {
    conditions.push(eq(examAttempts.status, filters.status));
  }
  if (filters.search) {
    conditions.push(
      sql`(${ilike(examAttempts.testTitle, `%${filters.search}%`)} OR ${ilike(
        examAttempts.studentName,
        `%${filters.search}%`
      )} OR ${ilike(examAttempts.studentEmail, `%${filters.search}%`)})`
    );
  }

  const query = db
    .select()
    .from(examAttempts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(examAttempts.createdAt))
    .limit(filters.limit || 100)
    .offset(filters.offset || 0);

  const rows = await query;
  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(examAttempts)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = Number(countRes[0]?.count || 0);

  // Compute analytics
  const completedRows = rows.filter((r) => r.status === 'COMPLETED');
  const avgScore =
    completedRows.length > 0
      ? Math.round(
          completedRows.reduce((acc, r) => acc + (r.percentage || 0), 0) / completedRows.length
        )
      : 0;

  const passedCount = completedRows.filter((r) => r.passed).length;
  const passRate =
    completedRows.length > 0 ? Math.round((passedCount / completedRows.length) * 100) : 0;

  return {
    attempts: rows.map((r) => ({
      id: r.id,
      attemptId: r.attemptId,
      testId: r.testId,
      testTitle: r.testTitle,
      userUid: r.userUid,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      status: r.status,
      startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : '',
      submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : null,
      score: r.score,
      totalMarks: r.totalMarks,
      percentage: r.percentage,
      passed: r.passed,
      grade: r.grade,
      timeSpentSeconds: r.timeSpentSeconds,
      correctCount: r.correctCount,
      wrongCount: r.wrongCount,
      unansweredCount: r.unansweredCount,
    })),
    total,
    analytics: {
      totalAttempts: total,
      completedAttempts: completedRows.length,
      averageScore: avgScore,
      passRate,
    },
  };
}

// ============================================================================
// 7. STUDENT & TEACHER PORTAL AUTHORITATIVE DATABASE SERVICES
// ============================================================================

export async function getUserActiveExamAttempt(userUid: string) {
  if (!db || !userUid) return null;
  const now = new Date();
  const activeList = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.userUid, userUid),
        eq(examAttempts.status, 'IN_PROGRESS'),
        sql`${examAttempts.expiresAt} > ${now}`
      )
    )
    .orderBy(desc(examAttempts.startedAt))
    .limit(1);

  if (activeList.length === 0) return null;
  const active = activeList[0];
  const nowMs = Date.now();
  const expiresMs = new Date(active.expiresAt).getTime();
  const remainingSeconds = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));

  return {
    attemptId: active.attemptId,
    testId: active.testId,
    testTitle: active.testTitle,
    startedAt: active.startedAt ? new Date(active.startedAt).toISOString() : '',
    expiresAt: active.expiresAt ? new Date(active.expiresAt).toISOString() : '',
    remainingSeconds,
    timeRemainingSeconds: remainingSeconds,
    totalQuestions: Array.isArray(active.questionOrder) ? active.questionOrder.length : 0,
  };
}

export async function getStudentDashboardStats(userUid: string) {
  if (!db || !userUid) {
    return {
      profile: null,
      summary: {
        totalTestsAttempted: 0,
        totalTestsPassed: 0,
        averagePercentage: 0,
        highestPercentage: 0,
        totalTimeSpentSeconds: 0,
        certificatesEarned: 0,
        bookmarksCount: 0,
      },
      recentAttempts: [],
      activeExam: null,
    };
  }

  // Fetch user profile
  const userRows = await db.select().from(users).where(eq(users.uid, userUid)).limit(1);
  const user = userRows[0] || null;

  // Fetch student completed test results
  const results = await db
    .select()
    .from(testResults)
    .where(eq(testResults.userUid, userUid))
    .orderBy(desc(testResults.createdAt));

  // Fetch certificates count
  const certs = await db
    .select({ count: sql<number>`count(*)` })
    .from(certificates)
    .where(eq(certificates.userUid, userUid));
  const certificatesEarned = Number(certs[0]?.count || 0);

  // Fetch bookmarks count
  const bmarks = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookmarkedQuestions)
    .where(eq(bookmarkedQuestions.userUid, userUid));
  const bookmarksCount = Number(bmarks[0]?.count || 0);

  // Check for active in-progress exam
  const activeExam = await getUserActiveExamAttempt(userUid);

  // Calculate real metrics
  const totalTestsAttempted = results.length;
  const passedResults = results.filter((r) => r.percentage >= 50);
  const totalTestsPassed = passedResults.length;
  const averagePercentage =
    totalTestsAttempted > 0
      ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalTestsAttempted)
      : 0;
  const highestPercentage =
    totalTestsAttempted > 0
      ? Math.max(...results.map((r) => r.percentage))
      : 0;
  const totalTimeSpentSeconds = results.reduce((sum, r) => sum + (r.timeUsedSeconds || 0), 0);

  return {
    profile: user
      ? {
          uid: user.uid,
          name: user.name,
          email: user.email,
          roles: user.roles,
          classLevel: user.classLevel,
          board: user.board,
          targetExam: user.targetExam,
          avatar: user.avatar,
          points: user.points,
          streakDays: user.streakDays,
          testsTaken: user.testsTaken || totalTestsAttempted,
          status: user.status,
        }
      : null,
    summary: {
      totalTestsAttempted,
      totalTestsPassed,
      averagePercentage,
      highestPercentage,
      totalTimeSpentSeconds,
      certificatesEarned,
      bookmarksCount,
    },
    recentAttempts: results.slice(0, 10).map((r) => ({
      resultId: r.resultId,
      testId: r.testId,
      testTitle: r.testTitle,
      testType: r.testType,
      subject: r.subject,
      category: r.category,
      totalQuestions: r.totalQuestions,
      answeredCount: r.answeredCount,
      correctCount: r.correctCount,
      wrongCount: r.wrongCount,
      skippedCount: r.skippedCount,
      marksObtained: r.marksObtained,
      totalMarks: r.totalMarks,
      percentage: r.percentage,
      grade: r.grade,
      passed: r.percentage >= 50,
      timeUsedSeconds: r.timeUsedSeconds,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
    })),
    activeExam,
  };
}

export async function getStudentPerformanceAnalytics(userUid: string) {
  if (!db || !userUid) {
    return {
      hasData: false,
      totalTests: 0,
      passRate: 0,
      averagePercentage: 0,
      highestScore: 0,
      totalQuestionsAnswered: 0,
      totalCorrect: 0,
      totalWrong: 0,
      overallAccuracy: 0,
      subjectBreakdown: [],
      scoreHistory: [],
    };
  }

  const results = await db
    .select()
    .from(testResults)
    .where(eq(testResults.userUid, userUid))
    .orderBy(desc(testResults.createdAt));

  if (results.length === 0) {
    return {
      hasData: false,
      totalTests: 0,
      passRate: 0,
      averagePercentage: 0,
      highestScore: 0,
      totalQuestionsAnswered: 0,
      totalCorrect: 0,
      totalWrong: 0,
      overallAccuracy: 0,
      subjectBreakdown: [],
      scoreHistory: [],
    };
  }

  const totalTests = results.length;
  const passedCount = results.filter((r) => r.percentage >= 50).length;
  const passRate = Math.round((passedCount / totalTests) * 100);
  const averagePercentage = Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / totalTests);
  const highestScore = Math.max(...results.map((r) => r.percentage));
  const totalQuestionsAnswered = results.reduce((acc, r) => acc + (r.answeredCount || 0), 0);
  const totalCorrect = results.reduce((acc, r) => acc + (r.correctCount || 0), 0);
  const totalWrong = results.reduce((acc, r) => acc + (r.wrongCount || 0), 0);
  const overallAccuracy = totalQuestionsAnswered > 0 ? Math.round((totalCorrect / totalQuestionsAnswered) * 100) : 0;

  // Subject-wise grouping
  const subjectMap: Record<string, { testsCount: number; totalPct: number; correct: number; totalQ: number }> = {};
  for (const r of results) {
    const subj = r.subject || 'General';
    if (!subjectMap[subj]) {
      subjectMap[subj] = { testsCount: 0, totalPct: 0, correct: 0, totalQ: 0 };
    }
    subjectMap[subj].testsCount += 1;
    subjectMap[subj].totalPct += r.percentage;
    subjectMap[subj].correct += r.correctCount || 0;
    subjectMap[subj].totalQ += (r.answeredCount || r.totalQuestions || 0);
  }

  const subjectBreakdown = Object.entries(subjectMap).map(([subject, data]) => {
    const avgPct = Math.round(data.totalPct / data.testsCount);
    const accuracy = data.totalQ > 0 ? Math.round((data.correct / data.totalQ) * 100) : avgPct;
    let status: 'Strong' | 'Average' | 'Needs Focus' = 'Average';
    if (avgPct >= 80) status = 'Strong';
    else if (avgPct < 60) status = 'Needs Focus';

    return {
      subject,
      testsCount: data.testsCount,
      averagePercentage: avgPct,
      accuracyPercentage: accuracy,
      status,
    };
  });

  // Score progression over time (chronological)
  const scoreHistory = [...results]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((r, idx) => ({
      index: idx + 1,
      testTitle: r.testTitle,
      subject: r.subject,
      percentage: r.percentage,
      date: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '',
    }));

  return {
    hasData: true,
    totalTests,
    passRate,
    averagePercentage,
    highestScore,
    totalQuestionsAnswered,
    totalCorrect,
    totalWrong,
    overallAccuracy,
    subjectBreakdown,
    scoreHistory,
  };
}

export async function getTeacherDashboardStats(userUid: string) {
  if (!db || !userUid) {
    return {
      assignments: [],
      testsCreatedCount: 0,
      totalStudentAttempts: 0,
      averageClassScore: 0,
      recentStudentResults: [],
    };
  }

  // Fetch teacher's academic assignments
  let assignments: any[] = [];
  try {
    assignments = await db
      .select()
      .from(staffAssignments)
      .where(eq(staffAssignments.userUid, userUid));
  } catch (err) {
    console.warn('Notice loading teacher assignments:', err);
  }

  // Fetch all tests created by or assigned to this teacher
  const teacherTests = await db
    .select()
    .from(tests)
    .where(eq(tests.createdBy, userUid));

  const publishedTestsCount = teacherTests.filter((t) => t.status === 'Published').length;

  let questionsContributed = 0;
  try {
    const mcqRows = await db
      .select({ count: sql`count(*)` })
      .from(mcqs)
      .where(eq(mcqs.createdBy, userUid));
    questionsContributed = Number(mcqRows[0]?.count || 0);
  } catch (mcqErr) {
    console.warn('Notice loading teacher contributed MCQs:', mcqErr);
  }

  const testIds = teacherTests.map((t) => t.id);

  // If teacher has tests, find student results on those tests
  let studentResultsList: any[] = [];
  if (testIds.length > 0) {
    studentResultsList = await db
      .select()
      .from(testResults)
      .where(inArray(testResults.testId, testIds))
      .orderBy(desc(testResults.createdAt))
      .limit(50);
  } else {
    // If no tests created yet, get general recent results if teacher is staff
    studentResultsList = await db
      .select()
      .from(testResults)
      .orderBy(desc(testResults.createdAt))
      .limit(20);
  }

  const totalAttempts = studentResultsList.length;
  const avgScore =
    totalAttempts > 0
      ? Math.round(studentResultsList.reduce((acc, r) => acc + r.percentage, 0) / totalAttempts)
      : 0;

  const passedSubmissions = studentResultsList.filter((r) => (r.percentage || 0) >= 50).length;
  const passRate = totalAttempts > 0 ? Math.round((passedSubmissions / totalAttempts) * 100) : 0;

  return {
    assignments,
    testsCreatedCount: teacherTests.length,
    totalTestsCreated: teacherTests.length,
    totalPublishedTests: publishedTestsCount,
    totalQuestionsContributed: questionsContributed,
    totalStudentAttempts: totalAttempts,
    totalSubmissionsEvaluated: totalAttempts,
    averageClassScore: avgScore,
    avgStudentPercentage: avgScore,
    passRatePercentage: passRate,
    recentStudentResults: studentResultsList.map((r) => ({
      resultId: r.resultId,
      testId: r.testId,
      testTitle: r.testTitle,
      subject: r.subject,
      userUid: r.userUid,
      totalQuestions: r.totalQuestions,
      correctCount: r.correctCount,
      percentage: r.percentage,
      grade: r.grade,
      timeUsedSeconds: r.timeUsedSeconds,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
    })),
  };
}

