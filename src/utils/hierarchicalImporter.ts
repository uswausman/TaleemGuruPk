import { MCQ, PastPaper, StudyNote, TestConfig, Difficulty, TestType } from '../types';
import {
  EducationalScope,
  ImportMode,
  DuplicateStrategy,
  ScopeOverridePolicy,
  ParsedItemWrapper,
  HierarchicalParseResult,
  ValidationStatus,
} from '../types/bulkImport';
import {
  PAKISTAN_BOARDS,
  ACADEMIC_CLASSES,
  ACADEMIC_SUBJECTS,
  ACADEMIC_CHAPTERS,
} from '../data/educationalHierarchy';
import { parseCSVToRows } from './importer';

/**
 * Slugify a string for clean IDs
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .substring(0, 30);
}

/**
 * Normalizes question or title text for duplicate detection
 */
export function normalizeTextForDuplicateCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect Urdu script in text
 */
export function containsUrdu(text: string): boolean {
  const urduRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return urduRegex.test(text);
}

/**
 * Generate a smart hierarchical ID
 */
export function generateSmartId(
  prefix: string,
  scope: {
    board?: string;
    classLevel?: string;
    subject?: string;
    chapter?: string;
    year?: number | string;
  },
  index: number
): string {
  const b = slugify(scope.board || 'bise-lahore').replace(/^bise-/, '');
  const c = slugify(scope.classLevel || '10').replace(/^class-/, '');
  const s = slugify(scope.subject || 'phy');
  const ch = scope.chapter && scope.chapter !== 'auto-detect' ? slugify(scope.chapter).substring(0, 15) : 'gen';
  const rand = Math.random().toString(36).substring(2, 6);
  const padIdx = String(index + 1).padStart(3, '0');

  return `${prefix}-${b}-${c}-${s}-${ch}-${padIdx}-${rand}`;
}

/**
 * Auto-detect educational scope from text content or headers
 */
export function autoDetectScopeFromContent(
  rawText: string,
  headers: string[] = []
): Partial<EducationalScope> {
  const detected: Partial<EducationalScope> = {};
  const lowerText = rawText.toLowerCase().slice(0, 5000); // inspect first 5000 chars

  // 1. Detect Board
  if (lowerText.includes('fbise') || lowerText.includes('federal board')) {
    detected.board = 'Federal Board (FBISE)';
    detected.province = 'Federal Capital';
  } else if (lowerText.includes('lahore')) {
    detected.board = 'BISE Lahore';
    detected.province = 'Punjab';
  } else if (lowerText.includes('rawalpindi')) {
    detected.board = 'BISE Rawalpindi';
    detected.province = 'Punjab';
  } else if (lowerText.includes('faisalabad')) {
    detected.board = 'BISE Faisalabad';
    detected.province = 'Punjab';
  } else if (lowerText.includes('multan')) {
    detected.board = 'BISE Multan';
    detected.province = 'Punjab';
  } else if (lowerText.includes('gujranwala')) {
    detected.board = 'BISE Gujranwala';
    detected.province = 'Punjab';
  } else if (lowerText.includes('karachi') || lowerText.includes('biek') || lowerText.includes('bsek')) {
    detected.board = 'BIEK Karachi';
    detected.province = 'Sindh';
  } else if (lowerText.includes('peshawar')) {
    detected.board = 'BISE Peshawar';
    detected.province = 'Khyber Pakhtunkhwa';
  } else if (lowerText.includes('quetta')) {
    detected.board = 'BISE Quetta';
    detected.province = 'Balochistan';
  } else if (lowerText.includes('mirpur') || lowerText.includes('ajk')) {
    detected.board = 'BISE Mirpur (AJK)';
    detected.province = 'AJK';
  }

  // 2. Detect Class Level
  if (lowerText.includes('class 9') || lowerText.includes('9th') || lowerText.includes('matric pt 1') || lowerText.includes('grade 9')) {
    detected.classLevel = 'Class 9 (Matric Pt 1)';
  } else if (lowerText.includes('class 10') || lowerText.includes('10th') || lowerText.includes('matric pt 2') || lowerText.includes('grade 10')) {
    detected.classLevel = 'Class 10 (Matric Pt 2)';
  } else if (lowerText.includes('class 11') || lowerText.includes('11th') || lowerText.includes('fsc pt 1') || lowerText.includes('ics pt 1') || lowerText.includes('inter pt 1')) {
    detected.classLevel = 'Class 11 (FSc / ICS Pt 1)';
  } else if (lowerText.includes('class 12') || lowerText.includes('12th') || lowerText.includes('fsc pt 2') || lowerText.includes('ics pt 2') || lowerText.includes('inter pt 2')) {
    detected.classLevel = 'Class 12 (FSc / ICS Pt 2)';
  } else if (lowerText.includes('mdcat')) {
    detected.classLevel = 'MDCAT';
    detected.examType = 'Entry Test';
  } else if (lowerText.includes('ecat')) {
    detected.classLevel = 'ECAT';
    detected.examType = 'Entry Test';
  }

  // 3. Detect Subject
  const subjectKeywords: Record<string, string> = {
    physics: 'Physics',
    chemistry: 'Chemistry',
    biology: 'Biology',
    math: 'Mathematics',
    mathematics: 'Mathematics',
    'computer science': 'Computer Science',
    computer: 'Computer Science',
    english: 'English',
    urdu: 'Urdu',
    islamiyat: 'Islamic Studies',
    islamic: 'Islamic Studies',
    'pak studies': 'Pakistan Studies',
    pakistan: 'Pakistan Studies',
    'general science': 'General Science',
  };

  for (const [kw, subName] of Object.entries(subjectKeywords)) {
    if (lowerText.includes(kw)) {
      detected.subject = subName;
      break;
    }
  }

  // 4. Detect Medium
  if (containsUrdu(rawText)) {
    detected.medium = 'Urdu';
  } else {
    detected.medium = 'English';
  }

  // 5. Detect Year
  const yearMatch = rawText.match(/\b(20[12]\d)\b/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y >= 2015 && y <= 2030) {
      detected.academicYear = y;
    }
  }

  // 6. Detect Data Type
  if (lowerText.includes('"mcqs"') && lowerText.includes('"tests"') && lowerText.includes('"pastpapers"')) {
    detected.dataType = 'bundle';
  } else if (lowerText.includes('correctanswer') || lowerText.includes('option a') || lowerText.includes('optiona') || lowerText.includes('"question"')) {
    detected.dataType = 'mcqs';
  } else if (lowerText.includes('papergroup') || lowerText.includes('past paper') || lowerText.includes('annual paper') || lowerText.includes('questionscount')) {
    detected.dataType = 'past-papers';
  } else if (lowerText.includes('durationminutes') || lowerText.includes('testtype') || lowerText.includes('passpercentage')) {
    detected.dataType = 'tests';
  } else if (lowerText.includes('contentsnippet') || lowerText.includes('readtime') || lowerText.includes('chapter notes')) {
    detected.dataType = 'study-notes';
  }

  return detected;
}

/**
 * Resolves final values for an item based on Scope, Import Mode, and Overrides
 */
function resolveItemHierarchy(
  rawItem: any,
  scope: EducationalScope,
  mode: ImportMode,
  overridePolicy: ScopeOverridePolicy
) {
  const isForceOverride = mode === 'single-scope' && overridePolicy === 'override_all';

  const board = isForceOverride || !rawItem.board ? scope.board : String(rawItem.board).trim();
  const classLevel = isForceOverride || !rawItem.classLevel ? scope.classLevel : String(rawItem.classLevel).trim();
  const subject = isForceOverride || !rawItem.subject ? scope.subject : String(rawItem.subject).trim();
  
  let chapter = rawItem.chapter ? String(rawItem.chapter).trim() : '';
  if (isForceOverride || !chapter || chapter === 'auto-detect' || chapter === 'General Chapter') {
    if (scope.chapter && scope.chapter !== 'auto-detect') {
      chapter = scope.chapter;
    }
  }

  let topic = rawItem.topic ? String(rawItem.topic).trim() : '';
  if (isForceOverride || !topic || topic === 'auto-detect') {
    if (scope.topic && scope.topic !== 'auto-detect') {
      topic = scope.topic;
    }
  }

  let medium = rawItem.language || rawItem.medium || (scope.medium === 'Urdu' ? 'Urdu' : 'English');
  if (isForceOverride) {
    medium = scope.medium === 'Urdu' ? 'Urdu' : 'English';
  }

  let year = typeof rawItem.year === 'number' ? rawItem.year : parseInt(rawItem.year, 10);
  if (isNaN(year) || isForceOverride) {
    year = scope.academicYear;
  }

  const examType = isForceOverride || !rawItem.exam ? scope.examType : String(rawItem.exam).trim();

  return {
    board,
    classLevel,
    subject,
    chapter: chapter || 'General Chapter',
    topic: topic || undefined,
    medium,
    year,
    examType,
  };
}

/**
 * Parses and validates MCQs with educational hierarchy & duplicate detection
 */
export function parseHierarchicalMCQs(
  rawText: string,
  format: 'json' | 'csv',
  scope: EducationalScope,
  mode: ImportMode,
  overridePolicy: ScopeOverridePolicy,
  duplicateStrategy: DuplicateStrategy,
  existingMCQs: MCQ[] = []
): HierarchicalParseResult<MCQ> {
  const result: HierarchicalParseResult<MCQ> = {
    success: false,
    items: [],
    totalParsed: 0,
    validCount: 0,
    warningCount: 0,
    errorCount: 0,
    duplicateCount: 0,
    globalErrors: [],
  };

  if (!rawText.trim()) {
    result.globalErrors.push('No data provided to import.');
    return result;
  }

  // Pre-index existing questions for duplicate checking
  const existingMap = new Map<string, MCQ>();
  existingMCQs.forEach((m) => {
    const key = `${normalizeTextForDuplicateCheck(m.question)}__${(m.subject || '').toLowerCase()}__${(m.classLevel || '').toLowerCase()}`;
    existingMap.set(key, m);
  });

  // Track duplicates within current batch
  const batchSeenKeys = new Map<string, number>();

  let rawList: any[] = [];

  if (format === 'json') {
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) {
        rawList = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.mcqs)) rawList = parsed.mcqs;
        else if (Array.isArray(parsed.questions)) rawList = parsed.questions;
        else if (Array.isArray(parsed.data)) rawList = parsed.data;
        else {
          result.globalErrors.push('JSON root must be an array of questions or an object with an "mcqs" array.');
          return result;
        }
      }
    } catch (e: any) {
      result.globalErrors.push(`JSON Syntax Error: ${e.message}`);
      return result;
    }
  } else {
    // CSV / TSV
    const rows = parseCSVToRows(rawText);
    if (rows.length < 2) {
      result.globalErrors.push('CSV/TSV must include a header row and at least 1 data row.');
      return result;
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const qIdx = headers.findIndex((h) => h.includes('question') || h.includes('statement') || h === 'q');
    const aIdx = headers.findIndex((h) => h.includes('optiona') || h.includes('opt1') || h === 'a' || h === 'opta');
    const bIdx = headers.findIndex((h) => h.includes('optionb') || h.includes('opt2') || h === 'b' || h === 'optb');
    const cIdx = headers.findIndex((h) => h.includes('optionc') || h.includes('opt3') || h === 'c' || h === 'optc');
    const dIdx = headers.findIndex((h) => h.includes('optiond') || h.includes('opt4') || h === 'd' || h === 'optd');
    const ansIdx = headers.findIndex((h) => h.includes('correct') || h.includes('answer') || h.includes('ans') || h === 'key');
    const expIdx = headers.findIndex((h) => h.includes('explain') || h.includes('solution') || h.includes('reason'));
    const subIdx = headers.findIndex((h) => h.includes('subject') || h === 'sub');
    const classIdx = headers.findIndex((h) => h.includes('class') || h.includes('grade'));
    const boardIdx = headers.findIndex((h) => h.includes('board'));
    const chapIdx = headers.findIndex((h) => h.includes('chapter') || h.includes('chap'));
    const topIdx = headers.findIndex((h) => h.includes('topic'));
    const diffIdx = headers.findIndex((h) => h.includes('diff'));
    const yrIdx = headers.findIndex((h) => h.includes('year'));
    const langIdx = headers.findIndex((h) => h.includes('medium') || h.includes('language') || h.includes('lang'));

    if (qIdx === -1) {
      result.globalErrors.push('Could not locate a "Question" or "Statement" column in the header.');
      return result;
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0 || !row.some((cell) => cell.trim().length > 0)) continue;

      const q = row[qIdx] || '';
      const optA = aIdx !== -1 ? row[aIdx] || '' : row[1] || '';
      const optB = bIdx !== -1 ? row[bIdx] || '' : row[2] || '';
      const optC = cIdx !== -1 ? row[cIdx] || '' : row[3] || '';
      const optD = dIdx !== -1 ? row[dIdx] || '' : row[4] || '';

      rawList.push({
        question: q,
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        correctAnswer: ansIdx !== -1 ? row[ansIdx] : undefined,
        explanation: expIdx !== -1 ? row[expIdx] : undefined,
        subject: subIdx !== -1 ? row[subIdx] : undefined,
        classLevel: classIdx !== -1 ? row[classIdx] : undefined,
        board: boardIdx !== -1 ? row[boardIdx] : undefined,
        chapter: chapIdx !== -1 ? row[chapIdx] : undefined,
        topic: topIdx !== -1 ? row[topIdx] : undefined,
        difficulty: diffIdx !== -1 ? row[diffIdx] : undefined,
        year: yrIdx !== -1 ? row[yrIdx] : undefined,
        language: langIdx !== -1 ? row[langIdx] : undefined,
      });
    }
  }

  result.totalParsed = rawList.length;

  rawList.forEach((raw, idx) => {
    const itemErrors: string[] = [];
    const itemWarnings: string[] = [];

    // Validate Question
    const question = String(raw.question || raw.questionText || raw.statement || raw.q || '').trim();
    if (!question) {
      itemErrors.push('Question statement is empty or missing.');
    }

    // Validate Options
    let options: string[] = [];
    if (Array.isArray(raw.options)) {
      options = raw.options.map((o: any) => String(o).trim()).filter(Boolean);
    } else if (raw.optionA || raw.optionB || raw.option_a || raw.option_b) {
      options = [
        String(raw.optionA || raw.option_a || '').trim(),
        String(raw.optionB || raw.option_b || '').trim(),
        String(raw.optionC || raw.option_c || '').trim(),
        String(raw.optionD || raw.option_d || '').trim(),
      ].filter(Boolean);
    }

    if (options.length < 2) {
      itemErrors.push(`Fewer than 2 options provided (found ${options.length}). At least 2 are required.`);
    } else if (options.length < 4) {
      itemWarnings.push(`Only ${options.length} options provided; standard Pakistani board format uses 4 options.`);
      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
      }
    }

    // Validate Correct Answer
    let correctAnswer = 0;
    const rawAns = raw.correctAnswer ?? raw.correct_answer ?? raw.answer ?? raw.key;
    if (rawAns === undefined || rawAns === null || rawAns === '') {
      itemErrors.push('Missing correct answer indicator.');
    } else if (typeof rawAns === 'number') {
      if (rawAns >= 0 && rawAns < options.length) {
        correctAnswer = rawAns;
      } else {
        itemErrors.push(`Correct answer index ${rawAns} is out of range (options count: ${options.length}).`);
      }
    } else {
      const strAns = String(rawAns).trim().toUpperCase();
      if (strAns === 'A' || strAns === '1' || strAns === 'OPTION A' || strAns === 'OPTA') correctAnswer = 0;
      else if (strAns === 'B' || strAns === '2' || strAns === 'OPTION B' || strAns === 'OPTB') correctAnswer = 1;
      else if (strAns === 'C' || strAns === '3' || strAns === 'OPTION C' || strAns === 'OPTC') correctAnswer = 2;
      else if (strAns === 'D' || strAns === '4' || strAns === 'OPTION D' || strAns === 'OPTD') correctAnswer = 3;
      else {
        // Try matching option text
        const matched = options.findIndex((o) => o.toLowerCase() === String(rawAns).trim().toLowerCase());
        if (matched >= 0) {
          correctAnswer = matched;
        } else {
          itemErrors.push(`Correct answer "${rawAns}" does not match A-D, 0-3, or any of the provided option texts.`);
        }
      }
    }

    // Hierarchy resolution
    const hierarchy = resolveItemHierarchy(raw, scope, mode, overridePolicy);

    // Difficulty
    let difficulty: Difficulty = 'Medium';
    const rawDiff = String(raw.difficulty || '').toLowerCase();
    if (rawDiff.includes('easy')) difficulty = 'Easy';
    else if (rawDiff.includes('hard')) difficulty = 'Hard';

    // Duplicate Check
    const normalizedKey = `${normalizeTextForDuplicateCheck(question)}__${hierarchy.subject.toLowerCase()}__${hierarchy.classLevel.toLowerCase()}`;
    let isDuplicate = false;
    let duplicateReason: string | undefined;
    let matchedExistingId: string | undefined;

    if (existingMap.has(normalizedKey)) {
      isDuplicate = true;
      const matched = existingMap.get(normalizedKey)!;
      matchedExistingId = matched.id;
      duplicateReason = `Matches existing question in ${hierarchy.subject} (${hierarchy.classLevel}): "${matched.question.substring(0, 45)}..."`;
    } else if (batchSeenKeys.has(normalizedKey)) {
      isDuplicate = true;
      const prevIdx = batchSeenKeys.get(normalizedKey)!;
      duplicateReason = `Duplicate of row #${prevIdx + 1} inside this current import batch.`;
    } else {
      batchSeenKeys.set(normalizedKey, idx);
    }

    // Determine Status
    let status: ValidationStatus = 'valid';
    if (itemErrors.length > 0) {
      status = 'error';
    } else if (isDuplicate) {
      status = 'duplicate';
    } else if (itemWarnings.length > 0) {
      status = 'warning';
    }

    // Final Smart ID
    let finalId = raw.id;
    if (!finalId || isDuplicate && duplicateStrategy === 'create_new') {
      finalId = generateSmartId('mcq', hierarchy, idx);
    } else if (isDuplicate && duplicateStrategy === 'update' && matchedExistingId) {
      finalId = matchedExistingId;
    }

    const mcq: MCQ = {
      id: finalId,
      question,
      options: options.slice(0, 4),
      correctAnswer,
      explanation: raw.explanation || raw.solution || raw.reason || 'Verified textbook solution and rationale.',
      subject: hierarchy.subject,
      classLevel: hierarchy.classLevel,
      board: hierarchy.board,
      chapter: hierarchy.chapter,
      topic: hierarchy.topic,
      difficulty,
      year: hierarchy.year,
      tags: Array.isArray(raw.tags)
        ? raw.tags
        : [hierarchy.subject.toLowerCase(), hierarchy.classLevel.toLowerCase(), 'bulk-import'],
      language: hierarchy.medium === 'Urdu' ? 'Urdu' : 'English',
      status: raw.status === 'Draft' ? 'Draft' : 'Published',
      createdAt: raw.createdAt || new Date().toISOString(),
    };

    const wrapper: ParsedItemWrapper<MCQ> = {
      rawIndex: idx,
      item: mcq,
      status,
      errors: itemErrors,
      warnings: itemWarnings,
      isDuplicate,
      duplicateReason,
      matchedExistingId,
      hierarchy,
    };

    result.items.push(wrapper);

    if (status === 'valid') result.validCount++;
    else if (status === 'warning') result.warningCount++;
    else if (status === 'error') result.errorCount++;
    else if (status === 'duplicate') result.duplicateCount++;
  });

  result.success = result.validCount + result.warningCount + (duplicateStrategy !== 'skip' ? result.duplicateCount : 0) > 0;
  return result;
}

/**
 * Parses and validates Past Papers with educational hierarchy
 */
export function parseHierarchicalPastPapers(
  rawText: string,
  format: 'json' | 'csv',
  scope: EducationalScope,
  mode: ImportMode,
  overridePolicy: ScopeOverridePolicy,
  duplicateStrategy: DuplicateStrategy,
  existingPapers: PastPaper[] = []
): HierarchicalParseResult<PastPaper> {
  const result: HierarchicalParseResult<PastPaper> = {
    success: false,
    items: [],
    totalParsed: 0,
    validCount: 0,
    warningCount: 0,
    errorCount: 0,
    duplicateCount: 0,
    globalErrors: [],
  };

  if (!rawText.trim()) {
    result.globalErrors.push('No past paper data provided.');
    return result;
  }

  const existingMap = new Map<string, PastPaper>();
  existingPapers.forEach((p) => {
    const key = `${normalizeTextForDuplicateCheck(p.title)}__${(p.board || '').toLowerCase()}__${p.year}`;
    existingMap.set(key, p);
  });

  let rawList: any[] = [];
  if (format === 'json') {
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) rawList = parsed;
      else if (parsed.pastPapers) rawList = parsed.pastPapers;
      else if (parsed.exams) rawList = parsed.exams;
      else {
        result.globalErrors.push('JSON must be an array of past papers or contain "pastPapers" array.');
        return result;
      }
    } catch (e: any) {
      result.globalErrors.push(`JSON Syntax Error: ${e.message}`);
      return result;
    }
  } else {
    const rows = parseCSVToRows(rawText);
    if (rows.length < 2) {
      result.globalErrors.push('CSV must have header row and at least 1 data row.');
      return result;
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const tIdx = headers.findIndex((h) => h.includes('title') || h.includes('name'));
    const bIdx = headers.findIndex((h) => h.includes('board'));
    const cIdx = headers.findIndex((h) => h.includes('class'));
    const sIdx = headers.findIndex((h) => h.includes('subject'));
    const yIdx = headers.findIndex((h) => h.includes('year'));
    const gIdx = headers.findIndex((h) => h.includes('group') || h.includes('papergroup'));
    const typeIdx = headers.findIndex((h) => h.includes('type'));
    const cntIdx = headers.findIndex((h) => h.includes('count') || h.includes('questions'));
    const urlIdx = headers.findIndex((h) => h.includes('pdf') || h.includes('url') || h.includes('file'));

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.some((c) => c.trim())) continue;

      rawList.push({
        title: tIdx !== -1 ? row[tIdx] : row[0],
        board: bIdx !== -1 ? row[bIdx] : undefined,
        classLevel: cIdx !== -1 ? row[cIdx] : undefined,
        subject: sIdx !== -1 ? row[sIdx] : undefined,
        year: yIdx !== -1 ? row[yIdx] : undefined,
        paperGroup: gIdx !== -1 ? row[gIdx] : undefined,
        type: typeIdx !== -1 ? row[typeIdx] : undefined,
        questionsCount: cntIdx !== -1 ? row[cntIdx] : undefined,
        pdfUrl: urlIdx !== -1 ? row[urlIdx] : undefined,
      });
    }
  }

  result.totalParsed = rawList.length;

  rawList.forEach((raw, idx) => {
    const itemErrors: string[] = [];
    const itemWarnings: string[] = [];

    const hierarchy = resolveItemHierarchy(raw, scope, mode, overridePolicy);

    let title = String(raw.title || '').trim();
    if (!title) {
      // Auto-generate descriptive Pakistani board past paper title if missing
      title = `${hierarchy.board} ${hierarchy.classLevel} ${hierarchy.subject} Annual ${hierarchy.year}`;
      itemWarnings.push(`Missing title: auto-generated "${title}" from scope.`);
    }

    const year = typeof hierarchy.year === 'number' ? hierarchy.year : 2024;
    const questionsCount = parseInt(raw.questionsCount || raw.totalQuestions, 10) || 12;

    // Duplicate Check
    const normalizedKey = `${normalizeTextForDuplicateCheck(title)}__${hierarchy.board.toLowerCase()}__${year}`;
    let isDuplicate = false;
    let duplicateReason: string | undefined;
    let matchedExistingId: string | undefined;

    if (existingMap.has(normalizedKey)) {
      isDuplicate = true;
      const matched = existingMap.get(normalizedKey)!;
      matchedExistingId = matched.id;
      duplicateReason = `Matches existing past paper: "${matched.title}"`;
    }

    let status: ValidationStatus = 'valid';
    if (itemErrors.length > 0) status = 'error';
    else if (isDuplicate) status = 'duplicate';
    else if (itemWarnings.length > 0) status = 'warning';

    let finalId = raw.id;
    if (!finalId || (isDuplicate && duplicateStrategy === 'create_new')) {
      finalId = generateSmartId('pp', hierarchy, idx);
    } else if (isDuplicate && duplicateStrategy === 'update' && matchedExistingId) {
      finalId = matchedExistingId;
    }

    const paper: PastPaper = {
      id: finalId,
      title,
      board: hierarchy.board,
      province: scope.province === 'All Pakistan' ? 'Punjab' : scope.province,
      classLevel: hierarchy.classLevel,
      subject: hierarchy.subject,
      chapter: hierarchy.chapter,
      year,
      paperGroup: raw.paperGroup || 'Group 1',
      type: raw.type || 'Objective (MCQs)',
      questionsCount,
      pdfUrl: raw.pdfUrl || raw.fileUrl || undefined,
      questions: Array.isArray(raw.questions) ? raw.questions : undefined,
      status: 'Published',
      createdAt: new Date().toISOString(),
    };

    result.items.push({
      rawIndex: idx,
      item: paper,
      status,
      errors: itemErrors,
      warnings: itemWarnings,
      isDuplicate,
      duplicateReason,
      matchedExistingId,
      hierarchy,
    });

    if (status === 'valid') result.validCount++;
    else if (status === 'warning') result.warningCount++;
    else if (status === 'error') result.errorCount++;
    else if (status === 'duplicate') result.duplicateCount++;
  });

  result.success = result.validCount + result.warningCount + (duplicateStrategy !== 'skip' ? result.duplicateCount : 0) > 0;
  return result;
}

/**
 * Parses and validates Tests / Quizzes with educational hierarchy
 */
export function parseHierarchicalTests(
  rawText: string,
  format: 'json' | 'csv',
  scope: EducationalScope,
  mode: ImportMode,
  overridePolicy: ScopeOverridePolicy,
  duplicateStrategy: DuplicateStrategy,
  existingTests: TestConfig[] = [],
  availableMCQs: MCQ[] = []
): HierarchicalParseResult<TestConfig> {
  const result: HierarchicalParseResult<TestConfig> = {
    success: false,
    items: [],
    totalParsed: 0,
    validCount: 0,
    warningCount: 0,
    errorCount: 0,
    duplicateCount: 0,
    globalErrors: [],
  };

  if (!rawText.trim()) {
    result.globalErrors.push('No test data provided.');
    return result;
  }

  const existingMap = new Map<string, TestConfig>();
  existingTests.forEach((t) => {
    const key = `${normalizeTextForDuplicateCheck(t.title)}__${(t.subject || '').toLowerCase()}`;
    existingMap.set(key, t);
  });

  let rawList: any[] = [];
  if (format === 'json') {
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) rawList = parsed;
      else if (parsed.tests) rawList = parsed.tests;
      else {
        result.globalErrors.push('JSON must be an array of tests or contain "tests" array.');
        return result;
      }
    } catch (e: any) {
      result.globalErrors.push(`JSON Syntax Error: ${e.message}`);
      return result;
    }
  } else {
    const rows = parseCSVToRows(rawText);
    if (rows.length < 2) {
      result.globalErrors.push('CSV must have header row and at least 1 data row.');
      return result;
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const tIdx = headers.findIndex((h) => h.includes('title') || h.includes('name'));
    const sIdx = headers.findIndex((h) => h.includes('subject'));
    const cIdx = headers.findIndex((h) => h.includes('class'));
    const bIdx = headers.findIndex((h) => h.includes('board'));
    const typeIdx = headers.findIndex((h) => h.includes('type'));
    const durIdx = headers.findIndex((h) => h.includes('duration') || h.includes('time'));
    const passIdx = headers.findIndex((h) => h.includes('pass'));
    const negIdx = headers.findIndex((h) => h.includes('negative'));

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.some((c) => c.trim())) continue;

      rawList.push({
        title: tIdx !== -1 ? row[tIdx] : row[0],
        subject: sIdx !== -1 ? row[sIdx] : undefined,
        classLevel: cIdx !== -1 ? row[cIdx] : undefined,
        board: bIdx !== -1 ? row[bIdx] : undefined,
        testType: typeIdx !== -1 ? row[typeIdx] : undefined,
        durationMinutes: durIdx !== -1 ? row[durIdx] : undefined,
        passPercentage: passIdx !== -1 ? row[passIdx] : undefined,
        negativeMarking: negIdx !== -1 ? row[negIdx] : undefined,
      });
    }
  }

  result.totalParsed = rawList.length;

  rawList.forEach((raw, idx) => {
    const itemErrors: string[] = [];
    const itemWarnings: string[] = [];

    const hierarchy = resolveItemHierarchy(raw, scope, mode, overridePolicy);

    let title = String(raw.title || '').trim();
    if (!title) {
      title = `${hierarchy.subject} - ${hierarchy.chapter} Standard Assessment`;
      itemWarnings.push(`Missing title: auto-generated "${title}".`);
    }

    const durationMinutes = parseInt(raw.durationMinutes, 10) || 15;
    const passPercentage = parseInt(raw.passPercentage, 10) || 50;
    const negativeMarking = Boolean(raw.negativeMarking === true || String(raw.negativeMarking).toLowerCase() === 'true');

    // Attach questions matching subject and class
    let questions: MCQ[] = [];
    if (Array.isArray(raw.questions) && raw.questions.length > 0) {
      questions = raw.questions;
    } else {
      questions = availableMCQs
        .filter((m) => m.subject.toLowerCase() === hierarchy.subject.toLowerCase())
        .slice(0, 10);
      if (questions.length === 0) {
        questions = availableMCQs.slice(0, 10);
      }
    }

    // Duplicate Check
    const normalizedKey = `${normalizeTextForDuplicateCheck(title)}__${hierarchy.subject.toLowerCase()}`;
    let isDuplicate = false;
    let duplicateReason: string | undefined;
    let matchedExistingId: string | undefined;

    if (existingMap.has(normalizedKey)) {
      isDuplicate = true;
      const matched = existingMap.get(normalizedKey)!;
      matchedExistingId = matched.id;
      duplicateReason = `Matches existing test: "${matched.title}"`;
    }

    let status: ValidationStatus = 'valid';
    if (itemErrors.length > 0) status = 'error';
    else if (isDuplicate) status = 'duplicate';
    else if (itemWarnings.length > 0) status = 'warning';

    let finalId = raw.id;
    if (!finalId || (isDuplicate && duplicateStrategy === 'create_new')) {
      finalId = generateSmartId('test', hierarchy, idx);
    } else if (isDuplicate && duplicateStrategy === 'update' && matchedExistingId) {
      finalId = matchedExistingId;
    }

    const test: TestConfig = {
      id: finalId,
      title,
      description: raw.description || `Assessment covering ${hierarchy.chapter} for ${hierarchy.subject} (${hierarchy.classLevel})`,
      testType: (raw.testType as TestType) || (scope.examType === 'Entry Test' ? 'Entry Test' : 'Chapter Test'),
      category: hierarchy.classLevel.includes('Matric') ? 'Matric' : hierarchy.classLevel.includes('FSc') ? 'Inter' : 'General',
      subject: hierarchy.subject,
      classLevel: hierarchy.classLevel,
      board: hierarchy.board,
      chapter: hierarchy.chapter,
      durationMinutes,
      totalQuestions: questions.length || 10,
      totalMarks: questions.length || 10,
      negativeMarking,
      negativeMarkValue: negativeMarking ? 0.25 : 0,
      passPercentage,
      questions,
      status: 'Published',
      createdAt: new Date().toISOString(),
    };

    result.items.push({
      rawIndex: idx,
      item: test,
      status,
      errors: itemErrors,
      warnings: itemWarnings,
      isDuplicate,
      duplicateReason,
      matchedExistingId,
      hierarchy,
    });

    if (status === 'valid') result.validCount++;
    else if (status === 'warning') result.warningCount++;
    else if (status === 'error') result.errorCount++;
    else if (status === 'duplicate') result.duplicateCount++;
  });

  result.success = result.validCount + result.warningCount + (duplicateStrategy !== 'skip' ? result.duplicateCount : 0) > 0;
  return result;
}

/**
 * Parses and validates Study Notes with educational hierarchy
 */
export function parseHierarchicalStudyNotes(
  rawText: string,
  format: 'json' | 'csv',
  scope: EducationalScope,
  mode: ImportMode,
  overridePolicy: ScopeOverridePolicy,
  duplicateStrategy: DuplicateStrategy,
  existingNotes: StudyNote[] = []
): HierarchicalParseResult<StudyNote> {
  const result: HierarchicalParseResult<StudyNote> = {
    success: false,
    items: [],
    totalParsed: 0,
    validCount: 0,
    warningCount: 0,
    errorCount: 0,
    duplicateCount: 0,
    globalErrors: [],
  };

  if (!rawText.trim()) {
    result.globalErrors.push('No study note data provided.');
    return result;
  }

  const existingMap = new Map<string, StudyNote>();
  existingNotes.forEach((n) => {
    const key = `${normalizeTextForDuplicateCheck(n.title)}__${(n.subject || '').toLowerCase()}__${(n.chapter || '').toLowerCase()}`;
    existingMap.set(key, n);
  });

  let rawList: any[] = [];
  if (format === 'json') {
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) rawList = parsed;
      else if (parsed.studyNotes) rawList = parsed.studyNotes;
      else if (parsed.notes) rawList = parsed.notes;
      else {
        result.globalErrors.push('JSON must be an array of notes or contain "studyNotes" array.');
        return result;
      }
    } catch (e: any) {
      result.globalErrors.push(`JSON Syntax Error: ${e.message}`);
      return result;
    }
  } else {
    const rows = parseCSVToRows(rawText);
    if (rows.length < 2) {
      result.globalErrors.push('CSV must have header row and at least 1 data row.');
      return result;
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const tIdx = headers.findIndex((h) => h.includes('title') || h.includes('name'));
    const sIdx = headers.findIndex((h) => h.includes('subject'));
    const cIdx = headers.findIndex((h) => h.includes('class'));
    const chIdx = headers.findIndex((h) => h.includes('chapter'));
    const typeIdx = headers.findIndex((h) => h.includes('type'));
    const snipIdx = headers.findIndex((h) => h.includes('snippet') || h.includes('summary') || h.includes('desc'));
    const fullIdx = headers.findIndex((h) => h.includes('content') || h.includes('full'));
    const timeIdx = headers.findIndex((h) => h.includes('time'));

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.some((c) => c.trim())) continue;

      rawList.push({
        title: tIdx !== -1 ? row[tIdx] : row[0],
        subject: sIdx !== -1 ? row[sIdx] : undefined,
        classLevel: cIdx !== -1 ? row[cIdx] : undefined,
        chapter: chIdx !== -1 ? row[chIdx] : undefined,
        type: typeIdx !== -1 ? row[typeIdx] : undefined,
        contentSnippet: snipIdx !== -1 ? row[snipIdx] : undefined,
        fullContent: fullIdx !== -1 ? row[fullIdx] : undefined,
        readTime: timeIdx !== -1 ? row[timeIdx] : undefined,
      });
    }
  }

  result.totalParsed = rawList.length;

  rawList.forEach((raw, idx) => {
    const itemErrors: string[] = [];
    const itemWarnings: string[] = [];

    const hierarchy = resolveItemHierarchy(raw, scope, mode, overridePolicy);

    let title = String(raw.title || '').trim();
    if (!title) {
      title = `${hierarchy.subject} ${hierarchy.chapter} Revision Notes`;
      itemWarnings.push(`Missing title: auto-generated "${title}".`);
    }

    const contentSnippet = raw.contentSnippet || raw.description || 'High-yield textbook revision guide covering core curriculum principles.';

    // Duplicate Check
    const normalizedKey = `${normalizeTextForDuplicateCheck(title)}__${hierarchy.subject.toLowerCase()}__${hierarchy.chapter.toLowerCase()}`;
    let isDuplicate = false;
    let duplicateReason: string | undefined;
    let matchedExistingId: string | undefined;

    if (existingMap.has(normalizedKey)) {
      isDuplicate = true;
      const matched = existingMap.get(normalizedKey)!;
      matchedExistingId = matched.id;
      duplicateReason = `Matches existing study note: "${matched.title}"`;
    }

    let status: ValidationStatus = 'valid';
    if (itemErrors.length > 0) status = 'error';
    else if (isDuplicate) status = 'duplicate';
    else if (itemWarnings.length > 0) status = 'warning';

    let finalId = raw.id;
    if (!finalId || (isDuplicate && duplicateStrategy === 'create_new')) {
      finalId = generateSmartId('note', hierarchy, idx);
    } else if (isDuplicate && duplicateStrategy === 'update' && matchedExistingId) {
      finalId = matchedExistingId;
    }

    const note: StudyNote = {
      id: finalId,
      title,
      board: hierarchy.board,
      subject: hierarchy.subject,
      classLevel: hierarchy.classLevel,
      chapter: hierarchy.chapter,
      topic: hierarchy.topic,
      type: raw.type || 'Notes',
      contentSnippet,
      fullContent: raw.fullContent || undefined,
      readTime: raw.readTime || '8 mins',
      downloadsCount: typeof raw.downloadsCount === 'number' ? raw.downloadsCount : 0,
      status: 'Published',
      createdAt: new Date().toISOString(),
    };

    result.items.push({
      rawIndex: idx,
      item: note,
      status,
      errors: itemErrors,
      warnings: itemWarnings,
      isDuplicate,
      duplicateReason,
      matchedExistingId,
      hierarchy,
    });

    if (status === 'valid') result.validCount++;
    else if (status === 'warning') result.warningCount++;
    else if (status === 'error') result.errorCount++;
    else if (status === 'duplicate') result.duplicateCount++;
  });

  result.success = result.validCount + result.warningCount + (duplicateStrategy !== 'skip' ? result.duplicateCount : 0) > 0;
  return result;
}

/**
 * Parses Complete Academic Bundle with hierarchical awareness
 */
export function parseHierarchicalBundle(
  rawJson: string,
  scope: EducationalScope,
  mode: ImportMode,
  overridePolicy: ScopeOverridePolicy,
  duplicateStrategy: DuplicateStrategy,
  existingData: {
    mcqs: MCQ[];
    tests: TestConfig[];
    pastPapers: PastPaper[];
    studyNotes: StudyNote[];
  }
): HierarchicalParseResult<any> {
  const result: HierarchicalParseResult<any> = {
    success: false,
    items: [],
    totalParsed: 0,
    validCount: 0,
    warningCount: 0,
    errorCount: 0,
    duplicateCount: 0,
    globalErrors: [],
    bundleResult: {
      mcqs: [],
      tests: [],
      pastPapers: [],
      studyNotes: [],
    },
  };

  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') {
      result.globalErrors.push('Bundle JSON must be a valid object containing data arrays.');
      return result;
    }

    if (parsed.mcqs && Array.isArray(parsed.mcqs)) {
      const mcqRes = parseHierarchicalMCQs(
        JSON.stringify(parsed.mcqs),
        'json',
        scope,
        mode,
        overridePolicy,
        duplicateStrategy,
        existingData.mcqs
      );
      result.bundleResult!.mcqs = mcqRes.items;
      result.items.push(...mcqRes.items.map((it) => ({ ...it, item: { ...it.item, _type: 'MCQ' } })));
      result.totalParsed += mcqRes.totalParsed;
      result.validCount += mcqRes.validCount;
      result.warningCount += mcqRes.warningCount;
      result.errorCount += mcqRes.errorCount;
      result.duplicateCount += mcqRes.duplicateCount;
    }

    if (parsed.tests && Array.isArray(parsed.tests)) {
      const testRes = parseHierarchicalTests(
        JSON.stringify(parsed.tests),
        'json',
        scope,
        mode,
        overridePolicy,
        duplicateStrategy,
        existingData.tests,
        existingData.mcqs
      );
      result.bundleResult!.tests = testRes.items;
      result.items.push(...testRes.items.map((it) => ({ ...it, item: { ...it.item, _type: 'Test' } })));
      result.totalParsed += testRes.totalParsed;
      result.validCount += testRes.validCount;
      result.warningCount += testRes.warningCount;
      result.errorCount += testRes.errorCount;
      result.duplicateCount += testRes.duplicateCount;
    }

    if ((parsed.pastPapers || parsed.exams) && Array.isArray(parsed.pastPapers || parsed.exams)) {
      const ppRes = parseHierarchicalPastPapers(
        JSON.stringify(parsed.pastPapers || parsed.exams),
        'json',
        scope,
        mode,
        overridePolicy,
        duplicateStrategy,
        existingData.pastPapers
      );
      result.bundleResult!.pastPapers = ppRes.items;
      result.items.push(...ppRes.items.map((it) => ({ ...it, item: { ...it.item, _type: 'Past Paper' } })));
      result.totalParsed += ppRes.totalParsed;
      result.validCount += ppRes.validCount;
      result.warningCount += ppRes.warningCount;
      result.errorCount += ppRes.errorCount;
      result.duplicateCount += ppRes.duplicateCount;
    }

    if ((parsed.studyNotes || parsed.notes) && Array.isArray(parsed.studyNotes || parsed.notes)) {
      const noteRes = parseHierarchicalStudyNotes(
        JSON.stringify(parsed.studyNotes || parsed.notes),
        'json',
        scope,
        mode,
        overridePolicy,
        duplicateStrategy,
        existingData.studyNotes
      );
      result.bundleResult!.studyNotes = noteRes.items;
      result.items.push(...noteRes.items.map((it) => ({ ...it, item: { ...it.item, _type: 'Note' } })));
      result.totalParsed += noteRes.totalParsed;
      result.validCount += noteRes.validCount;
      result.warningCount += noteRes.warningCount;
      result.errorCount += noteRes.errorCount;
      result.duplicateCount += noteRes.duplicateCount;
    }

    result.success = result.validCount + result.warningCount > 0;
    if (result.totalParsed === 0) {
      result.globalErrors.push('No recognized collections (mcqs, tests, pastPapers, studyNotes) found in the bundle.');
    }
  } catch (e: any) {
    result.globalErrors.push(`JSON Syntax Error: ${e.message}`);
  }

  return result;
}

/**
 * Generates dynamic template tailored to the user's selected Educational Scope
 */
export function generateDynamicTemplate(
  scope: EducationalScope,
  format: 'json' | 'csv' | 'tsv'
): string {
  const b = scope.board;
  const c = scope.classLevel;
  const s = scope.subject;
  const ch = scope.chapter && scope.chapter !== 'auto-detect' ? scope.chapter : `${s} Chapter 1: Introduction & Fundamentals`;
  const t = scope.topic && scope.topic !== 'auto-detect' ? scope.topic : 'Core Principles';
  const yr = scope.academicYear;
  const isUrdu = scope.medium === 'Urdu';

  if (scope.dataType === 'mcqs') {
    if (format === 'json') {
      return JSON.stringify(
        [
          {
            question: isUrdu
              ? `مندرجہ ذیل میں سے کون سا بنیادی قانون ${s} میں سب سے زیادہ اہمیت کا حامل ہے؟`
              : `Which of the following is the fundamental governing principle of ${s}?`,
            options: isUrdu
              ? ['قانون بقائے توانائی', 'قانون تجاذب', 'قانون حرکت', 'پہلا کلیہ']
              : ['Law of Conservation of Energy', 'Law of Universal Gravitation', 'First Law of Motion', 'Third Law of Thermodynamics'],
            correctAnswer: 0,
            explanation: isUrdu
              ? `یہ قانون ${s} کے نصاب کے مطابق کائنات کے تمام مظاہر پر لاگو ہوتا ہے۔`
              : `The Law of Conservation of Energy states that energy can neither be created nor destroyed, only converted.`,
            difficulty: 'Easy',
            subject: s,
            classLevel: c,
            board: b,
            chapter: ch,
            topic: t,
            year: yr,
            tags: [s.toLowerCase(), 'board-exam', 'high-yield'],
          },
          {
            question: isUrdu
              ? `${s} کے باب "${ch}" میں بیان کردہ عددی مقدار کی SI اکائی کیا ہے؟`
              : `What is the standard SI unit of the primary physical quantity discussed in "${ch}"?`,
            options: ['Joule (J)', 'Watt (W)', 'Newton (N)', 'Pascal (Pa)'],
            correctAnswer: 2,
            explanation: `According to the standard textbook curriculum for ${c} (${b}), the SI base unit is Newton (N).`,
            difficulty: 'Medium',
            subject: s,
            classLevel: c,
            board: b,
            chapter: ch,
            topic: t,
            year: yr,
            tags: [s.toLowerCase(), 'si-units'],
          },
          {
            question: isUrdu
              ? `سالانہ امتحان ${yr} کے لیے ${s} کا یہ اہم ترین کثیر الانتخابی سوال ہے:`
              : `Which characteristic distinguishing feature is highlighted in ${b} past examination papers for ${s}?`,
            options: ['Option Alpha', 'Option Beta', 'Option Gamma', 'Option Delta'],
            correctAnswer: 1,
            explanation: 'Detailed step-by-step textbook rationale and board marking key justification.',
            difficulty: 'Hard',
            subject: s,
            classLevel: c,
            board: b,
            chapter: ch,
            topic: t,
            year: yr,
            tags: [s.toLowerCase(), 'model-paper'],
          },
        ],
        null,
        2
      );
    } else {
      const sep = format === 'tsv' ? '\t' : ',';
      const q = (val: string) => (format === 'tsv' ? val : `"${val.replace(/"/g, '""')}"`);

      const headers = [
        'Question',
        'Option A',
        'Option B',
        'Option C',
        'Option D',
        'Correct Answer',
        'Difficulty',
        'Subject',
        'Class Level',
        'Board',
        'Chapter',
        'Topic',
        'Year',
        'Explanation',
      ].join(sep);

      const row1 = [
        q(`What is the fundamental governing principle of ${s} in ${ch}?`),
        q('Law of Conservation of Energy'),
        q('Law of Universal Gravitation'),
        q('First Law of Motion'),
        q('Thermodynamic Equilibrium'),
        q('A'),
        q('Easy'),
        q(s),
        q(c),
        q(b),
        q(ch),
        q(t),
        q(String(yr)),
        q(`Core concept from ${c} ${b} textbook.`),
      ].join(sep);

      const row2 = [
        q(`Which of the following is standard practice in ${s} (${c})?`),
        q('Standard Procedure Alpha'),
        q('Verified Methodology Beta'),
        q('Empirical Rule Gamma'),
        q('Alternative Model Delta'),
        q('B'),
        q('Medium'),
        q(s),
        q(c),
        q(b),
        q(ch),
        q(t),
        q(String(yr)),
        q('Standard textbook rationale and board solution key.'),
      ].join(sep);

      return `${headers}\n${row1}\n${row2}`;
    }
  }

  if (scope.dataType === 'past-papers') {
    if (format === 'json') {
      return JSON.stringify(
        [
          {
            title: `${b} ${c} ${s} Annual Examination ${yr} (Group 1)`,
            board: b,
            province: scope.province === 'All Pakistan' ? 'Punjab' : scope.province,
            classLevel: c,
            subject: s,
            chapter: ch,
            year: yr,
            paperGroup: 'Group 1',
            type: 'Objective (MCQs)',
            questionsCount: 12,
          },
          {
            title: `${b} ${c} ${s} Annual Examination ${yr} (Group 2)`,
            board: b,
            province: scope.province === 'All Pakistan' ? 'Punjab' : scope.province,
            classLevel: c,
            subject: s,
            chapter: ch,
            year: yr,
            paperGroup: 'Group 2',
            type: 'Objective (MCQs)',
            questionsCount: 12,
          },
        ],
        null,
        2
      );
    } else {
      const sep = format === 'tsv' ? '\t' : ',';
      const q = (val: string) => (format === 'tsv' ? val : `"${val.replace(/"/g, '""')}"`);

      const headers = ['Title', 'Board', 'Class Level', 'Subject', 'Year', 'Group', 'Type', 'Questions Count'].join(sep);
      const row1 = [
        q(`${b} ${c} ${s} Annual Examination ${yr} (Group 1)`),
        q(b),
        q(c),
        q(s),
        q(String(yr)),
        q('Group 1'),
        q('Objective (MCQs)'),
        q('12'),
      ].join(sep);

      return `${headers}\n${row1}`;
    }
  }

  if (scope.dataType === 'tests') {
    if (format === 'json') {
      return JSON.stringify(
        [
          {
            title: `${c} ${s} - ${ch} Grand Assessment`,
            description: `Official practice test for ${s} covering ${ch} designed according to ${b} standards.`,
            testType: 'Chapter Test',
            category: c.includes('Matric') ? 'Matric' : 'Inter',
            subject: s,
            classLevel: c,
            board: b,
            chapter: ch,
            durationMinutes: 20,
            passPercentage: 50,
            negativeMarking: false,
          },
        ],
        null,
        2
      );
    } else {
      const sep = format === 'tsv' ? '\t' : ',';
      const q = (val: string) => (format === 'tsv' ? val : `"${val.replace(/"/g, '""')}"`);

      const headers = ['Title', 'Subject', 'Class Level', 'Board', 'Chapter', 'Duration (Mins)', 'Pass Percentage', 'Negative Marking'].join(sep);
      const row1 = [
        q(`${c} ${s} - ${ch} Grand Assessment`),
        q(s),
        q(c),
        q(b),
        q(ch),
        q('20'),
        q('50'),
        q('false'),
      ].join(sep);

      return `${headers}\n${row1}`;
    }
  }

  if (scope.dataType === 'study-notes') {
    if (format === 'json') {
      return JSON.stringify(
        [
          {
            title: `${c} ${s} ${ch}: Comprehensive High-Yield Revision Notes`,
            subject: s,
            classLevel: c,
            board: b,
            chapter: ch,
            topic: t,
            type: 'Notes',
            readTime: '15 mins',
            contentSnippet: `High-yield summary of key definitions, solved examples, and exam formulas for ${ch}.`,
            fullContent: `# ${s} - ${ch}\n\n## 1. Key Definitions\n- Core definition and mathematical expressions.\n- Governing laws for ${b} exams.\n\n## 2. Summary Points\n- Essential revision notes.`,
          },
        ],
        null,
        2
      );
    } else {
      const sep = format === 'tsv' ? '\t' : ',';
      const q = (val: string) => (format === 'tsv' ? val : `"${val.replace(/"/g, '""')}"`);

      const headers = ['Title', 'Subject', 'Class Level', 'Board', 'Chapter', 'Type', 'Read Time', 'Content Snippet'].join(sep);
      const row1 = [
        q(`${c} ${s} ${ch}: Comprehensive High-Yield Revision Notes`),
        q(s),
        q(c),
        q(b),
        q(ch),
        q('Notes'),
        q('15 mins'),
        q(`High-yield summary of key definitions and formulas for ${ch}.`),
      ].join(sep);

      return `${headers}\n${row1}`;
    }
  }

  // Bundle template
  return JSON.stringify(
    {
      mcqs: [
        {
          question: `Sample question for ${s} - ${ch}`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'Official textbook solution.',
          subject: s,
          classLevel: c,
          board: b,
          chapter: ch,
          year: yr,
        },
      ],
      tests: [
        {
          title: `${c} ${s} Assessment`,
          subject: s,
          classLevel: c,
          board: b,
          durationMinutes: 15,
        },
      ],
      pastPapers: [
        {
          title: `${b} ${c} ${s} Annual ${yr}`,
          board: b,
          classLevel: c,
          subject: s,
          year: yr,
          questionsCount: 12,
        },
      ],
      studyNotes: [
        {
          title: `${c} ${s} ${ch} Study Notes`,
          subject: s,
          classLevel: c,
          chapter: ch,
          contentSnippet: `Summary of ${ch}`,
        },
      ],
    },
    null,
    2
  );
}

/**
 * Exports failed rows / error log for downloading
 */
export function exportFailedRowsLog(
  failedItems: ParsedItemWrapper[],
  format: 'json' | 'csv' = 'csv'
): string {
  if (format === 'json') {
    return JSON.stringify(
      failedItems.map((item) => ({
        originalRow: item.rawIndex + 1,
        status: item.status,
        errors: item.errors,
        warnings: item.warnings,
        data: item.item,
      })),
      null,
      2
    );
  } else {
    const headers = ['Row Number', 'Status', 'Errors', 'Item Summary'];
    const rows = failedItems.map((f) => {
      const summary = f.item.question || f.item.title || JSON.stringify(f.item).substring(0, 80);
      return [
        String(f.rawIndex + 1),
        `"${f.status}"`,
        `"${f.errors.join('; ').replace(/"/g, '""')}"`,
        `"${String(summary).replace(/"/g, '""')}"`,
      ].join(',');
    });
    return `${headers.join(',')}\n${rows.join('\n')}`;
  }
}
