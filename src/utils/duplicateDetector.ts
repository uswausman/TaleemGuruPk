import { MCQ, TestConfig } from '../types';
import { MCQS_DATABASE, POPULAR_TESTS } from '../data/mockData';

/**
 * Normalizes text for comparison:
 * - Trims whitespace
 * - Converts to lowercase
 * - Replaces multiple whitespace/newlines with a single space
 * - Strips trailing punctuation (like ?, ., !, :)
 */
export function normalizeContent(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?.!:,;]+$/, '')
    .trim();
}

export interface DuplicateMCQCheckResult {
  isDuplicate: boolean;
  existingMCQ?: MCQ;
  reason?: string;
  matchType?: 'exact' | 'same_subject_class_board' | 'same_subject' | 'cross_subject';
}

/**
 * Checks if a question content already exists in the local state or database/storage,
 * comparing question string, subject, class, and board to prevent duplicates.
 */
export function checkDuplicateMCQ(
  questionText: string,
  subject?: string,
  classLevel?: string,
  board?: string,
  currentId?: string,
  localQuestions?: MCQ[]
): DuplicateMCQCheckResult {
  const normInput = normalizeContent(questionText);
  if (!normInput || normInput.length < 5) {
    return { isDuplicate: false };
  }

  // Aggregate questions from:
  // 1. Provided local questions
  // 2. localStorage cached questions
  // 3. Built-in default database
  const questionsMap = new Map<string, MCQ>();

  // Add built-in
  MCQS_DATABASE.forEach((q) => questionsMap.set(q.id, q));

  // Add localStorage if available
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('taleem_guru_mcqs');
      if (saved) {
        const parsed: MCQ[] = JSON.parse(saved);
        parsed.forEach((q) => questionsMap.set(q.id, q));
      }
    } catch (e) {
      // ignore parsing error
    }
  }

  // Add current local state
  if (localQuestions) {
    localQuestions.forEach((q) => questionsMap.set(q.id, q));
  }

  const allQuestions = Array.from(questionsMap.values());
  const normSubject = normalizeContent(subject || '');
  const normClass = normalizeContent(classLevel || '');
  const normBoard = normalizeContent(board || '');

  for (const q of allQuestions) {
    // Skip if comparing with itself during edit
    if (currentId && q.id === currentId) continue;

    const normExisting = normalizeContent(q.question);
    if (normInput === normExisting) {
      const qNormSubject = normalizeContent(q.subject || '');
      const qNormClass = normalizeContent(q.classLevel || '');
      const qNormBoard = normalizeContent(q.board || '');

      const isSameSubject = !normSubject || qNormSubject === normSubject;
      const isSameClass = !normClass || qNormClass === normClass;
      const isSameBoard =
        !normBoard ||
        qNormBoard === normBoard ||
        normBoard.includes('all') ||
        qNormBoard.includes('all');

      if (isSameSubject && isSameClass && isSameBoard) {
        return {
          isDuplicate: true,
          existingMCQ: q,
          matchType: 'exact',
          reason: `Exact duplicate found in ${q.subject} (${q.classLevel || 'General'}) - ${q.board || 'All Boards'}.`,
        };
      }

      if (isSameSubject && isSameClass) {
        return {
          isDuplicate: true,
          existingMCQ: q,
          matchType: 'same_subject_class_board',
          reason: `Duplicate question found in ${q.subject} (${q.classLevel || 'General'}) under ${q.board || 'another board'}.`,
        };
      }

      if (isSameSubject) {
        return {
          isDuplicate: true,
          existingMCQ: q,
          matchType: 'same_subject',
          reason: `Identical question already exists in ${q.subject} for ${q.classLevel || 'another class'}.`,
        };
      }

      return {
        isDuplicate: true,
        existingMCQ: q,
        matchType: 'cross_subject',
        reason: `Identical question already exists in ${q.subject} (${q.classLevel || ''}).`,
      };
    }
  }

  return { isDuplicate: false };
}

export interface DuplicateTestCheckResult {
  isDuplicate: boolean;
  existingTest?: TestConfig;
  reason?: string;
  matchType?: 'exact' | 'title_only' | 'same_subject_class_board';
}

/**
 * Checks if a test title already exists in the local state or database/storage.
 */
export function checkDuplicateTest(
  title: string,
  subject: string,
  classLevel: string,
  board: string,
  currentId?: string,
  localQuizzes?: TestConfig[]
): DuplicateTestCheckResult {
  const normTitle = normalizeContent(title);
  if (!normTitle || normTitle.length < 3) {
    return { isDuplicate: false };
  }

  // Aggregate tests from:
  // 1. Built-in POPULAR_TESTS
  // 2. localStorage cached tests
  // 3. Provided local tests
  const testsMap = new Map<string, TestConfig>();

  POPULAR_TESTS.forEach((t) => testsMap.set(t.id, t));

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('taleem_guru_tests');
      if (saved) {
        const parsed: TestConfig[] = JSON.parse(saved);
        parsed.forEach((t) => testsMap.set(t.id, t));
      }
    } catch (e) {
      // ignore parsing error
    }
  }

  if (localQuizzes) {
    localQuizzes.forEach((t) => testsMap.set(t.id, t));
  }

  const allTests = Array.from(testsMap.values());

  for (const t of allTests) {
    // Skip if comparing with itself during edit
    if (currentId && t.id === currentId) continue;

    const normExistingTitle = normalizeContent(t.title);
    if (normTitle === normExistingTitle) {
      return {
        isDuplicate: true,
        existingTest: t,
        matchType: 'exact',
        reason: `A test with title "${t.title}" already exists for ${t.subject} (${t.classLevel || 'General'}, ${t.board || 'All Boards'}).`,
      };
    }
  }

  return { isDuplicate: false };
}
