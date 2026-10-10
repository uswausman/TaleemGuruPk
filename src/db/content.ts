import { eq, desc, and, sql, ilike, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  mcqs,
  tests,
  testQuestions,
  pastPapers,
  studyNotes,
  boards,
  classes,
  subjects,
  chapters,
  users,
  testResults,
  contentReports,
  auditLogs,
  documents,
  contentVersions,
} from './schema.ts';
import { saveAuditLogToDb } from './users.ts';
import type { MCQ, TestConfig, PastPaper, StudyNote } from '../types.ts';
import { POPULAR_TESTS, PAST_PAPERS_DATA, STUDY_NOTES_DATA } from '../data/mockData.ts';
import {
  MASTER_PAST_PAPERS,
  MASTER_STUDY_NOTES,
  PAKISTAN_BOARDS,
  ACADEMIC_CLASSES,
  ACADEMIC_SUBJECTS,
  ACADEMIC_CHAPTERS,
} from '../data/educationalHierarchy.ts';

export interface MCQFilters {
  subject?: string;
  classLevel?: string;
  board?: string;
  chapter?: string;
  exam?: string;
  difficulty?: string;
  status?: string;
  isStaff?: boolean;
  createdBy?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface TestFilters {
  subject?: string;
  classLevel?: string;
  board?: string;
  category?: string;
  testType?: string;
  status?: string;
  isStaff?: boolean;
  createdBy?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface PastPaperFilters {
  board?: string;
  province?: string;
  classLevel?: string;
  subject?: string;
  year?: number;
  status?: string;
  topic?: string;
  exam?: string;
  language?: string;
  isStaff?: boolean;
  createdBy?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface StudyNoteFilters {
  subject?: string;
  classLevel?: string;
  board?: string;
  chapter?: string;
  topic?: string;
  type?: string;
  status?: string;
  language?: string;
  isStaff?: boolean;
  createdBy?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

// ============================================================================
// 1. MCQS DATABASE OPERATIONS
// ============================================================================

export async function getMCQsFromDb(filters: MCQFilters = {}): Promise<MCQ[]> {
  if (!db) return [];
  try {
    const conditions = [];
    if (filters.subject && filters.subject !== 'All') {
      conditions.push(ilike(mcqs.subject, `%${filters.subject}%`));
    }
    if (filters.classLevel && filters.classLevel !== 'All') {
      conditions.push(ilike(mcqs.classLevel, `%${filters.classLevel}%`));
    }
    if (filters.board && filters.board !== 'All') {
      conditions.push(ilike(mcqs.board, `%${filters.board}%`));
    }
    if (filters.chapter && filters.chapter !== 'All') {
      conditions.push(ilike(mcqs.chapter, `%${filters.chapter}%`));
    }
    if (filters.exam && filters.exam !== 'All') {
      conditions.push(ilike(mcqs.exam, `%${filters.exam}%`));
    }
    if (filters.difficulty && filters.difficulty !== 'All') {
      conditions.push(eq(mcqs.difficulty, filters.difficulty));
    }
    if (filters.status && filters.status !== 'All') {
      conditions.push(eq(mcqs.status, filters.status));
    } else if (!filters.isStaff && !filters.createdBy) {
      conditions.push(eq(mcqs.status, 'Published'));
    }
    if (filters.createdBy) {
      conditions.push(eq(mcqs.createdBy, filters.createdBy));
    }
    if (filters.search) {
      conditions.push(ilike(mcqs.question, `%${filters.search}%`));
    }

    const query = db
      .select()
      .from(mcqs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(mcqs.createdAt))
      .limit(filters.limit || 500);

    const rows = await query;
    return rows.map((r) => ({
      id: r.id,
      question: r.question,
      options: r.options || [],
      correctAnswer: r.correctAnswer,
      explanation: r.explanation || '',
      subject: r.subject,
      chapter: r.chapter || undefined,
      topic: r.topic || undefined,
      difficulty: (r.difficulty as any) || 'Medium',
      classLevel: r.classLevel || undefined,
      board: r.board || undefined,
      exam: r.exam || undefined,
      year: r.year || undefined,
      tags: r.tags || [],
      language: (r.language as any) || 'English',
      status: (r.status as any) || 'Published',
      submittedBy: r.submittedBy || undefined,
      reviewedBy: r.reviewedBy || undefined,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : undefined,
      rejectionReason: r.rejectionReason || undefined,
      changeNotes: r.changeNotes || undefined,
      version: r.version || 1,
      createdBy: r.createdBy || undefined,
      updatedBy: r.updatedBy || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Error in getMCQsFromDb:', error);
    return [];
  }
}

export async function getMCQByIdFromDb(id: string): Promise<MCQ | null> {
  if (!db) return null;
  try {
    const rows = await db.select().from(mcqs).where(eq(mcqs.id, id)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      question: r.question,
      options: r.options || [],
      correctAnswer: r.correctAnswer,
      explanation: r.explanation || '',
      subject: r.subject,
      chapter: r.chapter || undefined,
      topic: r.topic || undefined,
      difficulty: (r.difficulty as any) || 'Medium',
      classLevel: r.classLevel || undefined,
      board: r.board || undefined,
      exam: r.exam || undefined,
      year: r.year || undefined,
      tags: r.tags || [],
      language: (r.language as any) || 'English',
      status: (r.status as any) || 'Published',
      submittedBy: r.submittedBy || undefined,
      reviewedBy: r.reviewedBy || undefined,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : undefined,
      rejectionReason: r.rejectionReason || undefined,
      changeNotes: r.changeNotes || undefined,
      version: r.version || 1,
      createdBy: r.createdBy || undefined,
      updatedBy: r.updatedBy || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
    };
  } catch (error) {
    console.error('Error in getMCQByIdFromDb:', error);
    return null;
  }
}

export async function createMCQInDb(mcqData: Partial<MCQ> & { question: string; options: string[]; correctAnswer: number; subject: string }, authorUid?: string): Promise<MCQ> {
  if (!db) throw new Error('Database not connected');

  const id = mcqData.id || `mcq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const values = {
    id,
    question: mcqData.question.trim(),
    options: mcqData.options,
    correctAnswer: mcqData.correctAnswer,
    explanation: mcqData.explanation || null,
    subject: mcqData.subject.trim(),
    chapter: mcqData.chapter?.trim() || null,
    topic: mcqData.topic?.trim() || null,
    difficulty: mcqData.difficulty || 'Medium',
    classLevel: mcqData.classLevel?.trim() || null,
    board: mcqData.board?.trim() || null,
    exam: mcqData.exam?.trim() || null,
    year: mcqData.year || null,
    tags: mcqData.tags || [],
    language: mcqData.language || 'English',
    status: mcqData.status || 'Published',
    createdBy: authorUid || (mcqData as any).createdBy || 'system',
    updatedBy: authorUid || (mcqData as any).updatedBy || 'system',
  };

  await db.insert(mcqs).values(values).onConflictDoUpdate({
    target: mcqs.id,
    set: {
      question: values.question,
      options: values.options,
      correctAnswer: values.correctAnswer,
      explanation: values.explanation,
      subject: values.subject,
      chapter: values.chapter,
      topic: values.topic,
      difficulty: values.difficulty,
      classLevel: values.classLevel,
      board: values.board,
      exam: values.exam,
      year: values.year,
      tags: values.tags,
      language: values.language,
      status: values.status,
      updatedBy: values.updatedBy,
      updatedAt: new Date(),
    },
  });

  const created = await getMCQByIdFromDb(id);
  if (!created) throw new Error('Failed to create MCQ');
  return created;
}

export async function updateMCQInDb(id: string, updates: Partial<MCQ>, updaterUid?: string): Promise<MCQ | null> {
  if (!db) throw new Error('Database not connected');

  const updateFields: any = {
    updatedAt: new Date(),
    updatedBy: updaterUid || 'system',
  };
  if (updates.question !== undefined) updateFields.question = updates.question.trim();
  if (updates.options !== undefined) updateFields.options = updates.options;
  if (updates.correctAnswer !== undefined) updateFields.correctAnswer = updates.correctAnswer;
  if (updates.explanation !== undefined) updateFields.explanation = updates.explanation;
  if (updates.subject !== undefined) updateFields.subject = updates.subject.trim();
  if (updates.chapter !== undefined) updateFields.chapter = updates.chapter?.trim() || null;
  if (updates.topic !== undefined) updateFields.topic = updates.topic?.trim() || null;
  if (updates.difficulty !== undefined) updateFields.difficulty = updates.difficulty;
  if (updates.classLevel !== undefined) updateFields.classLevel = updates.classLevel?.trim() || null;
  if (updates.board !== undefined) updateFields.board = updates.board?.trim() || null;
  if (updates.exam !== undefined) updateFields.exam = updates.exam?.trim() || null;
  if (updates.year !== undefined) updateFields.year = updates.year;
  if (updates.tags !== undefined) updateFields.tags = updates.tags;
  if (updates.language !== undefined) updateFields.language = updates.language;
  if (updates.status !== undefined) updateFields.status = updates.status;

  await db.update(mcqs).set(updateFields).where(eq(mcqs.id, id));
  return await getMCQByIdFromDb(id);
}

export async function deleteMCQInDb(id: string): Promise<boolean> {
  if (!db) throw new Error('Database not connected');
  await db.delete(mcqs).where(eq(mcqs.id, id));
  return true;
}

export async function bulkInsertMCQsInDb(items: MCQ[], authorUid?: string): Promise<number> {
  if (!db || items.length === 0) return 0;
  let count = 0;
  for (const item of items) {
    try {
      await createMCQInDb(item, authorUid);
      count++;
    } catch (e) {
      console.warn(`Bulk insert MCQ warning for ${item.id}:`, e);
    }
  }
  return count;
}

// ============================================================================
// 2. TESTS & QUIZZES DATABASE OPERATIONS
// ============================================================================

export async function getTestsFromDb(filters: TestFilters = {}): Promise<TestConfig[]> {
  if (!db) return [];
  try {
    const conditions = [];
    if (filters.subject && filters.subject !== 'All') {
      conditions.push(ilike(tests.subject, `%${filters.subject}%`));
    }
    if (filters.classLevel && filters.classLevel !== 'All') {
      conditions.push(ilike(tests.classLevel, `%${filters.classLevel}%`));
    }
    if (filters.board && filters.board !== 'All') {
      conditions.push(ilike(tests.board, `%${filters.board}%`));
    }
    if (filters.category && filters.category !== 'All') {
      conditions.push(ilike(tests.category, `%${filters.category}%`));
    }
    if (filters.testType && filters.testType !== 'All') {
      conditions.push(ilike(tests.testType, `%${filters.testType}%`));
    }
    if (filters.status && filters.status !== 'All') {
      conditions.push(eq(tests.status, filters.status));
    } else if (!filters.isStaff && !filters.createdBy) {
      conditions.push(eq(tests.status, 'Published'));
    }
    if (filters.createdBy) {
      conditions.push(eq(tests.createdBy, filters.createdBy));
    }
    if (filters.search) {
      conditions.push(ilike(tests.title, `%${filters.search}%`));
    }

    const testRows = await db
      .select()
      .from(tests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tests.createdAt))
      .limit(filters.limit || 200);

    if (testRows.length === 0) return [];

    // Fetch associated questions for each test
    const testIds = testRows.map((t) => t.id);
    const junctionRows = await db
      .select({
        testId: testQuestions.testId,
        mcqId: testQuestions.mcqId,
        ordering: testQuestions.ordering,
        mcq: mcqs,
      })
      .from(testQuestions)
      .innerJoin(mcqs, eq(testQuestions.mcqId, mcqs.id))
      .where(inArray(testQuestions.testId, testIds))
      .orderBy(testQuestions.ordering);

    // Group questions by testId
    const questionsByTestId: Record<string, MCQ[]> = {};
    junctionRows.forEach((j) => {
      if (!questionsByTestId[j.testId]) {
        questionsByTestId[j.testId] = [];
      }
      questionsByTestId[j.testId].push({
        id: j.mcq.id,
        question: j.mcq.question,
        options: j.mcq.options || [],
        correctAnswer: j.mcq.correctAnswer,
        explanation: j.mcq.explanation || '',
        subject: j.mcq.subject,
        chapter: j.mcq.chapter || undefined,
        topic: j.mcq.topic || undefined,
        difficulty: (j.mcq.difficulty as any) || 'Medium',
        classLevel: j.mcq.classLevel || undefined,
        board: j.mcq.board || undefined,
        exam: j.mcq.exam || undefined,
        year: j.mcq.year || undefined,
        tags: j.mcq.tags || [],
        language: (j.mcq.language as any) || 'English',
        status: (j.mcq.status as any) || 'Published',
        createdAt: j.mcq.createdAt ? new Date(j.mcq.createdAt).toISOString() : undefined,
      });
    });

    return testRows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      testType: (t.testType as any) || 'Chapter Test',
      category: t.category,
      subject: t.subject,
      chapter: t.chapter || undefined,
      classLevel: t.classLevel || undefined,
      board: t.board || undefined,
      exam: t.exam || undefined,
      durationMinutes: t.durationMinutes,
      totalQuestions: t.totalQuestions,
      totalMarks: t.totalMarks,
      negativeMarking: t.negativeMarking,
      negativeMarkValue: t.negativeMarkValue ? parseFloat(t.negativeMarkValue) : 0.25,
      passPercentage: t.passPercentage,
      randomizeQuestions: Boolean(t.randomizeQuestions),
      randomizeOptions: Boolean(t.randomizeOptions),
      allowRetake: t.allowRetake !== false,
      maxAttempts: t.maxAttempts || 0,
      reviewPolicy: (t.reviewPolicy as any) || 'immediate',
      isPremium: t.isPremium,
      status: (t.status as any) || 'Published',
      submittedBy: t.submittedBy || undefined,
      reviewedBy: t.reviewedBy || undefined,
      reviewedAt: t.reviewedAt ? new Date(t.reviewedAt).toISOString() : undefined,
      rejectionReason: t.rejectionReason || undefined,
      changeNotes: t.changeNotes || undefined,
      version: t.version || 1,
      createdBy: t.createdBy || undefined,
      updatedBy: t.updatedBy || undefined,
      questions: questionsByTestId[t.id] || [],
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Error in getTestsFromDb:', error);
    return [];
  }
}

export async function getTestByIdFromDb(id: string): Promise<TestConfig | null> {
  if (!db) return null;
  try {
    const testRows = await db.select().from(tests).where(eq(tests.id, id)).limit(1);
    if (testRows.length === 0) {
      const fallback = POPULAR_TESTS.find((pt) => pt.id === id);
      if (fallback) return fallback;
      return null;
    }
    const t = testRows[0];

    const junctionRows = await db
      .select({
        mcq: mcqs,
      })
      .from(testQuestions)
      .innerJoin(mcqs, eq(testQuestions.mcqId, mcqs.id))
      .where(eq(testQuestions.testId, id))
      .orderBy(testQuestions.ordering);

    const questions: MCQ[] = junctionRows.map((j) => ({
      id: j.mcq.id,
      question: j.mcq.question,
      options: j.mcq.options || [],
      correctAnswer: j.mcq.correctAnswer,
      explanation: j.mcq.explanation || '',
      subject: j.mcq.subject,
      chapter: j.mcq.chapter || undefined,
      topic: j.mcq.topic || undefined,
      difficulty: (j.mcq.difficulty as any) || 'Medium',
      classLevel: j.mcq.classLevel || undefined,
      board: j.mcq.board || undefined,
      exam: j.mcq.exam || undefined,
      year: j.mcq.year || undefined,
      tags: j.mcq.tags || [],
      language: (j.mcq.language as any) || 'English',
      status: (j.mcq.status as any) || 'Published',
      createdAt: j.mcq.createdAt ? new Date(j.mcq.createdAt).toISOString() : undefined,
    }));

    return {
      id: t.id,
      title: t.title,
      description: t.description || '',
      testType: (t.testType as any) || 'Chapter Test',
      category: t.category,
      subject: t.subject,
      chapter: t.chapter || undefined,
      classLevel: t.classLevel || undefined,
      board: t.board || undefined,
      exam: t.exam || undefined,
      durationMinutes: t.durationMinutes,
      totalQuestions: t.totalQuestions,
      totalMarks: t.totalMarks,
      negativeMarking: t.negativeMarking,
      negativeMarkValue: t.negativeMarkValue ? parseFloat(t.negativeMarkValue) : 0.25,
      passPercentage: t.passPercentage,
      randomizeQuestions: Boolean(t.randomizeQuestions),
      randomizeOptions: Boolean(t.randomizeOptions),
      allowRetake: t.allowRetake !== false,
      maxAttempts: t.maxAttempts || 0,
      reviewPolicy: (t.reviewPolicy as any) || 'immediate',
      isPremium: t.isPremium,
      status: (t.status as any) || 'Published',
      submittedBy: t.submittedBy || undefined,
      reviewedBy: t.reviewedBy || undefined,
      reviewedAt: t.reviewedAt ? new Date(t.reviewedAt).toISOString() : undefined,
      rejectionReason: t.rejectionReason || undefined,
      changeNotes: t.changeNotes || undefined,
      version: t.version || 1,
      createdBy: t.createdBy || undefined,
      updatedBy: t.updatedBy || undefined,
      questions,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
    };
  } catch (error) {
    console.error('Error in getTestByIdFromDb:', error);
    return null;
  }
}

export async function createTestInDb(testData: Partial<TestConfig> & { title: string; subject: string }, authorUid?: string): Promise<TestConfig> {
  if (!db) throw new Error('Database not connected');

  const id = testData.id || `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const questionsList = testData.questions || [];

  // 1. Ensure questions exist in MCQs table
  for (const q of questionsList) {
    if (q.question && q.options) {
      await createMCQInDb(q, authorUid);
    }
  }

  const values = {
    id,
    title: testData.title.trim(),
    description: testData.description || null,
    testType: testData.testType || 'Chapter Test',
    category: testData.category || 'Academic',
    subject: testData.subject.trim(),
    chapter: testData.chapter?.trim() || null,
    classLevel: testData.classLevel?.trim() || null,
    board: testData.board?.trim() || null,
    exam: testData.exam?.trim() || null,
    durationMinutes: testData.durationMinutes || 15,
    totalQuestions: questionsList.length > 0 ? questionsList.length : testData.totalQuestions || 10,
    totalMarks: testData.totalMarks || (questionsList.length > 0 ? questionsList.length : 10),
    negativeMarking: Boolean(testData.negativeMarking),
    negativeMarkValue: testData.negativeMarkValue !== undefined ? String(testData.negativeMarkValue) : '0.25',
    passPercentage: testData.passPercentage || 50,
    randomizeQuestions: Boolean(testData.randomizeQuestions),
    randomizeOptions: Boolean(testData.randomizeOptions),
    allowRetake: testData.allowRetake !== false,
    maxAttempts: testData.maxAttempts || 0,
    reviewPolicy: testData.reviewPolicy || 'immediate',
    isPremium: Boolean(testData.isPremium),
    status: testData.status || 'Published',
    createdBy: authorUid || 'system',
    updatedBy: authorUid || 'system',
  };

  await db.insert(tests).values(values).onConflictDoUpdate({
    target: tests.id,
    set: {
      title: values.title,
      description: values.description,
      testType: values.testType,
      category: values.category,
      subject: values.subject,
      chapter: values.chapter,
      classLevel: values.classLevel,
      board: values.board,
      exam: values.exam,
      durationMinutes: values.durationMinutes,
      totalQuestions: values.totalQuestions,
      totalMarks: values.totalMarks,
      negativeMarking: values.negativeMarking,
      negativeMarkValue: values.negativeMarkValue,
      passPercentage: values.passPercentage,
      randomizeQuestions: values.randomizeQuestions,
      randomizeOptions: values.randomizeOptions,
      allowRetake: values.allowRetake,
      maxAttempts: values.maxAttempts,
      reviewPolicy: values.reviewPolicy,
      isPremium: values.isPremium,
      status: values.status,
      updatedBy: values.updatedBy,
      updatedAt: new Date(),
    },
  });

  // 2. Update junction table
  await db.delete(testQuestions).where(eq(testQuestions.testId, id));
  if (questionsList.length > 0) {
    for (let i = 0; i < questionsList.length; i++) {
      const q = questionsList[i];
      await db.insert(testQuestions).values({
        testId: id,
        mcqId: q.id,
        ordering: i,
      });
    }
  } else if (testData.questionIds && testData.questionIds.length > 0) {
    for (let i = 0; i < testData.questionIds.length; i++) {
      const qId = testData.questionIds[i];
      await db.insert(testQuestions).values({
        testId: id,
        mcqId: qId,
        ordering: i,
      });
    }
  }

  const created = await getTestByIdFromDb(id);
  if (!created) throw new Error('Failed to create test configuration');
  return created;
}

export async function updateTestInDb(id: string, updates: Partial<TestConfig>, updaterUid?: string): Promise<TestConfig | null> {
  if (!db) throw new Error('Database not connected');

  const updateFields: any = {
    updatedAt: new Date(),
    updatedBy: updaterUid || 'system',
  };
  if (updates.title !== undefined) updateFields.title = updates.title.trim();
  if (updates.description !== undefined) updateFields.description = updates.description;
  if (updates.testType !== undefined) updateFields.testType = updates.testType;
  if (updates.category !== undefined) updateFields.category = updates.category;
  if (updates.subject !== undefined) updateFields.subject = updates.subject.trim();
  if (updates.chapter !== undefined) updateFields.chapter = updates.chapter?.trim() || null;
  if (updates.classLevel !== undefined) updateFields.classLevel = updates.classLevel?.trim() || null;
  if (updates.board !== undefined) updateFields.board = updates.board?.trim() || null;
  if (updates.exam !== undefined) updateFields.exam = updates.exam?.trim() || null;
  if (updates.durationMinutes !== undefined) updateFields.durationMinutes = updates.durationMinutes;
  if (updates.totalQuestions !== undefined) updateFields.totalQuestions = updates.totalQuestions;
  if (updates.totalMarks !== undefined) updateFields.totalMarks = updates.totalMarks;
  if (updates.negativeMarking !== undefined) updateFields.negativeMarking = updates.negativeMarking;
  if (updates.negativeMarkValue !== undefined) updateFields.negativeMarkValue = String(updates.negativeMarkValue);
  if (updates.passPercentage !== undefined) updateFields.passPercentage = updates.passPercentage;
  if (updates.randomizeQuestions !== undefined) updateFields.randomizeQuestions = updates.randomizeQuestions;
  if (updates.randomizeOptions !== undefined) updateFields.randomizeOptions = updates.randomizeOptions;
  if (updates.allowRetake !== undefined) updateFields.allowRetake = updates.allowRetake;
  if (updates.maxAttempts !== undefined) updateFields.maxAttempts = updates.maxAttempts;
  if (updates.reviewPolicy !== undefined) updateFields.reviewPolicy = updates.reviewPolicy;
  if (updates.isPremium !== undefined) updateFields.isPremium = updates.isPremium;
  if (updates.status !== undefined) updateFields.status = updates.status;

  await db.update(tests).set(updateFields).where(eq(tests.id, id));

  // If questions are supplied, update junction table
  if (updates.questions) {
    for (const q of updates.questions) {
      if (q.question && q.options) {
        await createMCQInDb(q, updaterUid);
      }
    }
    await db.delete(testQuestions).where(eq(testQuestions.testId, id));
    for (let i = 0; i < updates.questions.length; i++) {
      const q = updates.questions[i];
      await db.insert(testQuestions).values({
        testId: id,
        mcqId: q.id,
        ordering: i,
      });
    }
  }

  return await getTestByIdFromDb(id);
}

export async function deleteTestInDb(id: string): Promise<boolean> {
  if (!db) throw new Error('Database not connected');
  await db.delete(tests).where(eq(tests.id, id));
  return true;
}

export async function bulkInsertTestsInDb(items: TestConfig[], authorUid?: string): Promise<number> {
  if (!db || items.length === 0) return 0;
  let count = 0;
  for (const item of items) {
    try {
      await createTestInDb(item, authorUid);
      count++;
    } catch (e) {
      console.warn(`Bulk insert test warning for ${item.id}:`, e);
    }
  }
  return count;
}

// ============================================================================
// 3. PAST PAPERS DATABASE OPERATIONS
// ============================================================================

export async function getPastPapersFromDb(filters: PastPaperFilters = {}): Promise<PastPaper[]> {
  if (!db) return [];
  try {
    const conditions = [];

    // Strictly enforce published status for non-staff
    if (filters.status && filters.status !== 'All') {
      conditions.push(eq(pastPapers.status, filters.status));
    } else if (!filters.isStaff && !filters.createdBy) {
      conditions.push(eq(pastPapers.status, 'Published'));
    }
    if (filters.createdBy) {
      conditions.push(eq(pastPapers.createdBy, filters.createdBy));
    }

    if (filters.board && filters.board !== 'All') {
      conditions.push(ilike(pastPapers.board, `%${filters.board}%`));
    }
    if (filters.province && filters.province !== 'All') {
      conditions.push(ilike(pastPapers.province, `%${filters.province}%`));
    }
    if (filters.classLevel && filters.classLevel !== 'All') {
      conditions.push(ilike(pastPapers.classLevel, `%${filters.classLevel}%`));
    }
    if (filters.subject && filters.subject !== 'All') {
      conditions.push(ilike(pastPapers.subject, `%${filters.subject}%`));
    }
    if (filters.topic && filters.topic !== 'All') {
      conditions.push(ilike(pastPapers.topic, `%${filters.topic}%`));
    }
    if (filters.exam && filters.exam !== 'All') {
      conditions.push(ilike(pastPapers.exam, `%${filters.exam}%`));
    }
    if (filters.year) {
      conditions.push(eq(pastPapers.year, filters.year));
    }
    if (filters.language && filters.language !== 'All') {
      conditions.push(eq(pastPapers.language, filters.language));
    }
    if (filters.search) {
      conditions.push(ilike(pastPapers.title, `%${filters.search}%`));
    }

    const rows = await db
      .select()
      .from(pastPapers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(pastPapers.year), desc(pastPapers.createdAt))
      .limit(filters.limit || 300);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      board: r.board,
      province: r.province || undefined,
      classLevel: r.classLevel,
      subject: r.subject,
      chapter: r.chapter || undefined,
      topic: r.topic || undefined,
      exam: r.exam || undefined,
      year: r.year,
      paperGroup: (r.paperGroup as any) || undefined,
      type: (r.type as any) || 'Objective (MCQs)',
      paperType: r.paperType || undefined,
      language: r.language || 'English',
      totalQuestions: r.totalQuestions || r.questionsCount || 0,
      totalMarks: r.totalMarks || 0,
      durationMinutes: r.durationMinutes || undefined,
      questionsCount: r.questionsCount,
      downloadUrl: r.downloadUrl || undefined,
      fileUrl: r.fileUrl || undefined,
      pdfUrl: r.pdfUrl || undefined,
      thumbnail: r.thumbnail || undefined,
      description: r.description || undefined,
      status: (r.status as any) || 'Published',
      version: r.version || 1,
      brandingStatus: (r.brandingStatus as any) || 'Not Applicable',
      brandedFileUrl: r.brandedFileUrl || undefined,
      brandingVersion: r.brandingVersion || undefined,
      originalFileHash: r.originalFileHash || undefined,
      brandedFileHash: r.brandedFileHash || undefined,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : undefined,
      downloadsCount: r.downloadsCount || 0,
      questions: r.questions || [],
      createdBy: r.createdBy || undefined,
      updatedBy: r.updatedBy || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Error in getPastPapersFromDb:', error);
    return [];
  }
}

export async function getPastPaperByIdFromDb(id: string, isStaff: boolean = false): Promise<PastPaper | null> {
  if (!db) return null;
  try {
    const rows = await db.select().from(pastPapers).where(eq(pastPapers.id, id)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];

    // Non-staff callers can only access Published papers
    if (!isStaff && r.status !== 'Published') {
      return null;
    }

    return {
      id: r.id,
      title: r.title,
      board: r.board,
      province: r.province || undefined,
      classLevel: r.classLevel,
      subject: r.subject,
      chapter: r.chapter || undefined,
      topic: r.topic || undefined,
      exam: r.exam || undefined,
      year: r.year,
      paperGroup: (r.paperGroup as any) || undefined,
      type: (r.type as any) || 'Objective (MCQs)',
      paperType: r.paperType || undefined,
      language: r.language || 'English',
      totalQuestions: r.totalQuestions || r.questionsCount || 0,
      totalMarks: r.totalMarks || 0,
      durationMinutes: r.durationMinutes || undefined,
      questionsCount: r.questionsCount,
      downloadUrl: r.downloadUrl || undefined,
      fileUrl: r.fileUrl || undefined,
      pdfUrl: r.pdfUrl || undefined,
      thumbnail: r.thumbnail || undefined,
      description: r.description || undefined,
      status: (r.status as any) || 'Published',
      version: r.version || 1,
      brandingStatus: (r.brandingStatus as any) || 'Not Applicable',
      brandedFileUrl: r.brandedFileUrl || undefined,
      brandingVersion: r.brandingVersion || undefined,
      originalFileHash: r.originalFileHash || undefined,
      brandedFileHash: r.brandedFileHash || undefined,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : undefined,
      downloadsCount: r.downloadsCount || 0,
      questions: r.questions || [],
      createdBy: r.createdBy || undefined,
      updatedBy: r.updatedBy || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    };
  } catch (error) {
    console.error('Error in getPastPaperByIdFromDb:', error);
    return null;
  }
}

export async function createPastPaperInDb(paperData: Partial<PastPaper> & { title: string; board: string; classLevel: string; subject: string; year: number }, authorUid?: string): Promise<PastPaper> {
  if (!db) throw new Error('Database not connected');

  const id = paperData.id || `pp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const values = {
    id,
    title: paperData.title.trim(),
    board: paperData.board.trim(),
    province: paperData.province?.trim() || null,
    classLevel: paperData.classLevel.trim(),
    subject: paperData.subject.trim(),
    chapter: paperData.chapter?.trim() || null,
    topic: paperData.topic?.trim() || null,
    exam: paperData.exam?.trim() || null,
    year: paperData.year,
    paperGroup: paperData.paperGroup || null,
    type: paperData.type || 'Objective (MCQs)',
    paperType: paperData.paperType?.trim() || null,
    language: paperData.language?.trim() || 'English',
    totalQuestions: paperData.totalQuestions || paperData.questionsCount || (paperData.questions?.length || 0),
    totalMarks: paperData.totalMarks || 0,
    durationMinutes: paperData.durationMinutes || null,
    questionsCount: paperData.questionsCount || (paperData.questions?.length || 0),
    downloadUrl: paperData.downloadUrl || paperData.fileUrl || null,
    fileUrl: paperData.fileUrl || paperData.downloadUrl || null,
    pdfUrl: paperData.pdfUrl || null,
    thumbnail: paperData.thumbnail || null,
    description: paperData.description || null,
    status: paperData.status || 'Published',
    version: paperData.version || 1,
    brandingStatus: paperData.brandingStatus || 'Not Applicable',
    brandedFileUrl: paperData.brandedFileUrl || null,
    brandingVersion: paperData.brandingVersion || null,
    originalFileHash: paperData.originalFileHash || null,
    brandedFileHash: paperData.brandedFileHash || null,
    brandedAt: paperData.brandedAt ? new Date(paperData.brandedAt) : null,
    downloadsCount: paperData.downloadsCount || 0,
    questions: paperData.questions || [],
    createdBy: authorUid || 'system',
    updatedBy: authorUid || 'system',
  };

  await db.insert(pastPapers).values(values).onConflictDoUpdate({
    target: pastPapers.id,
    set: {
      title: values.title,
      board: values.board,
      province: values.province,
      classLevel: values.classLevel,
      subject: values.subject,
      chapter: values.chapter,
      topic: values.topic,
      exam: values.exam,
      year: values.year,
      paperGroup: values.paperGroup,
      type: values.type,
      paperType: values.paperType,
      language: values.language,
      totalQuestions: values.totalQuestions,
      totalMarks: values.totalMarks,
      durationMinutes: values.durationMinutes,
      questionsCount: values.questionsCount,
      downloadUrl: values.downloadUrl,
      fileUrl: values.fileUrl,
      pdfUrl: values.pdfUrl,
      thumbnail: values.thumbnail,
      description: values.description,
      status: values.status,
      version: values.version,
      brandingStatus: values.brandingStatus,
      brandedFileUrl: values.brandedFileUrl,
      brandingVersion: values.brandingVersion,
      originalFileHash: values.originalFileHash,
      brandedFileHash: values.brandedFileHash,
      brandedAt: values.brandedAt,
      downloadsCount: values.downloadsCount,
      questions: values.questions,
      updatedBy: values.updatedBy,
      updatedAt: new Date(),
    },
  });

  const created = await getPastPaperByIdFromDb(id, true);
  if (!created) throw new Error('Failed to create past paper');
  return created;
}

export async function updatePastPaperInDb(id: string, updates: Partial<PastPaper>, updaterUid?: string): Promise<PastPaper | null> {
  if (!db) throw new Error('Database not connected');

  const updateFields: any = {
    updatedAt: new Date(),
    updatedBy: updaterUid || 'system',
  };
  if (updates.title !== undefined) updateFields.title = updates.title.trim();
  if (updates.board !== undefined) updateFields.board = updates.board.trim();
  if (updates.province !== undefined) updateFields.province = updates.province?.trim() || null;
  if (updates.classLevel !== undefined) updateFields.classLevel = updates.classLevel.trim();
  if (updates.subject !== undefined) updateFields.subject = updates.subject.trim();
  if (updates.chapter !== undefined) updateFields.chapter = updates.chapter?.trim() || null;
  if (updates.topic !== undefined) updateFields.topic = updates.topic?.trim() || null;
  if (updates.exam !== undefined) updateFields.exam = updates.exam?.trim() || null;
  if (updates.year !== undefined) updateFields.year = updates.year;
  if (updates.paperGroup !== undefined) updateFields.paperGroup = updates.paperGroup;
  if (updates.type !== undefined) updateFields.type = updates.type;
  if (updates.paperType !== undefined) updateFields.paperType = updates.paperType?.trim() || null;
  if (updates.language !== undefined) updateFields.language = updates.language?.trim() || 'English';
  if (updates.totalQuestions !== undefined) updateFields.totalQuestions = updates.totalQuestions;
  if (updates.totalMarks !== undefined) updateFields.totalMarks = updates.totalMarks;
  if (updates.durationMinutes !== undefined) updateFields.durationMinutes = updates.durationMinutes;
  if (updates.questionsCount !== undefined) updateFields.questionsCount = updates.questionsCount;
  if (updates.downloadUrl !== undefined) updateFields.downloadUrl = updates.downloadUrl;
  if (updates.fileUrl !== undefined) updateFields.fileUrl = updates.fileUrl;
  if (updates.pdfUrl !== undefined) updateFields.pdfUrl = updates.pdfUrl;
  if (updates.thumbnail !== undefined) updateFields.thumbnail = updates.thumbnail;
  if (updates.description !== undefined) updateFields.description = updates.description;
  if (updates.status !== undefined) updateFields.status = updates.status;
  if (updates.version !== undefined) updateFields.version = updates.version;
  if (updates.brandingStatus !== undefined) updateFields.brandingStatus = updates.brandingStatus;
  if (updates.brandedFileUrl !== undefined) updateFields.brandedFileUrl = updates.brandedFileUrl;
  if (updates.brandingVersion !== undefined) updateFields.brandingVersion = updates.brandingVersion;
  if (updates.originalFileHash !== undefined) updateFields.originalFileHash = updates.originalFileHash;
  if (updates.brandedFileHash !== undefined) updateFields.brandedFileHash = updates.brandedFileHash;
  if (updates.brandedAt !== undefined) updateFields.brandedAt = updates.brandedAt ? new Date(updates.brandedAt) : null;
  if (updates.downloadsCount !== undefined) updateFields.downloadsCount = updates.downloadsCount;
  if (updates.questions !== undefined) updateFields.questions = updates.questions;

  await db.update(pastPapers).set(updateFields).where(eq(pastPapers.id, id));
  return await getPastPaperByIdFromDb(id, true);
}

export async function deletePastPaperInDb(id: string): Promise<boolean> {
  if (!db) throw new Error('Database not connected');
  await db.delete(pastPapers).where(eq(pastPapers.id, id));
  return true;
}

export async function bulkInsertPastPapersInDb(items: PastPaper[], authorUid?: string): Promise<number> {
  if (!db || items.length === 0) return 0;
  let count = 0;
  for (const item of items) {
    try {
      await createPastPaperInDb(item, authorUid);
      count++;
    } catch (e) {
      console.warn(`Bulk insert past paper warning for ${item.id}:`, e);
    }
  }
  return count;
}

// ============================================================================
// 4. STUDY NOTES DATABASE OPERATIONS
// ============================================================================

export async function getStudyNotesFromDb(filters: StudyNoteFilters = {}): Promise<StudyNote[]> {
  if (!db) return [];
  try {
    const conditions = [];

    // Strictly enforce published status for non-staff
    if (filters.status && filters.status !== 'All') {
      conditions.push(eq(studyNotes.status, filters.status));
    } else if (!filters.isStaff && !filters.createdBy) {
      conditions.push(eq(studyNotes.status, 'Published'));
    }
    if (filters.createdBy) {
      conditions.push(eq(studyNotes.createdBy, filters.createdBy));
    }

    if (filters.subject && filters.subject !== 'All') {
      conditions.push(ilike(studyNotes.subject, `%${filters.subject}%`));
    }
    if (filters.classLevel && filters.classLevel !== 'All') {
      conditions.push(ilike(studyNotes.classLevel, `%${filters.classLevel}%`));
    }
    if (filters.board && filters.board !== 'All') {
      conditions.push(ilike(studyNotes.board, `%${filters.board}%`));
    }
    if (filters.chapter && filters.chapter !== 'All') {
      conditions.push(ilike(studyNotes.chapter, `%${filters.chapter}%`));
    }
    if (filters.topic && filters.topic !== 'All') {
      conditions.push(ilike(studyNotes.topic, `%${filters.topic}%`));
    }
    if (filters.type && filters.type !== 'All') {
      conditions.push(ilike(studyNotes.type, `%${filters.type}%`));
    }
    if (filters.language && filters.language !== 'All') {
      conditions.push(eq(studyNotes.language, filters.language));
    }
    if (filters.search) {
      conditions.push(ilike(studyNotes.title, `%${filters.search}%`));
    }

    const rows = await db
      .select()
      .from(studyNotes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(studyNotes.createdAt))
      .limit(filters.limit || 300);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      board: r.board || undefined,
      subject: r.subject,
      classLevel: r.classLevel,
      chapter: r.chapter,
      topic: r.topic || undefined,
      description: r.description || undefined,
      type: (r.type as any) || 'Notes',
      contentSnippet: r.contentSnippet || undefined,
      fullContent: r.fullContent || undefined,
      content: r.content || undefined,
      language: r.language || 'English',
      pdfUrl: r.pdfUrl || undefined,
      fileUrl: r.fileUrl || undefined,
      thumbnail: r.thumbnail || undefined,
      status: (r.status as any) || 'Published',
      version: r.version || 1,
      brandingStatus: (r.brandingStatus as any) || 'Not Applicable',
      brandedFileUrl: r.brandedFileUrl || undefined,
      brandingVersion: r.brandingVersion || undefined,
      originalFileHash: r.originalFileHash || undefined,
      brandedFileHash: r.brandedFileHash || undefined,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : undefined,
      keyPoints: r.keyPoints || [],
      readTime: r.readTime || undefined,
      downloadsCount: r.downloadsCount || 0,
      isPremium: r.isPremium,
      createdBy: r.createdBy || undefined,
      updatedBy: r.updatedBy || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Error in getStudyNotesFromDb:', error);
    return [];
  }
}

export async function getStudyNoteByIdFromDb(id: string, isStaff: boolean = false): Promise<StudyNote | null> {
  if (!db) return null;
  try {
    const rows = await db.select().from(studyNotes).where(eq(studyNotes.id, id)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];

    // Non-staff callers can only access Published notes
    if (!isStaff && r.status !== 'Published') {
      return null;
    }

    return {
      id: r.id,
      title: r.title,
      board: r.board || undefined,
      subject: r.subject,
      classLevel: r.classLevel,
      chapter: r.chapter,
      topic: r.topic || undefined,
      description: r.description || undefined,
      type: (r.type as any) || 'Notes',
      contentSnippet: r.contentSnippet || undefined,
      fullContent: r.fullContent || undefined,
      content: r.content || undefined,
      language: r.language || 'English',
      pdfUrl: r.pdfUrl || undefined,
      fileUrl: r.fileUrl || undefined,
      thumbnail: r.thumbnail || undefined,
      status: (r.status as any) || 'Published',
      version: r.version || 1,
      brandingStatus: (r.brandingStatus as any) || 'Not Applicable',
      brandedFileUrl: r.brandedFileUrl || undefined,
      brandingVersion: r.brandingVersion || undefined,
      originalFileHash: r.originalFileHash || undefined,
      brandedFileHash: r.brandedFileHash || undefined,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : undefined,
      keyPoints: r.keyPoints || [],
      readTime: r.readTime || undefined,
      downloadsCount: r.downloadsCount || 0,
      isPremium: r.isPremium,
      createdBy: r.createdBy || undefined,
      updatedBy: r.updatedBy || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    };
  } catch (error) {
    console.error('Error in getStudyNoteByIdFromDb:', error);
    return null;
  }
}

export async function createStudyNoteInDb(noteData: Partial<StudyNote> & { title: string; subject: string; classLevel: string; chapter: string }, authorUid?: string): Promise<StudyNote> {
  if (!db) throw new Error('Database not connected');

  const id = noteData.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const values = {
    id,
    title: noteData.title.trim(),
    board: noteData.board?.trim() || null,
    subject: noteData.subject.trim(),
    classLevel: noteData.classLevel.trim(),
    chapter: noteData.chapter.trim(),
    topic: noteData.topic?.trim() || null,
    description: noteData.description || null,
    type: noteData.type || 'Notes',
    contentSnippet: noteData.contentSnippet || null,
    fullContent: noteData.fullContent || null,
    content: noteData.content || null,
    language: noteData.language?.trim() || 'English',
    pdfUrl: noteData.pdfUrl || null,
    fileUrl: noteData.fileUrl || null,
    thumbnail: noteData.thumbnail || null,
    status: noteData.status || 'Published',
    version: noteData.version || 1,
    brandingStatus: noteData.brandingStatus || 'Not Applicable',
    brandedFileUrl: noteData.brandedFileUrl || null,
    brandingVersion: noteData.brandingVersion || null,
    originalFileHash: noteData.originalFileHash || null,
    brandedFileHash: noteData.brandedFileHash || null,
    brandedAt: noteData.brandedAt ? new Date(noteData.brandedAt) : null,
    keyPoints: noteData.keyPoints || [],
    readTime: noteData.readTime || '5 min',
    downloadsCount: noteData.downloadsCount || 0,
    isPremium: Boolean(noteData.isPremium),
    createdBy: authorUid || 'system',
    updatedBy: authorUid || 'system',
  };

  await db.insert(studyNotes).values(values).onConflictDoUpdate({
    target: studyNotes.id,
    set: {
      title: values.title,
      board: values.board,
      subject: values.subject,
      classLevel: values.classLevel,
      chapter: values.chapter,
      topic: values.topic,
      description: values.description,
      type: values.type,
      contentSnippet: values.contentSnippet,
      fullContent: values.fullContent,
      content: values.content,
      language: values.language,
      pdfUrl: values.pdfUrl,
      fileUrl: values.fileUrl,
      thumbnail: values.thumbnail,
      status: values.status,
      version: values.version,
      brandingStatus: values.brandingStatus,
      brandedFileUrl: values.brandedFileUrl,
      brandingVersion: values.brandingVersion,
      originalFileHash: values.originalFileHash,
      brandedFileHash: values.brandedFileHash,
      brandedAt: values.brandedAt,
      keyPoints: values.keyPoints,
      readTime: values.readTime,
      downloadsCount: values.downloadsCount,
      isPremium: values.isPremium,
      updatedBy: values.updatedBy,
      updatedAt: new Date(),
    },
  });

  const created = await getStudyNoteByIdFromDb(id, true);
  if (!created) throw new Error('Failed to create study note');
  return created;
}

export async function updateStudyNoteInDb(id: string, updates: Partial<StudyNote>, updaterUid?: string): Promise<StudyNote | null> {
  if (!db) throw new Error('Database not connected');

  const updateFields: any = {
    updatedAt: new Date(),
    updatedBy: updaterUid || 'system',
  };
  if (updates.title !== undefined) updateFields.title = updates.title.trim();
  if (updates.board !== undefined) updateFields.board = updates.board?.trim() || null;
  if (updates.subject !== undefined) updateFields.subject = updates.subject.trim();
  if (updates.classLevel !== undefined) updateFields.classLevel = updates.classLevel.trim();
  if (updates.chapter !== undefined) updateFields.chapter = updates.chapter.trim();
  if (updates.topic !== undefined) updateFields.topic = updates.topic?.trim() || null;
  if (updates.description !== undefined) updateFields.description = updates.description;
  if (updates.type !== undefined) updateFields.type = updates.type;
  if (updates.contentSnippet !== undefined) updateFields.contentSnippet = updates.contentSnippet;
  if (updates.fullContent !== undefined) updateFields.fullContent = updates.fullContent;
  if (updates.content !== undefined) updateFields.content = updates.content;
  if (updates.language !== undefined) updateFields.language = updates.language?.trim() || 'English';
  if (updates.pdfUrl !== undefined) updateFields.pdfUrl = updates.pdfUrl;
  if (updates.fileUrl !== undefined) updateFields.fileUrl = updates.fileUrl;
  if (updates.thumbnail !== undefined) updateFields.thumbnail = updates.thumbnail;
  if (updates.status !== undefined) updateFields.status = updates.status;
  if (updates.version !== undefined) updateFields.version = updates.version;
  if (updates.brandingStatus !== undefined) updateFields.brandingStatus = updates.brandingStatus;
  if (updates.brandedFileUrl !== undefined) updateFields.brandedFileUrl = updates.brandedFileUrl;
  if (updates.brandingVersion !== undefined) updateFields.brandingVersion = updates.brandingVersion;
  if (updates.originalFileHash !== undefined) updateFields.originalFileHash = updates.originalFileHash;
  if (updates.brandedFileHash !== undefined) updateFields.brandedFileHash = updates.brandedFileHash;
  if (updates.brandedAt !== undefined) updateFields.brandedAt = updates.brandedAt ? new Date(updates.brandedAt) : null;
  if (updates.keyPoints !== undefined) updateFields.keyPoints = updates.keyPoints;
  if (updates.readTime !== undefined) updateFields.readTime = updates.readTime;
  if (updates.downloadsCount !== undefined) updateFields.downloadsCount = updates.downloadsCount;
  if (updates.isPremium !== undefined) updateFields.isPremium = updates.isPremium;

  await db.update(studyNotes).set(updateFields).where(eq(studyNotes.id, id));
  return await getStudyNoteByIdFromDb(id, true);
}

export async function deleteStudyNoteInDb(id: string): Promise<boolean> {
  if (!db) throw new Error('Database not connected');
  await db.delete(studyNotes).where(eq(studyNotes.id, id));
  return true;
}

export async function bulkInsertStudyNotesInDb(items: StudyNote[], authorUid?: string): Promise<number> {
  if (!db || items.length === 0) return 0;
  let count = 0;
  for (const item of items) {
    try {
      await createStudyNoteInDb(item, authorUid);
      count++;
    } catch (e) {
      console.warn(`Bulk insert study note warning for ${item.id}:`, e);
    }
  }
  return count;
}

// ============================================================================
// 5. INITIAL EDUCATIONAL CONTENT SEEDER (Seeds base authentic curriculum)
// ============================================================================

export async function seedInitialEducationalContent(): Promise<{ mcqsCount: number; testsCount: number; papersCount: number; notesCount: number }> {
  if (!db) return { mcqsCount: 0, testsCount: 0, papersCount: 0, notesCount: 0 };

  let mcqsCount = 0;
  let testsCount = 0;
  let papersCount = 0;
  let notesCount = 0;

  try {
    // 2. Seed Tests if empty
    const existingTests = await db.select({ count: sql<number>`count(*)` }).from(tests);
    const numTests = Number(existingTests[0]?.count || 0);
    if (numTests === 0 && POPULAR_TESTS.length > 0) {
      console.log(`[Database Seeder] Seeding ${POPULAR_TESTS.length} curriculum test modules into PostgreSQL...`);
      testsCount = await bulkInsertTestsInDb(POPULAR_TESTS, 'system-seeder');
    }

    // 3. Seed Past Papers if empty
    const existingPapers = await db.select({ count: sql<number>`count(*)` }).from(pastPapers);
    const numPapers = Number(existingPapers[0]?.count || 0);
    const allPaperSources = [...PAST_PAPERS_DATA, ...MASTER_PAST_PAPERS];
    // Deduplicate by ID
    const uniquePapersMap = new Map<string, PastPaper>();
    allPaperSources.forEach((p) => uniquePapersMap.set(p.id, p));
    const uniquePapers = Array.from(uniquePapersMap.values());

    if (numPapers === 0 && uniquePapers.length > 0) {
      console.log(`[Database Seeder] Seeding ${uniquePapers.length} authentic Board Past Papers into PostgreSQL...`);
      papersCount = await bulkInsertPastPapersInDb(uniquePapers, 'system-seeder');
    }

    // 4. Seed Study Notes if empty
    const existingNotes = await db.select({ count: sql<number>`count(*)` }).from(studyNotes);
    const numNotes = Number(existingNotes[0]?.count || 0);
    const allNoteSources = [...STUDY_NOTES_DATA, ...MASTER_STUDY_NOTES];
    // Deduplicate by ID
    const uniqueNotesMap = new Map<string, StudyNote>();
    allNoteSources.forEach((n) => uniqueNotesMap.set(n.id, n));
    const uniqueNotes = Array.from(uniqueNotesMap.values());

    if (numNotes === 0 && uniqueNotes.length > 0) {
      console.log(`[Database Seeder] Seeding ${uniqueNotes.length} chapter study notes into PostgreSQL...`);
      notesCount = await bulkInsertStudyNotesInDb(uniqueNotes, 'system-seeder');
    }
  } catch (error) {
    console.error('Notice: Error during initial database content seeding:', error);
  }

  return { mcqsCount, testsCount, papersCount, notesCount };
}

// ============================================================================
// 6. COMPREHENSIVE STATS FROM POSTGRESQL (Real database values only)
// ============================================================================

export async function getComprehensiveStatsFromDb(): Promise<{
  totalUsers: number;
  totalSubmissions: number;
  totalMCQs: number;
  publishedMCQs: number;
  draftMCQs: number;
  archivedMCQs: number;
  totalTests: number;
  publishedTests: number;
  draftTests: number;
  totalPastPapers: number;
  publishedPastPapers: number;
  draftPastPapers: number;
  totalStudyNotes: number;
  publishedStudyNotes: number;
  draftStudyNotes: number;
  totalReports: number;
  openReports: number;
  resolvedReports: number;
  totalAuditLogs: number;
}> {
  if (!db) {
    return {
      totalUsers: 0,
      totalSubmissions: 0,
      totalMCQs: 0,
      publishedMCQs: 0,
      draftMCQs: 0,
      archivedMCQs: 0,
      totalTests: 0,
      publishedTests: 0,
      draftTests: 0,
      totalPastPapers: 0,
      publishedPastPapers: 0,
      draftPastPapers: 0,
      totalStudyNotes: 0,
      publishedStudyNotes: 0,
      draftStudyNotes: 0,
      totalReports: 0,
      openReports: 0,
      resolvedReports: 0,
      totalAuditLogs: 0,
    };
  }

  try {
    const [
      uCount,
      subCount,
      mcqAll,
      mcqPub,
      mcqDraft,
      mcqArch,
      testAll,
      testPub,
      testDraft,
      paperAll,
      paperPub,
      paperDraft,
      noteAll,
      notePub,
      noteDraft,
      repAll,
      repOpen,
      repRes,
      audAll,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(testResults),
      db.select({ count: sql<number>`count(*)` }).from(mcqs),
      db.select({ count: sql<number>`count(*)` }).from(mcqs).where(eq(mcqs.status, 'Published')),
      db.select({ count: sql<number>`count(*)` }).from(mcqs).where(eq(mcqs.status, 'Draft')),
      db.select({ count: sql<number>`count(*)` }).from(mcqs).where(eq(mcqs.status, 'Archived')),
      db.select({ count: sql<number>`count(*)` }).from(tests),
      db.select({ count: sql<number>`count(*)` }).from(tests).where(eq(tests.status, 'Published')),
      db.select({ count: sql<number>`count(*)` }).from(tests).where(eq(tests.status, 'Draft')),
      db.select({ count: sql<number>`count(*)` }).from(pastPapers),
      db.select({ count: sql<number>`count(*)` }).from(pastPapers).where(eq(pastPapers.status, 'Published')),
      db.select({ count: sql<number>`count(*)` }).from(pastPapers).where(eq(pastPapers.status, 'Draft')),
      db.select({ count: sql<number>`count(*)` }).from(studyNotes),
      db.select({ count: sql<number>`count(*)` }).from(studyNotes).where(eq(studyNotes.status, 'Published')),
      db.select({ count: sql<number>`count(*)` }).from(studyNotes).where(eq(studyNotes.status, 'Draft')),
      db.select({ count: sql<number>`count(*)` }).from(contentReports),
      db.select({ count: sql<number>`count(*)` }).from(contentReports).where(eq(contentReports.status, 'OPEN')),
      db.select({ count: sql<number>`count(*)` }).from(contentReports).where(eq(contentReports.status, 'RESOLVED')),
      db.select({ count: sql<number>`count(*)` }).from(auditLogs),
    ]);

    return {
      totalUsers: Number(uCount[0]?.count || 0),
      totalSubmissions: Number(subCount[0]?.count || 0),
      totalMCQs: Number(mcqAll[0]?.count || 0),
      publishedMCQs: Number(mcqPub[0]?.count || 0),
      draftMCQs: Number(mcqDraft[0]?.count || 0),
      archivedMCQs: Number(mcqArch[0]?.count || 0),
      totalTests: Number(testAll[0]?.count || 0),
      publishedTests: Number(testPub[0]?.count || 0),
      draftTests: Number(testDraft[0]?.count || 0),
      totalPastPapers: Number(paperAll[0]?.count || 0),
      publishedPastPapers: Number(paperPub[0]?.count || 0),
      draftPastPapers: Number(paperDraft[0]?.count || 0),
      totalStudyNotes: Number(noteAll[0]?.count || 0),
      publishedStudyNotes: Number(notePub[0]?.count || 0),
      draftStudyNotes: Number(noteDraft[0]?.count || 0),
      totalReports: Number(repAll[0]?.count || 0),
      openReports: Number(repOpen[0]?.count || 0),
      resolvedReports: Number(repRes[0]?.count || 0),
      totalAuditLogs: Number(audAll[0]?.count || 0),
    };
  } catch (error) {
    console.error('Error fetching comprehensive stats from DB:', error);
    return {
      totalUsers: 0,
      totalSubmissions: 0,
      totalMCQs: 0,
      publishedMCQs: 0,
      draftMCQs: 0,
      archivedMCQs: 0,
      totalTests: 0,
      publishedTests: 0,
      draftTests: 0,
      totalPastPapers: 0,
      publishedPastPapers: 0,
      draftPastPapers: 0,
      totalStudyNotes: 0,
      publishedStudyNotes: 0,
      draftStudyNotes: 0,
      totalReports: 0,
      openReports: 0,
      resolvedReports: 0,
      totalAuditLogs: 0,
    };
  }
}

// ============================================================================
// 7. BULK CMS OPERATIONS (Status updates, batch creation, bulk deletion)
// ============================================================================

export async function bulkUpdateMCQStatusInDb(
  ids: string[],
  status: 'Published' | 'Draft' | 'Archived',
  updatedBy?: string
): Promise<number> {
  if (!db || ids.length === 0) return 0;
  const result = await db
    .update(mcqs)
    .set({
      status,
      updatedBy: updatedBy || 'admin',
      updatedAt: new Date(),
    })
    .where(inArray(mcqs.id, ids));
  return ids.length;
}

export async function bulkDeleteMCQsInDb(ids: string[]): Promise<number> {
  if (!db || ids.length === 0) return 0;
  await db.delete(mcqs).where(inArray(mcqs.id, ids));
  return ids.length;
}

export async function bulkCreateMCQsBatchInDb(
  items: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
    subject: string;
    chapter?: string;
    topic?: string;
    difficulty?: string;
    classLevel?: string;
    board?: string;
    exam?: string;
    year?: number;
    tags?: string[];
    language?: string;
    status?: string;
  }>,
  authorUid?: string
): Promise<{ inserted: number; errors: Array<{ index: number; error: string }> }> {
  if (!db || items.length === 0) {
    return { inserted: 0, errors: [] };
  }

  const errors: Array<{ index: number; error: string }> = [];
  const validRecords: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.question || typeof item.question !== 'string' || item.question.trim().length < 5) {
      errors.push({ index: i, error: `Row ${i + 1}: Question text must be at least 5 characters.` });
      continue;
    }
    if (!Array.isArray(item.options) || item.options.length < 2) {
      errors.push({ index: i, error: `Row ${i + 1}: At least 2 options are required.` });
      continue;
    }
    const emptyOptIndex = item.options.findIndex((opt) => typeof opt !== 'string' || !opt.trim());
    if (emptyOptIndex !== -1) {
      errors.push({ index: i, error: `Row ${i + 1}: Option ${String.fromCharCode(65 + emptyOptIndex)} cannot be empty.` });
      continue;
    }
    if (typeof item.correctAnswer !== 'number' || item.correctAnswer < 0 || item.correctAnswer >= item.options.length) {
      errors.push({ index: i, error: `Row ${i + 1}: Correct answer index (${item.correctAnswer}) is out of bounds.` });
      continue;
    }
    if (!item.subject || !item.subject.trim()) {
      errors.push({ index: i, error: `Row ${i + 1}: Subject is required.` });
      continue;
    }

    const id = `mcq-bulk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`;
    validRecords.push({
      id,
      question: item.question.trim(),
      options: item.options.map((o) => o.trim()),
      correctAnswer: item.correctAnswer,
      explanation: item.explanation?.trim() || null,
      subject: item.subject.trim(),
      chapter: item.chapter?.trim() || null,
      topic: item.topic?.trim() || null,
      difficulty: item.difficulty || 'Medium',
      classLevel: item.classLevel?.trim() || null,
      board: item.board?.trim() || null,
      exam: item.exam?.trim() || null,
      year: item.year || null,
      tags: Array.isArray(item.tags) ? item.tags : [],
      language: item.language || 'English',
      status: item.status || 'Published',
      createdBy: authorUid || 'admin',
      updatedBy: authorUid || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  if (validRecords.length > 0) {
    try {
      await db.insert(mcqs).values(validRecords);
    } catch (err: any) {
      console.error('Error in batch insert of MCQs:', err);
      // If batch fails, try inserting individually to isolate failed record
      let singleInserted = 0;
      for (let j = 0; j < validRecords.length; j++) {
        try {
          await db.insert(mcqs).values(validRecords[j]);
          singleInserted++;
        } catch (singleErr: any) {
          errors.push({ index: j, error: `Database insert failed: ${singleErr?.message || 'Conflict'}` });
        }
      }
      return { inserted: singleInserted, errors };
    }
  }

  return { inserted: validRecords.length, errors };
}

export async function bulkUpdateTestStatusInDb(
  ids: string[],
  status: 'Published' | 'Draft' | 'Archived',
  updatedBy?: string
): Promise<number> {
  if (!db || ids.length === 0) return 0;
  await db
    .update(tests)
    .set({
      status,
      updatedBy: updatedBy || 'admin',
      updatedAt: new Date(),
    })
    .where(inArray(tests.id, ids));
  return ids.length;
}

export async function bulkDeleteTestsInDb(ids: string[]): Promise<number> {
  if (!db || ids.length === 0) return 0;
  await db.delete(tests).where(inArray(tests.id, ids));
  return ids.length;
}

export async function bulkUpdatePastPaperStatusInDb(
  ids: string[],
  status: 'Published' | 'Draft' | 'Archived',
  updatedBy?: string
): Promise<number> {
  if (!db || ids.length === 0) return 0;
  await db
    .update(pastPapers)
    .set({
      status,
      updatedBy: updatedBy || 'admin',
      updatedAt: new Date(),
    })
    .where(inArray(pastPapers.id, ids));
  return ids.length;
}

export async function bulkDeletePastPapersInDb(ids: string[]): Promise<number> {
  if (!db || ids.length === 0) return 0;
  await db.delete(pastPapers).where(inArray(pastPapers.id, ids));
  return ids.length;
}

export async function bulkUpdateStudyNoteStatusInDb(
  ids: string[],
  status: 'Published' | 'Draft' | 'Archived',
  updatedBy?: string
): Promise<number> {
  if (!db || ids.length === 0) return 0;
  await db
    .update(studyNotes)
    .set({
      status,
      updatedBy: updatedBy || 'admin',
      updatedAt: new Date(),
    })
    .where(inArray(studyNotes.id, ids));
  return ids.length;
}

export async function bulkDeleteStudyNotesInDb(ids: string[]): Promise<number> {
  if (!db || ids.length === 0) return 0;
  await db.delete(studyNotes).where(inArray(studyNotes.id, ids));
  return ids.length;
}

// ============================================================================
// 8. ACADEMIC HIERARCHY DATABASE OPERATIONS (Boards, Classes, Subjects, Chapters)
// ============================================================================

export async function getBoardsFromDb(statusFilter?: string) {
  if (!db) return [];
  if (statusFilter && statusFilter !== 'All') {
    return await db.select().from(boards).where(eq(boards.status, statusFilter)).orderBy(boards.name);
  }
  return await db.select().from(boards).orderBy(boards.name);
}

export async function createBoardInDb(name: string, status: string = 'Active') {
  if (!db) return null;
  const [created] = await db
    .insert(boards)
    .values({
      name: name.trim(),
      status: status || 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

export async function updateBoardInDb(id: number, updates: { name?: string; status?: string }) {
  if (!db) return null;
  const [updated] = await db
    .update(boards)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(boards.id, id))
    .returning();
  return updated;
}

export async function deleteBoardInDb(id: number): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: 'Database unavailable' };
  // Check dependencies: classes linked to this board
  const linkedClasses = await db.select({ count: sql<number>`count(*)` }).from(classes).where(eq(classes.boardId, id));
  if (Number(linkedClasses[0]?.count || 0) > 0) {
    return {
      success: false,
      error: 'Cannot delete board because it has associated classes. Deactivate it instead.',
    };
  }
  await db.delete(boards).where(eq(boards.id, id));
  return { success: true };
}

export async function getClassesFromDb(boardId?: number, statusFilter?: string) {
  if (!db) return [];
  const conditions = [];
  if (boardId) conditions.push(eq(classes.boardId, boardId));
  if (statusFilter && statusFilter !== 'All') conditions.push(eq(classes.status, statusFilter));
  if (conditions.length > 0) {
    return await db.select().from(classes).where(and(...conditions)).orderBy(classes.name);
  }
  return await db.select().from(classes).orderBy(classes.name);
}

export async function createClassInDb(boardId: number, name: string, status: string = 'Active') {
  if (!db) return null;
  const [created] = await db
    .insert(classes)
    .values({
      boardId,
      name: name.trim(),
      status: status || 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

export async function updateClassInDb(id: number, updates: { name?: string; status?: string; boardId?: number }) {
  if (!db) return null;
  const [updated] = await db
    .update(classes)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(classes.id, id))
    .returning();
  return updated;
}

export async function deleteClassInDb(id: number): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: 'Database unavailable' };
  const linkedSubjects = await db.select({ count: sql<number>`count(*)` }).from(subjects).where(eq(subjects.classId, id));
  if (Number(linkedSubjects[0]?.count || 0) > 0) {
    return {
      success: false,
      error: 'Cannot delete class because it has associated subjects. Deactivate it instead.',
    };
  }
  await db.delete(classes).where(eq(classes.id, id));
  return { success: true };
}

export async function getSubjectsFromDb(classId?: number, statusFilter?: string) {
  if (!db) return [];
  const conditions = [];
  if (classId) conditions.push(eq(subjects.classId, classId));
  if (statusFilter && statusFilter !== 'All') conditions.push(eq(subjects.status, statusFilter));
  if (conditions.length > 0) {
    return await db.select().from(subjects).where(and(...conditions)).orderBy(subjects.name);
  }
  return await db.select().from(subjects).orderBy(subjects.name);
}

export async function createSubjectInDb(classId: number, name: string, status: string = 'Active') {
  if (!db) return null;
  const [created] = await db
    .insert(subjects)
    .values({
      classId,
      name: name.trim(),
      status: status || 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

export async function updateSubjectInDb(id: number, updates: { name?: string; status?: string; classId?: number }) {
  if (!db) return null;
  const [updated] = await db
    .update(subjects)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(subjects.id, id))
    .returning();
  return updated;
}

export async function deleteSubjectInDb(id: number): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: 'Database unavailable' };
  const linkedChapters = await db.select({ count: sql<number>`count(*)` }).from(chapters).where(eq(chapters.subjectId, id));
  if (Number(linkedChapters[0]?.count || 0) > 0) {
    return {
      success: false,
      error: 'Cannot delete subject because it has associated chapters. Deactivate it instead.',
    };
  }
  await db.delete(subjects).where(eq(subjects.id, id));
  return { success: true };
}

export async function getChaptersFromDb(subjectId?: number, statusFilter?: string) {
  if (!db) return [];
  const conditions = [];
  if (subjectId) conditions.push(eq(chapters.subjectId, subjectId));
  if (statusFilter && statusFilter !== 'All') conditions.push(eq(chapters.status, statusFilter));
  if (conditions.length > 0) {
    return await db.select().from(chapters).where(and(...conditions)).orderBy(chapters.name);
  }
  return await db.select().from(chapters).orderBy(chapters.name);
}

export async function createChapterInDb(
  subjectId: number,
  name: string,
  status: string = 'Active',
  draftStatus: string = 'Published'
) {
  if (!db) return null;
  const [created] = await db
    .insert(chapters)
    .values({
      subjectId,
      name: name.trim(),
      status: status || 'Active',
      draftStatus: draftStatus || 'Published',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

export async function updateChapterInDb(
  id: number,
  updates: { name?: string; status?: string; draftStatus?: string; subjectId?: number }
) {
  if (!db) return null;
  const [updated] = await db
    .update(chapters)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(chapters.id, id))
    .returning();
  return updated;
}

export async function deleteChapterInDb(id: number): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: 'Database unavailable' };
  await db.delete(chapters).where(eq(chapters.id, id));
  return { success: true };
}

// Initial Hierarchy Seeder (Populates foundational boards, classes, subjects, chapters from educationalHierarchy.ts)
export async function seedInitialHierarchy(): Promise<{
  boardsCount: number;
  classesCount: number;
  subjectsCount: number;
  chaptersCount: number;
}> {
  if (!db) return { boardsCount: 0, classesCount: 0, subjectsCount: 0, chaptersCount: 0 };

  let boardsCount = 0;
  let classesCount = 0;
  let subjectsCount = 0;
  let chaptersCount = 0;

  try {
    const existingBoards = await db.select({ count: sql<number>`count(*)` }).from(boards);
    if (Number(existingBoards[0]?.count || 0) === 0) {
      console.log('[Hierarchy Seeder] Seeding foundational Pakistani boards...');
      for (const b of PAKISTAN_BOARDS) {
        await db.insert(boards).values({
          name: b.name,
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        boardsCount++;
      }
    }

    const existingClasses = await db.select({ count: sql<number>`count(*)` }).from(classes);
    const dbBoards = await db.select().from(boards).limit(1);
    const defaultBoardId = dbBoards[0]?.id || 1;

    if (Number(existingClasses[0]?.count || 0) === 0) {
      console.log('[Hierarchy Seeder] Seeding academic classes...');
      for (const c of ACADEMIC_CLASSES) {
        await db.insert(classes).values({
          boardId: defaultBoardId,
          name: c.name,
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        classesCount++;
      }
    }

    const existingSubjects = await db.select({ count: sql<number>`count(*)` }).from(subjects);
    const dbClasses = await db.select().from(classes).limit(1);
    const defaultClassId = dbClasses[0]?.id || 1;

    if (Number(existingSubjects[0]?.count || 0) === 0) {
      console.log('[Hierarchy Seeder] Seeding academic subjects...');
      for (const s of ACADEMIC_SUBJECTS) {
        await db.insert(subjects).values({
          classId: defaultClassId,
          name: s.name,
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        subjectsCount++;
      }
    }

    const existingChapters = await db.select({ count: sql<number>`count(*)` }).from(chapters);
    const dbSubjects = await db.select().from(subjects).limit(1);
    const defaultSubjectId = dbSubjects[0]?.id || 1;

    if (Number(existingChapters[0]?.count || 0) === 0) {
      console.log('[Hierarchy Seeder] Seeding academic chapters...');
      for (const ch of ACADEMIC_CHAPTERS) {
        await db.insert(chapters).values({
          subjectId: defaultSubjectId,
          name: ch.name,
          status: 'Active',
          draftStatus: 'Published',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        chaptersCount++;
      }
    }
  } catch (error) {
    console.error('Notice: Error seeding academic hierarchy:', error);
  }

  return { boardsCount, classesCount, subjectsCount, chaptersCount };
}

// ============================================================================
// 5. CONTENT APPROVAL & MODERATION LIFECYCLE WORKFLOW
// ============================================================================

export async function moderateContentItemInDb(params: {
  contentType: 'MCQ' | 'Test' | 'PastPaper' | 'StudyNote' | 'Document';
  id: string;
  targetStatus: 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived';
  userUid: string;
  userRoles?: string[];
  rejectionReason?: string;
  changeNotes?: string;
}): Promise<{ success: boolean; item: any; message?: string }> {
  if (!db) throw new Error('Database not connected');

  const { contentType, id, targetStatus, userUid, userRoles = [], rejectionReason, changeNotes } = params;

  let table: any;
  let idCol: any;
  if (contentType === 'MCQ') { table = mcqs; idCol = mcqs.id; }
  else if (contentType === 'Test') { table = tests; idCol = tests.id; }
  else if (contentType === 'PastPaper') { table = pastPapers; idCol = pastPapers.id; }
  else if (contentType === 'StudyNote') { table = studyNotes; idCol = studyNotes.id; }
  else if (contentType === 'Document') { table = documents; idCol = documents.id; }
  else throw new Error(`Invalid contentType: ${contentType}`);

  const existingRows = await db.select().from(table).where(eq(idCol, id)).limit(1);
  if (existingRows.length === 0) {
    return { success: false, item: null, message: 'Content item not found' };
  }
  const item = existingRows[0];

  const normalizedRoles = userRoles.map((r) => r.toLowerCase());
  const isCallerAdmin = normalizedRoles.includes('admin') || normalizedRoles.includes('superadmin');

  // Self-Approval Prevention Rule: Creator cannot approve or publish their own content unless Admin/SuperAdmin
  if ((targetStatus === 'Approved' || targetStatus === 'Published') && item.createdBy === userUid && !isCallerAdmin) {
    return {
      success: false,
      item,
      message: 'Forbidden: Self-approval is disabled. Independent review by an Editor or Admin is required.',
    };
  }

  // Rejection Reason Check
  if (targetStatus === 'Rejected' && (!rejectionReason || rejectionReason.trim().length === 0)) {
    return {
      success: false,
      item,
      message: 'A review rejection reason is required when rejecting content.',
    };
  }

  const currentVersion = item.version || 1;
  const newVersion = targetStatus === 'Published' || item.status === 'Published' ? currentVersion + 1 : currentVersion;

  const updateFields: any = {
    status: targetStatus,
    updatedAt: new Date(),
    updatedBy: userUid,
    version: newVersion,
  };

  if (targetStatus === 'Pending Review') {
    updateFields.submittedBy = userUid;
  }
  if (targetStatus === 'Approved' || targetStatus === 'Published' || targetStatus === 'Rejected') {
    updateFields.reviewedBy = userUid;
    updateFields.reviewedAt = new Date();
  }
  if (targetStatus === 'Rejected') {
    updateFields.rejectionReason = rejectionReason?.trim();
  } else {
    updateFields.rejectionReason = null;
  }
  if (changeNotes) {
    updateFields.changeNotes = changeNotes.trim();
  }

  await db.update(table).set(updateFields).where(eq(idCol, id));

  const updatedRows = await db.select().from(table).where(eq(idCol, id)).limit(1);
  const updatedItem = updatedRows[0];

  // Record version snapshot if published or publishing
  if (targetStatus === 'Published' || item.status === 'Published') {
    await db.insert(contentVersions).values({
      contentType,
      contentId: id,
      versionNumber: newVersion,
      status: targetStatus,
      snapshot: updatedItem,
      changeNotes: changeNotes?.trim() || `Status changed to ${targetStatus}`,
      rejectionReason: targetStatus === 'Rejected' ? rejectionReason?.trim() : null,
      createdBy: userUid,
      createdAt: new Date(),
    });
  }

  // Audit log entry
  await saveAuditLogToDb({
    adminUid: userUid,
    adminEmail: 'moderator@taleemguru.pk',
    adminName: 'Staff Moderator',
    action: `CONTENT_STATUS_${targetStatus.replace(/\s+/g, '_').toUpperCase()}`,
    targetType: contentType.toUpperCase(),
    targetId: id,
    details: `Transitioned ${contentType} ${id} status from "${item.status}" to "${targetStatus}"${rejectionReason ? `. Reason: ${rejectionReason}` : ''}`,
    subject: item.subject || undefined,
    classLevel: item.classLevel || undefined,
    board: item.board || undefined,
  });

  return { success: true, item: updatedItem };
}

export async function bulkModerateContentInDb(params: {
  contentType: 'MCQ' | 'Test' | 'PastPaper' | 'StudyNote' | 'Document';
  ids: string[];
  targetStatus: 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived';
  userUid: string;
  userRoles?: string[];
  rejectionReason?: string;
  changeNotes?: string;
}): Promise<{ successCount: number; failedCount: number; skippedSelfApprovalCount: number; details: any[] }> {
  let successCount = 0;
  let failedCount = 0;
  let skippedSelfApprovalCount = 0;
  const details = [];

  for (const id of params.ids) {
    try {
      const res = await moderateContentItemInDb({ ...params, id });
      if (res.success) {
        successCount++;
        details.push({ id, success: true, status: params.targetStatus });
      } else if (res.message?.includes('Self-approval')) {
        skippedSelfApprovalCount++;
        details.push({ id, success: false, reason: res.message });
      } else {
        failedCount++;
        details.push({ id, success: false, reason: res.message });
      }
    } catch (err: any) {
      failedCount++;
      details.push({ id, success: false, reason: err.message });
    }
  }

  return { successCount, failedCount, skippedSelfApprovalCount, details };
}

export async function getContentVersionHistoryFromDb(contentType: string, contentId: string) {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(contentVersions)
      .where(and(eq(contentVersions.contentType, contentType), eq(contentVersions.contentId, contentId)))
      .orderBy(desc(contentVersions.versionNumber));
  } catch (error) {
    console.error('Error in getContentVersionHistoryFromDb:', error);
    return [];
  }
}

