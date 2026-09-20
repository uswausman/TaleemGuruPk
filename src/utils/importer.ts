import { MCQ, PastPaper, StudyNote, TestConfig, Difficulty, TestType } from '../types';

/**
 * Robust CSV/TSV parser supporting quotes, commas, newlines, tabs
 */
export function parseCSVToRows(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, '').trim(); // Remove BOM
  if (!cleanText) return [];

  // Detect delimiter: tab or comma or semicolon
  const firstLine = cleanText.split(/\r?\n/)[0] || '';
  let delimiter = ',';
  if (firstLine.includes('\t') && (firstLine.match(/\t/g)?.length || 0) >= (firstLine.match(/,/g)?.length || 0)) {
    delimiter = '\t';
  } else if (firstLine.includes(';') && (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0)) {
    delimiter = ';';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote: "" -> "
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip newline after carriage return
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  totalParsed: number;
  errors: string[];
  warnings: string[];
}

/**
 * Parses MCQs from JSON or CSV
 */
export function parseMCQsData(raw: string, format: 'json' | 'csv'): ParseResult<MCQ> {
  const result: ParseResult<MCQ> = {
    success: false,
    data: [],
    totalParsed: 0,
    errors: [],
    warnings: [],
  };

  if (!raw.trim()) {
    result.errors.push('No data provided to import.');
    return result;
  }

  if (format === 'json') {
    try {
      const parsed = JSON.parse(raw);
      let items: any[] = [];

      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.mcqs)) items = parsed.mcqs;
        else if (Array.isArray(parsed.questions)) items = parsed.questions;
        else if (Array.isArray(parsed.data)) items = parsed.data;
        else {
          result.errors.push('JSON must be an array of MCQs or an object with an "mcqs" array.');
          return result;
        }
      }

      items.forEach((item, idx) => {
        if (!item || typeof item !== 'object') {
          result.warnings.push(`Item #${idx + 1} was skipped (not an object).`);
          return;
        }

        const question = String(item.question || item.statement || item.q || '').trim();
        if (!question) {
          result.warnings.push(`Item #${idx + 1} skipped: Missing question statement.`);
          return;
        }

        let options: string[] = [];
        if (Array.isArray(item.options)) {
          options = item.options.map((o: any) => String(o).trim()).filter(Boolean);
        } else if (item.optionA && item.optionB) {
          options = [
            String(item.optionA).trim(),
            String(item.optionB).trim(),
            String(item.optionC || '').trim(),
            String(item.optionD || '').trim(),
          ].filter(Boolean);
        }

        if (options.length < 2) {
          result.warnings.push(`Item #${idx + 1} ("${question.substring(0, 30)}..."): Has fewer than 2 options.`);
          return;
        }

        // Fill up to 4 options if 2 or 3 provided
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }

        let correctAnswer = 0;
        if (typeof item.correctAnswer === 'number') {
          correctAnswer = item.correctAnswer >= 0 && item.correctAnswer < options.length ? item.correctAnswer : 0;
        } else if (typeof item.correctAnswer === 'string' || typeof item.answer === 'string') {
          const ansStr = String(item.correctAnswer || item.answer).trim();
          const letter = ansStr.toUpperCase();
          if (letter === 'A' || letter === '1') correctAnswer = 0;
          else if (letter === 'B' || letter === '2') correctAnswer = 1;
          else if (letter === 'C' || letter === '3') correctAnswer = 2;
          else if (letter === 'D' || letter === '4') correctAnswer = 3;
          else {
            const matchedIdx = options.findIndex((opt) => opt.toLowerCase() === ansStr.toLowerCase());
            if (matchedIdx >= 0) correctAnswer = matchedIdx;
          }
        }

        let difficulty: Difficulty = 'Medium';
        const rawDiff = String(item.difficulty || '').toLowerCase();
        if (rawDiff.includes('easy')) difficulty = 'Easy';
        else if (rawDiff.includes('hard')) difficulty = 'Hard';

        const mcq: MCQ = {
          id: item.id || `mcq-bulk-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          question,
          options: options.slice(0, 4),
          correctAnswer,
          explanation: item.explanation || item.reason || 'Verified textbook solution and rationale.',
          subject: item.subject || 'Physics',
          chapter: item.chapter || 'General Chapter',
          topic: item.topic || undefined,
          difficulty,
          classLevel: item.classLevel || 'Class 10 (Matric Pt 2)',
          board: item.board || 'BISE Lahore',
          exam: item.exam || undefined,
          year: typeof item.year === 'number' ? item.year : 2024,
          tags: Array.isArray(item.tags)
            ? item.tags
            : (item.subject ? [String(item.subject).toLowerCase(), 'imported'] : ['imported']),
          language: item.language === 'Urdu' ? 'Urdu' : 'English',
        };

        result.data.push(mcq);
      });

      result.totalParsed = result.data.length;
      result.success = result.data.length > 0;
      if (result.data.length === 0 && result.errors.length === 0) {
        result.errors.push('No valid MCQ records found in JSON.');
      }
      return result;
    } catch (err: any) {
      result.errors.push(`JSON Syntax Error: ${err.message}`);
      return result;
    }
  } else {
    // CSV / TSV Parsing
    const rows = parseCSVToRows(raw);
    if (rows.length < 2) {
      result.errors.push('CSV file must have at least 1 header row and 1 data row.');
      return result;
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Find column indexes
    const qIdx = headers.findIndex((h) => h.includes('question') || h.includes('statement') || h === 'q');
    const aIdx = headers.findIndex((h) => h.includes('optiona') || h.includes('opt1') || h === 'a' || h === 'opta');
    const bIdx = headers.findIndex((h) => h.includes('optionb') || h.includes('opt2') || h === 'b' || h === 'optb');
    const cIdx = headers.findIndex((h) => h.includes('optionc') || h.includes('opt3') || h === 'c' || h === 'optc');
    const dIdx = headers.findIndex((h) => h.includes('optiond') || h.includes('opt4') || h === 'd' || h === 'optd');
    const ansIdx = headers.findIndex(
      (h) => h.includes('correct') || h.includes('answer') || h.includes('ans') || h === 'key'
    );
    const subIdx = headers.findIndex((h) => h.includes('subject') || h === 'sub');
    const classIdx = headers.findIndex((h) => h.includes('class') || h.includes('grade'));
    const boardIdx = headers.findIndex((h) => h.includes('board'));
    const diffIdx = headers.findIndex((h) => h.includes('diff'));
    const expIdx = headers.findIndex((h) => h.includes('explain') || h.includes('reason') || h.includes('solution'));
    const chapIdx = headers.findIndex((h) => h.includes('chap'));

    if (qIdx === -1) {
      result.errors.push('Could not find a "Question" or "Statement" column header in the CSV.');
      return result;
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length <= 1 || !row.some((cell) => cell.trim().length > 0)) continue;

      const question = row[qIdx] || '';
      if (!question.trim()) {
        result.warnings.push(`Row ${i + 1} skipped: empty question text.`);
        continue;
      }

      // Build options
      let options: string[] = [];
      if (aIdx !== -1 && bIdx !== -1) {
        options = [
          row[aIdx] || 'Option A',
          row[bIdx] || 'Option B',
          cIdx !== -1 ? row[cIdx] || 'Option C' : 'Option C',
          dIdx !== -1 ? row[dIdx] || 'Option D' : 'Option D',
        ];
      } else {
        // Fallback: take next 4 non-empty columns after question
        options = row.slice(1, 5).filter(Boolean);
        while (options.length < 4) options.push(`Option ${options.length + 1}`);
      }

      // Answer index
      let correctAnswer = 0;
      if (ansIdx !== -1 && row[ansIdx]) {
        const val = row[ansIdx].trim().toUpperCase();
        if (val === 'A' || val === '1' || val === 'OPT1') correctAnswer = 0;
        else if (val === 'B' || val === '2' || val === 'OPT2') correctAnswer = 1;
        else if (val === 'C' || val === '3' || val === 'OPT3') correctAnswer = 2;
        else if (val === 'D' || val === '4' || val === 'OPT4') correctAnswer = 3;
        else {
          const matched = options.findIndex((o) => o.toLowerCase() === val.toLowerCase());
          if (matched >= 0) correctAnswer = matched;
        }
      }

      let difficulty: Difficulty = 'Medium';
      if (diffIdx !== -1 && row[diffIdx]) {
        const diffVal = row[diffIdx].toLowerCase();
        if (diffVal.includes('easy')) difficulty = 'Easy';
        else if (diffVal.includes('hard')) difficulty = 'Hard';
      }

      const mcq: MCQ = {
        id: `mcq-bulk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        question,
        options,
        correctAnswer,
        explanation: expIdx !== -1 && row[expIdx] ? row[expIdx] : 'Verified textbook solution and rationale.',
        subject: subIdx !== -1 && row[subIdx] ? row[subIdx] : 'Physics',
        chapter: chapIdx !== -1 && row[chapIdx] ? row[chapIdx] : 'General Chapter',
        classLevel: classIdx !== -1 && row[classIdx] ? row[classIdx] : 'Class 10 (Matric Pt 2)',
        board: boardIdx !== -1 && row[boardIdx] ? row[boardIdx] : 'BISE Lahore',
        difficulty,
        tags: [subIdx !== -1 && row[subIdx] ? row[subIdx].toLowerCase() : 'physics', 'imported-csv'],
      };

      result.data.push(mcq);
    }

    result.totalParsed = result.data.length;
    result.success = result.data.length > 0;
    if (result.data.length === 0 && result.errors.length === 0) {
      result.errors.push('No valid MCQ rows could be extracted from CSV.');
    }
    return result;
  }
}

/**
 * Parses Past Papers from JSON or CSV
 */
export function parsePastPapersData(raw: string, format: 'json' | 'csv'): ParseResult<PastPaper> {
  const result: ParseResult<PastPaper> = {
    success: false,
    data: [],
    totalParsed: 0,
    errors: [],
    warnings: [],
  };

  if (!raw.trim()) {
    result.errors.push('No past paper data provided to import.');
    return result;
  }

  if (format === 'json') {
    try {
      const parsed = JSON.parse(raw);
      let items: any[] = [];
      if (Array.isArray(parsed)) items = parsed;
      else if (parsed.pastPapers && Array.isArray(parsed.pastPapers)) items = parsed.pastPapers;
      else if (parsed.exams && Array.isArray(parsed.exams)) items = parsed.exams;

      items.forEach((item, idx) => {
        if (!item.title) {
          result.warnings.push(`Past paper #${idx + 1} skipped: missing title.`);
          return;
        }

        const paper: PastPaper = {
          id: item.id || `pp-import-${Date.now()}-${idx}`,
          title: item.title,
          board: item.board || 'BISE Lahore',
          province: item.province || 'Punjab',
          classLevel: item.classLevel || 'Class 10 (Matric Pt 2)',
          subject: item.subject || 'Physics',
          year: typeof item.year === 'number' ? item.year : parseInt(item.year) || 2024,
          paperGroup: item.paperGroup || 'Group 1',
          type: item.type || 'Objective (MCQs)',
          questionsCount: typeof item.questionsCount === 'number' ? item.questionsCount : 12,
          questions: Array.isArray(item.questions) ? item.questions : undefined,
        };
        result.data.push(paper);
      });

      result.totalParsed = result.data.length;
      result.success = result.data.length > 0;
      return result;
    } catch (e: any) {
      result.errors.push(`JSON Syntax Error: ${e.message}`);
      return result;
    }
  } else {
    const rows = parseCSVToRows(raw);
    if (rows.length < 2) {
      result.errors.push('CSV must have header row and at least 1 data row.');
      return result;
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const tIdx = headers.findIndex((h) => h.includes('title') || h.includes('name'));
    const bIdx = headers.findIndex((h) => h.includes('board'));
    const pIdx = headers.findIndex((h) => h.includes('province'));
    const cIdx = headers.findIndex((h) => h.includes('class') || h.includes('level'));
    const sIdx = headers.findIndex((h) => h.includes('subject'));
    const yIdx = headers.findIndex((h) => h.includes('year'));
    const gIdx = headers.findIndex((h) => h.includes('group'));
    const typeIdx = headers.findIndex((h) => h.includes('type'));
    const countIdx = headers.findIndex((h) => h.includes('count') || h.includes('questions'));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[tIdx || 0]) continue;

      const title = row[tIdx !== -1 ? tIdx : 0];
      const paper: PastPaper = {
        id: `pp-import-${Date.now()}-${i}`,
        title,
        board: bIdx !== -1 && row[bIdx] ? row[bIdx] : 'BISE Lahore',
        province: pIdx !== -1 && row[pIdx] ? row[pIdx] : 'Punjab',
        classLevel: cIdx !== -1 && row[cIdx] ? row[cIdx] : 'Class 10 (Matric Pt 2)',
        subject: sIdx !== -1 && row[sIdx] ? row[sIdx] : 'Physics',
        year: yIdx !== -1 ? parseInt(row[yIdx]) || 2024 : 2024,
        paperGroup: (gIdx !== -1 && row[gIdx] ? row[gIdx] : 'Group 1') as any,
        type: (typeIdx !== -1 && row[typeIdx] ? row[typeIdx] : 'Objective (MCQs)') as any,
        questionsCount: countIdx !== -1 ? parseInt(row[countIdx]) || 12 : 12,
      };
      result.data.push(paper);
    }

    result.totalParsed = result.data.length;
    result.success = result.data.length > 0;
    return result;
  }
}

/**
 * Parses Tests from JSON or CSV
 */
export function parseTestsData(
  raw: string,
  format: 'json' | 'csv',
  availableMCQs: MCQ[] = []
): ParseResult<TestConfig> {
  const result: ParseResult<TestConfig> = {
    success: false,
    data: [],
    totalParsed: 0,
    errors: [],
    warnings: [],
  };

  if (!raw.trim()) {
    result.errors.push('No test data provided to import.');
    return result;
  }

  if (format === 'json') {
    try {
      const parsed = JSON.parse(raw);
      let items: any[] = [];
      if (Array.isArray(parsed)) items = parsed;
      else if (parsed.tests && Array.isArray(parsed.tests)) items = parsed.tests;

      items.forEach((item, idx) => {
        if (!item.title) {
          result.warnings.push(`Test #${idx + 1} skipped: missing title.`);
          return;
        }

        const subject = item.subject || 'Physics';
        const testQuestions =
          Array.isArray(item.questions) && item.questions.length > 0
            ? item.questions
            : availableMCQs.filter((m) => m.subject.toLowerCase() === subject.toLowerCase()).slice(0, 10);

        const test: TestConfig = {
          id: item.id || `test-bulk-${Date.now()}-${idx}`,
          title: item.title,
          description: item.description || `Assessment for ${subject}`,
          testType: item.testType || 'Chapter Test',
          category: item.category || 'Matric',
          subject,
          classLevel: item.classLevel || 'Class 10 (Matric Pt 2)',
          board: item.board || 'BISE Lahore',
          exam: item.exam || undefined,
          durationMinutes: typeof item.durationMinutes === 'number' ? item.durationMinutes : 15,
          totalQuestions: testQuestions.length || item.totalQuestions || 10,
          totalMarks: testQuestions.length || item.totalMarks || 10,
          negativeMarking: Boolean(item.negativeMarking),
          negativeMarkValue: item.negativeMarkValue || 0.25,
          passPercentage: item.passPercentage || 50,
          questions: testQuestions,
        };
        result.data.push(test);
      });

      result.totalParsed = result.data.length;
      result.success = result.data.length > 0;
      return result;
    } catch (e: any) {
      result.errors.push(`JSON Syntax Error: ${e.message}`);
      return result;
    }
  } else {
    const rows = parseCSVToRows(raw);
    if (rows.length < 2) {
      result.errors.push('CSV must have header row and at least 1 data row.');
      return result;
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const tIdx = headers.findIndex((h) => h.includes('title') || h.includes('name'));
    const sIdx = headers.findIndex((h) => h.includes('subject'));
    const catIdx = headers.findIndex((h) => h.includes('category') || h.includes('cat'));
    const typeIdx = headers.findIndex((h) => h.includes('type'));
    const cIdx = headers.findIndex((h) => h.includes('class'));
    const bIdx = headers.findIndex((h) => h.includes('board'));
    const durIdx = headers.findIndex((h) => h.includes('duration') || h.includes('time'));
    const passIdx = headers.findIndex((h) => h.includes('pass'));
    const negIdx = headers.findIndex((h) => h.includes('negative'));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[tIdx || 0]) continue;

      const title = row[tIdx !== -1 ? tIdx : 0];
      const subject = sIdx !== -1 && row[sIdx] ? row[sIdx] : 'Physics';
      const relevantMCQs = availableMCQs
        .filter((m) => m.subject.toLowerCase() === subject.toLowerCase())
        .slice(0, 10);

      const test: TestConfig = {
        id: `test-bulk-${Date.now()}-${i}`,
        title,
        description: `Official practice test for ${subject}`,
        category: catIdx !== -1 && row[catIdx] ? row[catIdx] : 'Matric',
        testType: (typeIdx !== -1 && row[typeIdx] ? row[typeIdx] : 'Chapter Test') as TestType,
        subject,
        classLevel: cIdx !== -1 && row[cIdx] ? row[cIdx] : 'Class 10 (Matric Pt 2)',
        board: bIdx !== -1 && row[bIdx] ? row[bIdx] : 'BISE Lahore',
        durationMinutes: durIdx !== -1 ? parseInt(row[durIdx]) || 15 : 15,
        totalQuestions: relevantMCQs.length || 10,
        totalMarks: relevantMCQs.length || 10,
        negativeMarking: negIdx !== -1 ? row[negIdx].toLowerCase().includes('true') || row[negIdx] === '1' : false,
        passPercentage: passIdx !== -1 ? parseInt(row[passIdx]) || 50 : 50,
        questions: relevantMCQs.length > 0 ? relevantMCQs : availableMCQs.slice(0, 10),
      };
      result.data.push(test);
    }

    result.totalParsed = result.data.length;
    result.success = result.data.length > 0;
    return result;
  }
}

/**
 * Parses Study Notes from JSON or CSV
 */
export function parseStudyNotesData(raw: string, format: 'json' | 'csv'): ParseResult<StudyNote> {
  const result: ParseResult<StudyNote> = {
    success: false,
    data: [],
    totalParsed: 0,
    errors: [],
    warnings: [],
  };

  if (!raw.trim()) {
    result.errors.push('No study note data provided to import.');
    return result;
  }

  if (format === 'json') {
    try {
      const parsed = JSON.parse(raw);
      let items: any[] = [];
      if (Array.isArray(parsed)) items = parsed;
      else if (parsed.studyNotes && Array.isArray(parsed.studyNotes)) items = parsed.studyNotes;
      else if (parsed.notes && Array.isArray(parsed.notes)) items = parsed.notes;

      items.forEach((item, idx) => {
        if (!item.title) {
          result.warnings.push(`Note #${idx + 1} skipped: missing title.`);
          return;
        }

        const note: StudyNote = {
          id: item.id || `note-bulk-${Date.now()}-${idx}`,
          title: item.title,
          subject: item.subject || 'Physics',
          classLevel: item.classLevel || 'Class 10 (Matric Pt 2)',
          chapter: item.chapter || 'Chapter 1: Fundamentals',
          type: item.type || 'Notes',
          contentSnippet: item.contentSnippet || item.snippet || 'High-yield conceptual revision notes and key concepts.',
          fullContent: item.fullContent || item.content || undefined,
          readTime: item.readTime || '8 mins',
          downloadsCount: typeof item.downloadsCount === 'number' ? item.downloadsCount : 0,
        };
        result.data.push(note);
      });

      result.totalParsed = result.data.length;
      result.success = result.data.length > 0;
      return result;
    } catch (e: any) {
      result.errors.push(`JSON Syntax Error: ${e.message}`);
      return result;
    }
  } else {
    const rows = parseCSVToRows(raw);
    if (rows.length < 2) {
      result.errors.push('CSV must have header row and at least 1 data row.');
      return result;
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const tIdx = headers.findIndex((h) => h.includes('title') || h.includes('name'));
    const sIdx = headers.findIndex((h) => h.includes('subject'));
    const cIdx = headers.findIndex((h) => h.includes('class'));
    const chIdx = headers.findIndex((h) => h.includes('chapter'));
    const typeIdx = headers.findIndex((h) => h.includes('type'));
    const snipIdx = headers.findIndex((h) => h.includes('snippet') || h.includes('summary') || h.includes('desc'));
    const timeIdx = headers.findIndex((h) => h.includes('time'));
    const contentIdx = headers.findIndex((h) => h.includes('content') || h.includes('full'));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[tIdx || 0]) continue;

      const title = row[tIdx !== -1 ? tIdx : 0];
      const note: StudyNote = {
        id: `note-bulk-${Date.now()}-${i}`,
        title,
        subject: sIdx !== -1 && row[sIdx] ? row[sIdx] : 'Physics',
        classLevel: cIdx !== -1 && row[cIdx] ? row[cIdx] : 'Class 10 (Matric Pt 2)',
        chapter: chIdx !== -1 && row[chIdx] ? row[chIdx] : 'General Chapter',
        type: (typeIdx !== -1 && row[typeIdx] ? row[typeIdx] : 'Notes') as any,
        contentSnippet: snipIdx !== -1 && row[snipIdx] ? row[snipIdx] : 'High-yield textbook revision summary.',
        readTime: timeIdx !== -1 && row[timeIdx] ? row[timeIdx] : '8 mins',
        downloadsCount: 0,
        fullContent: contentIdx !== -1 && row[contentIdx] ? row[contentIdx] : undefined,
      };
      result.data.push(note);
    }

    result.totalParsed = result.data.length;
    result.success = result.data.length > 0;
    return result;
  }
}

/**
 * Parses a complete Academic Bundle (JSON with mcqs, tests, pastPapers, studyNotes)
 */
export function parseAcademicBundle(rawJson: string): {
  success: boolean;
  mcqs: MCQ[];
  tests: TestConfig[];
  pastPapers: PastPaper[];
  studyNotes: StudyNote[];
  errors: string[];
} {
  const result = {
    success: false,
    mcqs: [] as MCQ[],
    tests: [] as TestConfig[],
    pastPapers: [] as PastPaper[],
    studyNotes: [] as StudyNote[],
    errors: [] as string[],
  };

  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') {
      result.errors.push('Bundle JSON must be a valid object containing data arrays.');
      return result;
    }

    if (parsed.mcqs) {
      const mcqRes = parseMCQsData(JSON.stringify(parsed.mcqs), 'json');
      result.mcqs = mcqRes.data;
    }
    if (parsed.tests) {
      const testRes = parseTestsData(JSON.stringify(parsed.tests), 'json', result.mcqs);
      result.tests = testRes.data;
    }
    if (parsed.pastPapers || parsed.exams) {
      const ppRes = parsePastPapersData(JSON.stringify(parsed.pastPapers || parsed.exams), 'json');
      result.pastPapers = ppRes.data;
    }
    if (parsed.studyNotes || parsed.notes) {
      const noteRes = parseStudyNotesData(JSON.stringify(parsed.studyNotes || parsed.notes), 'json');
      result.studyNotes = noteRes.data;
    }

    const totalCount =
      result.mcqs.length + result.tests.length + result.pastPapers.length + result.studyNotes.length;
    result.success = totalCount > 0;
    if (totalCount === 0) {
      result.errors.push('No recognized collections (mcqs, tests, pastPapers, studyNotes) found in the bundle.');
    }
  } catch (e: any) {
    result.errors.push(`JSON Syntax Error: ${e.message}`);
  }

  return result;
}

/**
 * Provides ready-to-use sample templates for instant testing and download
 */
export function getSampleImportData(
  category: 'mcqs' | 'past-papers' | 'tests' | 'study-notes' | 'bundle',
  format: 'json' | 'csv'
): string {
  if (category === 'mcqs') {
    if (format === 'json') {
      return JSON.stringify(
        [
          {
            question: 'What is the SI unit of electric potential difference?',
            options: ['Volt', 'Ampere', 'Joule', 'Coulomb'],
            correctAnswer: 0,
            explanation: 'Electric potential difference between two points is measured in volts (V), defined as one joule of energy per coulomb of charge.',
            subject: 'Physics',
            classLevel: 'Class 10 (Matric Pt 2)',
            board: 'BISE Lahore',
            chapter: 'Current Electricity',
            difficulty: 'Easy',
            tags: ['physics', 'electricity', 'class10'],
          },
          {
            question: 'Which subatomic particle carries no net electric charge?',
            options: ['Proton', 'Neutron', 'Electron', 'Positron'],
            correctAnswer: 1,
            explanation: 'Neutrons are electrically neutral particles located inside the atomic nucleus, discovered by James Chadwick in 1932.',
            subject: 'Chemistry',
            classLevel: 'Class 9 (Matric Pt 1)',
            board: 'BISE Rawalpindi',
            chapter: 'Structure of Atoms',
            difficulty: 'Easy',
            tags: ['chemistry', 'atomic-structure', 'class9'],
          },
          {
            question: 'Which enzyme in human saliva begins the chemical digestion of starch?',
            options: ['Pepsin', 'Salivary Amylase (Ptyalin)', 'Trypsin', 'Lipase'],
            correctAnswer: 1,
            explanation: 'Salivary amylase (ptyalin) hydrolyzes dietary starch into maltose and dextrin in the neutral-to-slightly-acidic oral cavity.',
            subject: 'Biology',
            classLevel: 'Class 11 (FSc / ICS Pt 1)',
            board: 'Federal Board (FBISE)',
            chapter: 'Digestion and Nutrition',
            difficulty: 'Medium',
            tags: ['biology', 'enzymes', 'mdcat'],
          },
          {
            question: 'What is the derivative of sin(x) with respect to x?',
            options: ['-cos(x)', 'cos(x)', '-sin(x)', 'tan(x)'],
            correctAnswer: 1,
            explanation: 'According to differential calculus fundamental derivatives, d/dx[sin(x)] = cos(x).',
            subject: 'Mathematics',
            classLevel: 'Class 12 (FSc / ICS Pt 2)',
            board: 'BISE Multan',
            chapter: 'Differentiation',
            difficulty: 'Medium',
            tags: ['math', 'calculus', 'ecat'],
          },
        ],
        null,
        2
      );
    } else {
      return `Question,Option A,Option B,Option C,Option D,Correct Answer,Subject,Class,Board,Difficulty,Explanation
"What is the SI unit of electric potential difference?","Volt","Ampere","Joule","Coulomb","A","Physics","Class 10 (Matric Pt 2)","BISE Lahore","Easy","One volt equals one joule per coulomb."
"Which subatomic particle carries no net electric charge?","Proton","Neutron","Electron","Positron","B","Chemistry","Class 9 (Matric Pt 1)","BISE Rawalpindi","Easy","Neutrons have zero net electrical charge."
"Which enzyme in human saliva begins the chemical digestion of starch?","Pepsin","Salivary Amylase","Trypsin","Lipase","B","Biology","Class 11 (FSc / ICS Pt 1)","Federal Board (FBISE)","Medium","Salivary amylase hydrolyzes starch into disaccharides."
"What is the derivative of sin(x) with respect to x?","-cos(x)","cos(x)","-sin(x)","tan(x)","B","Mathematics","Class 12 (FSc / ICS Pt 2)","BISE Multan","Medium","Fundamental trigonometric differentiation rule."`;
    }
  }

  if (category === 'past-papers') {
    if (format === 'json') {
      return JSON.stringify(
        [
          {
            title: 'BISE Lahore Class 10 Chemistry Annual Paper 2024 (Group 1)',
            board: 'BISE Lahore',
            province: 'Punjab',
            classLevel: 'Class 10 (Matric Pt 2)',
            subject: 'Chemistry',
            year: 2024,
            paperGroup: 'Group 1',
            type: 'Objective (MCQs)',
            questionsCount: 12,
          },
          {
            title: 'BISE Karachi Class 12 Biology Pre-Medical Annual 2024',
            board: 'BIEK Karachi',
            province: 'Sindh',
            classLevel: 'Class 12 (FSc / ICS Pt 2)',
            subject: 'Biology',
            year: 2024,
            paperGroup: 'Annual',
            type: 'Objective (MCQs)',
            questionsCount: 15,
          },
          {
            title: 'FBISE Islamabad Class 9 Mathematics Model Paper 2024',
            board: 'Federal Board (FBISE)',
            province: 'Federal',
            classLevel: 'Class 9 (Matric Pt 1)',
            subject: 'Mathematics',
            year: 2024,
            paperGroup: 'Annual',
            type: 'Combined',
            questionsCount: 15,
          },
        ],
        null,
        2
      );
    } else {
      return `Title,Board,Province,Class Level,Subject,Year,Group,Type,Questions Count
"BISE Lahore Class 10 Chemistry Annual Paper 2024 (Group 1)","BISE Lahore","Punjab","Class 10 (Matric Pt 2)","Chemistry","2024","Group 1","Objective (MCQs)","12"
"BISE Karachi Class 12 Biology Pre-Medical Annual 2024","BIEK Karachi","Sindh","Class 12 (FSc / ICS Pt 2)","Biology","2024","Annual","Objective (MCQs)","15"
"FBISE Islamabad Class 9 Mathematics Model Paper 2024","Federal Board (FBISE)","Federal","Class 9 (Matric Pt 1)","Mathematics","2024","Annual","Combined","15"`;
    }
  }

  if (category === 'tests') {
    if (format === 'json') {
      return JSON.stringify(
        [
          {
            title: 'Class 10 Chemistry - Acids, Bases & Salts Grand Test',
            description: 'Standard board examination chapter test testing Arrhenius, Bronsted-Lowry, pH scale, and indicators.',
            testType: 'Chapter Test',
            category: 'Matric',
            subject: 'Chemistry',
            classLevel: 'Class 10 (Matric Pt 2)',
            board: 'BISE Lahore',
            durationMinutes: 20,
            passPercentage: 50,
            negativeMarking: false,
          },
          {
            title: 'MDCAT Biology Cell Structure & Bioenergetics Rapid Fire Mock',
            description: 'High-speed medical college entry test drill with negative marking simulation.',
            testType: 'Entry Test',
            category: 'MDCAT',
            subject: 'Biology',
            classLevel: 'Class 12 (FSc / ICS Pt 2)',
            exam: 'MDCAT',
            durationMinutes: 25,
            passPercentage: 60,
            negativeMarking: true,
          },
        ],
        null,
        2
      );
    } else {
      return `Title,Subject,Category,Test Type,Class Level,Board,Duration (Min),Pass Percentage,Negative Marking
"Class 10 Chemistry - Acids Bases & Salts Grand Test","Chemistry","Matric","Chapter Test","Class 10 (Matric Pt 2)","BISE Lahore","20","50","false"
"MDCAT Biology Cell Structure Rapid Mock","Biology","MDCAT","Entry Test","Class 12 (FSc / ICS Pt 2)","UHS Lahore","25","60","true"`;
    }
  }

  if (category === 'study-notes') {
    if (format === 'json') {
      return JSON.stringify(
        [
          {
            title: 'Class 10 Chemistry Chapter 10: Acids, Bases and Salts Master Revision',
            subject: 'Chemistry',
            classLevel: 'Class 10 (Matric Pt 2)',
            chapter: 'Chapter 10: Acids, Bases and Salts',
            type: 'Notes',
            readTime: '15 mins',
            contentSnippet: 'Comprehensive coverage of Arrhenius theory, Bronsted-Lowry acid-base pairs, Lewis concepts, pH calculations, and neutralisation.',
            fullContent: `ACIDS, BASES AND SALTS - COMPLETE CHAPTER NOTES
1. Concepts of Acids and Bases:
- Arrhenius: Acids produce H+ ions in aqueous solutions; bases produce OH- ions.
- Bronsted-Lowry: Acid is a proton (H+) donor; base is a proton acceptor.
- Lewis Concept: Acid is an electron pair acceptor; base is an electron pair donor.
2. The pH Scale:
pH = -log[H+]. Neutral pH = 7.0 at 25°C. Acidic < 7, Basic > 7.`,
          },
          {
            title: 'Class 12 Mathematics Key Differentiation Formulas & Theorems',
            subject: 'Mathematics',
            classLevel: 'Class 12 (FSc / ICS Pt 2)',
            chapter: 'Chapter 2: Differentiation',
            type: 'Formulas',
            readTime: '10 mins',
            contentSnippet: 'Essential formula sheet: Power rule, product rule, quotient rule, trigonometric derivatives, and chain rule summaries.',
          },
        ],
        null,
        2
      );
    } else {
      return `Title,Subject,Class Level,Chapter,Type,Read Time,Content Snippet
"Class 10 Chemistry Chapter 10: Acids Bases and Salts Master Revision","Chemistry","Class 10 (Matric Pt 2)","Chapter 10: Acids Bases and Salts","Notes","15 mins","Comprehensive coverage of Arrhenius, Bronsted-Lowry, Lewis theories, and pH scale."
"Class 12 Mathematics Key Differentiation Formulas & Theorems","Mathematics","Class 12 (FSc / ICS Pt 2)","Chapter 2: Differentiation","Formulas","10 mins","Complete derivative formula cheat sheet for board and entry exams."`;
    }
  }

  // All-in-one Academic Bundle
  return JSON.stringify(
    {
      mcqs: [
        {
          question: 'What is the speed of light in vacuum?',
          options: ['3 x 10^8 m/s', '3 x 10^6 m/s', '3 x 10^5 km/h', '1.5 x 10^8 m/s'],
          correctAnswer: 0,
          explanation: 'The speed of light in vacuum is approximately 299,792,458 m/s (commonly rounded to 3 x 10^8 m/s).',
          subject: 'Physics',
          classLevel: 'Class 10 (Matric Pt 2)',
          board: 'BISE Lahore',
          chapter: 'Geometrical Optics',
          difficulty: 'Easy',
        },
      ],
      tests: [
        {
          title: 'Class 10 Physics Speed of Light Quick Assessment',
          subject: 'Physics',
          category: 'Matric',
          testType: 'Chapter Test',
          durationMinutes: 10,
          passPercentage: 50,
          negativeMarking: false,
        },
      ],
      pastPapers: [
        {
          title: 'BISE Rawalpindi Class 10 Physics 2024 Group 1',
          board: 'BISE Rawalpindi',
          province: 'Punjab',
          classLevel: 'Class 10 (Matric Pt 2)',
          subject: 'Physics',
          year: 2024,
          paperGroup: 'Group 1',
          type: 'Objective (MCQs)',
          questionsCount: 12,
        },
      ],
      studyNotes: [
        {
          title: 'Class 10 Physics Speed of Light and Refraction Quick Reference',
          subject: 'Physics',
          classLevel: 'Class 10 (Matric Pt 2)',
          chapter: 'Chapter 5: Geometrical Optics',
          type: 'Formulas',
          readTime: '5 mins',
          contentSnippet: 'Index of refraction: n = c / v. Snell’s Law: n1 sinθ1 = n2 sinθ2.',
        },
      ],
    },
    null,
    2
  );
}

/**
 * Triggers a client-side file download of text/JSON/CSV
 */
export function downloadFile(filename: string, content: string, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
