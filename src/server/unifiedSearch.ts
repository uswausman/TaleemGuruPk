import { eq, and, ilike, sql, or, desc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  mcqs,
  tests,
  pastPapers,
  studyNotes,
  documents,
  boards,
  classes,
  subjects,
  chapters,
} from '../db/schema.ts';
import type {
  UnifiedSearchResultItem,
  UnifiedSearchFilters,
  UnifiedSearchResponse,
  SearchContentType,
} from '../types.ts';

// Helper to escape ILIKE special characters
function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

/**
 * Searches across all educational content with authoritative PostgreSQL queries
 * and server-side RBAC protection.
 */
export async function executeUnifiedSearch(
  filters: UnifiedSearchFilters,
  isStaff: boolean = false
): Promise<UnifiedSearchResponse> {
  const queryStr = (filters.query || '').trim();
  const searchType = (filters.type || 'all').toLowerCase() as SearchContentType;
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = (page - 1) * limit;

  // Strict RBAC: Non-staff users can ONLY ever query 'Published' content.
  // Attempts by non-staff to supply 'Draft' or 'Archived' are strictly overridden.
  let allowedStatus: 'Published' | 'Draft' | 'Archived' | 'All' = 'Published';
  if (isStaff) {
    if (filters.status === 'Draft' || filters.status === 'Archived' || filters.status === 'All') {
      allowedStatus = filters.status;
    } else {
      allowedStatus = (filters.status as any) || 'All';
    }
  }

  const allItems: UnifiedSearchResultItem[] = [];
  const categoryCounts: Record<string, number> = {
    all: 0,
    mcqs: 0,
    tests: 0,
    past_papers: 0,
    study_notes: 0,
    documents: 0,
    curriculum: 0,
  };

  if (!db) {
    return {
      results: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasMore: false,
      countsByCategory: categoryCounts,
      query: queryStr,
      appliedFilters: { ...filters, status: allowedStatus },
    };
  }

  // Pre-split tokens for client relevance scoring
  const tokens = queryStr.toLowerCase().split(/\s+/).filter(Boolean);

  // 1. MCQS Search
  const shouldSearchMCQs = searchType === 'all' || searchType === 'mcqs';
  if (shouldSearchMCQs) {
    try {
      const conditions: any[] = [];
      if (allowedStatus !== 'All') {
        conditions.push(eq(mcqs.status, allowedStatus));
      }
      if (filters.board && filters.board !== 'All') {
        conditions.push(ilike(mcqs.board, `%${escapeIlike(filters.board)}%`));
      }
      if (filters.classLevel && filters.classLevel !== 'All') {
        conditions.push(ilike(mcqs.classLevel, `%${escapeIlike(filters.classLevel)}%`));
      }
      if (filters.subject && filters.subject !== 'All') {
        conditions.push(ilike(mcqs.subject, `%${escapeIlike(filters.subject)}%`));
      }
      if (filters.chapter && filters.chapter !== 'All') {
        conditions.push(ilike(mcqs.chapter, `%${escapeIlike(filters.chapter)}%`));
      }
      if (filters.year) {
        conditions.push(eq(mcqs.year, filters.year));
      }

      if (queryStr) {
        const textConditions = tokens.map((tok) =>
          or(
            ilike(mcqs.question, `%${escapeIlike(tok)}%`),
            ilike(mcqs.subject, `%${escapeIlike(tok)}%`),
            ilike(mcqs.chapter, `%${escapeIlike(tok)}%`),
            ilike(mcqs.topic, `%${escapeIlike(tok)}%`)
          )
        );
        conditions.push(and(...textConditions));
      }

      const rows = await db
        .select()
        .from(mcqs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(200);

      categoryCounts.mcqs = rows.length;
      for (const row of rows) {
        allItems.push({
          id: row.id,
          type: 'mcq',
          title: row.question,
          subtitle: `${row.subject} • ${row.classLevel || 'Matric/FSc'} • ${row.difficulty || 'Medium'}`,
          description: row.explanation || undefined,
          subject: row.subject,
          classLevel: row.classLevel || undefined,
          board: row.board || undefined,
          chapter: row.chapter || undefined,
          topic: row.topic || undefined,
          year: row.year || undefined,
          status: (row.status as any) || 'Published',
          badge: 'MCQ',
          difficulty: row.difficulty,
          meta: {
            options: row.options,
            correctAnswer: row.correctAnswer,
          },
        });
      }
    } catch (err) {
      console.error('Error searching MCQs:', err);
    }
  }

  // 2. Tests / Quizzes Search
  const shouldSearchTests = searchType === 'all' || searchType === 'tests';
  if (shouldSearchTests) {
    try {
      const conditions: any[] = [];
      if (allowedStatus !== 'All') {
        conditions.push(eq(tests.status, allowedStatus));
      }
      if (filters.board && filters.board !== 'All') {
        conditions.push(ilike(tests.board, `%${escapeIlike(filters.board)}%`));
      }
      if (filters.classLevel && filters.classLevel !== 'All') {
        conditions.push(ilike(tests.classLevel, `%${escapeIlike(filters.classLevel)}%`));
      }
      if (filters.subject && filters.subject !== 'All') {
        conditions.push(ilike(tests.subject, `%${escapeIlike(filters.subject)}%`));
      }
      if (filters.chapter && filters.chapter !== 'All') {
        conditions.push(ilike(tests.chapter, `%${escapeIlike(filters.chapter)}%`));
      }

      if (queryStr) {
        const textConditions = tokens.map((tok) =>
          or(
            ilike(tests.title, `%${escapeIlike(tok)}%`),
            ilike(tests.subject, `%${escapeIlike(tok)}%`),
            ilike(tests.description, `%${escapeIlike(tok)}%`),
            ilike(tests.category, `%${escapeIlike(tok)}%`)
          )
        );
        conditions.push(and(...textConditions));
      }

      const rows = await db
        .select()
        .from(tests)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(200);

      categoryCounts.tests = rows.length;
      for (const row of rows) {
        allItems.push({
          id: row.id,
          type: 'test',
          title: row.title,
          subtitle: `${row.subject} • ${row.category} • ${row.totalQuestions} Questions • ${row.durationMinutes} Mins`,
          description: row.description || undefined,
          subject: row.subject,
          classLevel: row.classLevel || undefined,
          board: row.board || undefined,
          chapter: row.chapter || undefined,
          status: (row.status as any) || 'Published',
          badge: 'Online Test',
          meta: {
            durationMinutes: row.durationMinutes,
            totalQuestions: row.totalQuestions,
            totalMarks: row.totalMarks,
            negativeMarking: row.negativeMarking,
          },
        });
      }
    } catch (err) {
      console.error('Error searching tests:', err);
    }
  }

  // 3. Past Papers Search
  const shouldSearchPastPapers = searchType === 'all' || searchType === 'past_papers';
  if (shouldSearchPastPapers) {
    try {
      const conditions: any[] = [];
      if (allowedStatus !== 'All') {
        conditions.push(eq(pastPapers.status, allowedStatus));
      }
      if (filters.board && filters.board !== 'All') {
        conditions.push(ilike(pastPapers.board, `%${escapeIlike(filters.board)}%`));
      }
      if (filters.classLevel && filters.classLevel !== 'All') {
        conditions.push(ilike(pastPapers.classLevel, `%${escapeIlike(filters.classLevel)}%`));
      }
      if (filters.subject && filters.subject !== 'All') {
        conditions.push(ilike(pastPapers.subject, `%${escapeIlike(filters.subject)}%`));
      }
      if (filters.chapter && filters.chapter !== 'All') {
        conditions.push(ilike(pastPapers.chapter, `%${escapeIlike(filters.chapter)}%`));
      }
      if (filters.year) {
        conditions.push(eq(pastPapers.year, filters.year));
      }

      if (queryStr) {
        const textConditions = tokens.map((tok) =>
          or(
            ilike(pastPapers.title, `%${escapeIlike(tok)}%`),
            ilike(pastPapers.board, `%${escapeIlike(tok)}%`),
            ilike(pastPapers.subject, `%${escapeIlike(tok)}%`),
            ilike(pastPapers.description, `%${escapeIlike(tok)}%`)
          )
        );
        conditions.push(and(...textConditions));
      }

      const rows = await db
        .select()
        .from(pastPapers)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(200);

      categoryCounts.past_papers = rows.length;
      for (const row of rows) {
        allItems.push({
          id: row.id,
          type: 'past_paper',
          title: row.title,
          subtitle: `${row.board} • ${row.classLevel} • ${row.subject} • ${row.year}`,
          description: row.description || undefined,
          subject: row.subject,
          classLevel: row.classLevel,
          board: row.board,
          chapter: row.chapter || undefined,
          topic: row.topic || undefined,
          year: row.year,
          status: (row.status as any) || 'Published',
          badge: 'Past Paper',
          url: row.brandedFileUrl || row.downloadUrl || row.fileUrl || undefined,
          meta: {
            paperGroup: row.paperGroup,
            type: row.type,
            downloadsCount: row.downloadsCount,
          },
        });
      }
    } catch (err) {
      console.error('Error searching past papers:', err);
    }
  }

  // 4. Study Notes Search
  const shouldSearchStudyNotes = searchType === 'all' || searchType === 'study_notes';
  if (shouldSearchStudyNotes) {
    try {
      const conditions: any[] = [];
      if (allowedStatus !== 'All') {
        conditions.push(eq(studyNotes.status, allowedStatus));
      }
      if (filters.board && filters.board !== 'All') {
        conditions.push(ilike(studyNotes.board, `%${escapeIlike(filters.board)}%`));
      }
      if (filters.classLevel && filters.classLevel !== 'All') {
        conditions.push(ilike(studyNotes.classLevel, `%${escapeIlike(filters.classLevel)}%`));
      }
      if (filters.subject && filters.subject !== 'All') {
        conditions.push(ilike(studyNotes.subject, `%${escapeIlike(filters.subject)}%`));
      }
      if (filters.chapter && filters.chapter !== 'All') {
        conditions.push(ilike(studyNotes.chapter, `%${escapeIlike(filters.chapter)}%`));
      }

      if (queryStr) {
        const textConditions = tokens.map((tok) =>
          or(
            ilike(studyNotes.title, `%${escapeIlike(tok)}%`),
            ilike(studyNotes.subject, `%${escapeIlike(tok)}%`),
            ilike(studyNotes.chapter, `%${escapeIlike(tok)}%`),
            ilike(studyNotes.description, `%${escapeIlike(tok)}%`),
            ilike(studyNotes.contentSnippet, `%${escapeIlike(tok)}%`)
          )
        );
        conditions.push(and(...textConditions));
      }

      const rows = await db
        .select()
        .from(studyNotes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(200);

      categoryCounts.study_notes = rows.length;
      for (const row of rows) {
        allItems.push({
          id: row.id,
          type: 'study_note',
          title: row.title,
          subtitle: `${row.subject} • ${row.classLevel} • ${row.chapter}${row.topic ? ' - ' + row.topic : ''}`,
          description: row.description || row.contentSnippet || undefined,
          subject: row.subject,
          classLevel: row.classLevel,
          board: row.board || undefined,
          chapter: row.chapter,
          topic: row.topic || undefined,
          status: (row.status as any) || 'Published',
          badge: 'Study Note',
          url: row.brandedFileUrl || row.pdfUrl || undefined,
          meta: {
            readTime: row.readTime,
            downloadsCount: row.downloadsCount,
          },
        });
      }
    } catch (err) {
      console.error('Error searching study notes:', err);
    }
  }

  // 5. Documents Search
  const shouldSearchDocuments = searchType === 'all' || searchType === 'documents';
  if (shouldSearchDocuments) {
    try {
      const conditions: any[] = [];
      if (allowedStatus !== 'All') {
        conditions.push(eq(documents.status, allowedStatus));
      }
      if (filters.board && filters.board !== 'All') {
        conditions.push(ilike(documents.board, `%${escapeIlike(filters.board)}%`));
      }
      if (filters.classLevel && filters.classLevel !== 'All') {
        conditions.push(ilike(documents.classLevel, `%${escapeIlike(filters.classLevel)}%`));
      }
      if (filters.subject && filters.subject !== 'All') {
        conditions.push(ilike(documents.subject, `%${escapeIlike(filters.subject)}%`));
      }
      if (filters.chapter && filters.chapter !== 'All') {
        conditions.push(ilike(documents.chapter, `%${escapeIlike(filters.chapter)}%`));
      }
      if (filters.year) {
        conditions.push(eq(documents.year, filters.year));
      }

      if (queryStr) {
        const textConditions = tokens.map((tok) =>
          or(
            ilike(documents.title, `%${escapeIlike(tok)}%`),
            ilike(documents.originalFilename, `%${escapeIlike(tok)}%`),
            ilike(documents.subject, `%${escapeIlike(tok)}%`),
            ilike(documents.documentType, `%${escapeIlike(tok)}%`)
          )
        );
        conditions.push(and(...textConditions));
      }

      const rows = await db
        .select()
        .from(documents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(200);

      categoryCounts.documents = rows.length;
      for (const row of rows) {
        allItems.push({
          id: row.id,
          type: 'document',
          title: row.title,
          subtitle: `${row.documentType} • ${row.subject || 'Academic'} • ${row.classLevel || ''}`,
          description: row.originalFilename,
          subject: row.subject || undefined,
          classLevel: row.classLevel || undefined,
          board: row.board || undefined,
          chapter: row.chapter || undefined,
          year: row.year || undefined,
          status: (row.status as any) || 'Published',
          badge: row.documentType,
          url: `/api/documents/${row.id}/download`,
          meta: {
            fileSize: row.fileSize,
            mimeType: row.mimeType,
            downloadsCount: row.downloadsCount,
          },
        });
      }
    } catch (err) {
      console.error('Error searching documents:', err);
    }
  }

  // 6. Curriculum Hierarchy Search (Boards, Classes, Subjects, Chapters)
  const shouldSearchCurriculum =
    searchType === 'all' ||
    searchType === 'curriculum' ||
    searchType === 'boards' ||
    searchType === 'classes' ||
    searchType === 'subjects' ||
    searchType === 'chapters';

  if (shouldSearchCurriculum && queryStr) {
    try {
      let currCount = 0;

      // Boards
      if (searchType === 'all' || searchType === 'curriculum' || searchType === 'boards') {
        const boardRows = await db
          .select()
          .from(boards)
          .where(ilike(boards.name, `%${escapeIlike(queryStr)}%`))
          .limit(20);

        for (const b of boardRows) {
          currCount++;
          allItems.push({
            id: `board-${b.id}`,
            type: 'board',
            title: b.name,
            subtitle: 'Education Examination Board • Pakistan',
            status: b.status === 'Active' ? 'Published' : 'Draft',
            badge: 'Board',
            meta: { boardId: b.id },
          });
        }
      }

      // Classes
      if (searchType === 'all' || searchType === 'curriculum' || searchType === 'classes') {
        const classRows = await db
          .select()
          .from(classes)
          .where(ilike(classes.name, `%${escapeIlike(queryStr)}%`))
          .limit(20);

        for (const c of classRows) {
          currCount++;
          allItems.push({
            id: `class-${c.id}`,
            type: 'class',
            title: c.name,
            subtitle: 'Academic Grade / Level',
            status: c.status === 'Active' ? 'Published' : 'Draft',
            badge: 'Class',
            meta: { classId: c.id, boardId: c.boardId },
          });
        }
      }

      // Subjects
      if (searchType === 'all' || searchType === 'curriculum' || searchType === 'subjects') {
        const subjectRows = await db
          .select()
          .from(subjects)
          .where(ilike(subjects.name, `%${escapeIlike(queryStr)}%`))
          .limit(20);

        for (const s of subjectRows) {
          currCount++;
          allItems.push({
            id: `subject-${s.id}`,
            type: 'subject',
            title: s.name,
            subtitle: 'Curriculum Subject',
            status: s.status === 'Active' ? 'Published' : 'Draft',
            badge: 'Subject',
            meta: { subjectId: s.id, classId: s.classId },
          });
        }
      }

      // Chapters
      if (searchType === 'all' || searchType === 'curriculum' || searchType === 'chapters') {
        const chapterRows = await db
          .select()
          .from(chapters)
          .where(ilike(chapters.name, `%${escapeIlike(queryStr)}%`))
          .limit(20);

        for (const ch of chapterRows) {
          currCount++;
          allItems.push({
            id: `chapter-${ch.id}`,
            type: 'chapter',
            title: ch.name,
            subtitle: 'Subject Chapter / Topic',
            status: ch.status === 'Active' && ch.draftStatus === 'Published' ? 'Published' : 'Draft',
            badge: 'Chapter',
            meta: { chapterId: ch.id, subjectId: ch.subjectId },
          });
        }
      }

      categoryCounts.curriculum = currCount;
    } catch (err) {
      console.error('Error searching curriculum hierarchy:', err);
    }
  }

  // Calculate Relevance Scores for sorting
  if (queryStr) {
    const qLower = queryStr.toLowerCase();
    for (const item of allItems) {
      let score = 0;
      const titleLower = item.title.toLowerCase();

      // Exact title match gets highest priority
      if (titleLower === qLower) {
        score += 100;
      } else if (titleLower.startsWith(qLower)) {
        score += 60;
      } else if (titleLower.includes(qLower)) {
        score += 40;
      }

      // Token matches
      for (const tok of tokens) {
        if (titleLower.includes(tok)) score += 15;
        if (item.subject && item.subject.toLowerCase().includes(tok)) score += 12;
        if (item.classLevel && item.classLevel.toLowerCase().includes(tok)) score += 10;
        if (item.board && item.board.toLowerCase().includes(tok)) score += 8;
        if (item.chapter && item.chapter.toLowerCase().includes(tok)) score += 6;
        if (item.description && item.description.toLowerCase().includes(tok)) score += 4;
      }

      item.score = score;
    }

    // Sort by score descending
    allItems.sort((a, b) => (b.score || 0) - (a.score || 0));
  } else {
    // If no query, sort by newest or default order
    allItems.sort((a, b) => (b.year || 0) - (a.year || 0));
  }

  const total = allItems.length;
  categoryCounts.all = total;

  // Pagination slice
  const paginated = allItems.slice(offset, offset + limit);
  const totalPages = Math.ceil(total / limit);

  // Suggestions for empty results or typo recovery
  let suggestions: string[] = [];
  if (total === 0 && queryStr) {
    suggestions = generateSearchSuggestions(queryStr);
  }

  return {
    results: paginated,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
    countsByCategory: categoryCounts,
    suggestions,
    query: queryStr,
    appliedFilters: {
      type: filters.type,
      board: filters.board,
      classLevel: filters.classLevel,
      subject: filters.subject,
      chapter: filters.chapter,
      year: filters.year,
      status: allowedStatus,
    },
  };
}

/**
 * Fast search suggestions / autocomplete for instant UI search
 */
export async function getQuickSearchSuggestions(
  query: string,
  isStaff: boolean = false
): Promise<Array<{ text: string; category: string; type: string; id: string; url?: string }>> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed || trimmed.length < 2) return [];

  const response = await executeUnifiedSearch(
    { query: trimmed, limit: 8, type: 'all' },
    isStaff
  );

  return response.results.slice(0, 8).map((item) => ({
    text: item.title,
    category: item.badge || item.type,
    type: item.type,
    id: item.id,
    url: item.url,
  }));
}

/**
 * Retrieves dynamic filter options directly from PostgreSQL
 * to populate Board → Class → Subject → Chapter → Year cascaded dropdowns.
 */
export async function getDynamicSearchFilters(): Promise<{
  boards: string[];
  classes: string[];
  subjects: string[];
  chapters: string[];
  years: number[];
  contentTypes: Array<{ id: string; label: string }>;
}> {
  const filterSets = {
    boards: new Set<string>(),
    classes: new Set<string>(),
    subjects: new Set<string>(),
    chapters: new Set<string>(),
    years: new Set<number>(),
  };

  if (!db) {
    return {
      boards: [],
      classes: [],
      subjects: [],
      chapters: [],
      years: [],
      contentTypes: getDefaultContentTypes(),
    };
  }

  try {
    // 1. Fetch from boards table
    const bRows = await db.select({ name: boards.name }).from(boards).where(eq(boards.status, 'Active'));
    bRows.forEach((r) => r.name && filterSets.boards.add(r.name));

    // 2. Fetch from classes table
    const cRows = await db.select({ name: classes.name }).from(classes).where(eq(classes.status, 'Active'));
    cRows.forEach((r) => r.name && filterSets.classes.add(r.name));

    // 3. Fetch from subjects table
    const sRows = await db.select({ name: subjects.name }).from(subjects).where(eq(subjects.status, 'Active'));
    sRows.forEach((r) => r.name && filterSets.subjects.add(r.name));

    // 4. Fetch from chapters table
    const chRows = await db.select({ name: chapters.name }).from(chapters).where(eq(chapters.status, 'Active'));
    chRows.forEach((r) => r.name && filterSets.chapters.add(r.name));

    // 5. Distinct years from past_papers and documents
    const pYears = await db
      .select({ year: pastPapers.year })
      .from(pastPapers)
      .where(sql`${pastPapers.year} IS NOT NULL`);
    pYears.forEach((r) => r.year && filterSets.years.add(r.year));

    const dYears = await db
      .select({ year: documents.year })
      .from(documents)
      .where(sql`${documents.year} IS NOT NULL`);
    dYears.forEach((r) => r.year && filterSets.years.add(r.year));
  } catch (err) {
    console.error('Error fetching dynamic search filters:', err);
  }

  return {
    boards: Array.from(filterSets.boards).sort(),
    classes: Array.from(filterSets.classes).sort(),
    subjects: Array.from(filterSets.subjects).sort(),
    chapters: Array.from(filterSets.chapters).sort(),
    years: Array.from(filterSets.years).sort((a, b) => b - a),
    contentTypes: getDefaultContentTypes(),
  };
}

function getDefaultContentTypes(): Array<{ id: string; label: string }> {
  return [
    { id: 'all', label: 'All Content' },
    { id: 'mcqs', label: 'MCQs & Question Bank' },
    { id: 'tests', label: 'Online Tests & Quizzes' },
    { id: 'past_papers', label: 'Past Papers' },
    { id: 'study_notes', label: 'Study Notes & Summaries' },
    { id: 'documents', label: 'PDF Documents & Syllabi' },
    { id: 'curriculum', label: 'Boards, Classes & Subjects' },
  ];
}

/**
 * Smart search suggestions when zero results are found
 */
function generateSearchSuggestions(query: string): string[] {
  const commonAcademicTopics = [
    'Physics Class 9',
    'Physics Class 10',
    'Mathematics FSc Part 1',
    'Biology MCQs Class 10',
    'Chemistry Past Papers',
    'English Grammar Notes',
    'Computer Science Matric',
    'BISE Lahore Past Papers',
    'Federal Board SSC',
    'MDCAT Biology Preparation',
    'ECAT Mathematics Practice',
  ];

  const qLower = query.toLowerCase();
  // Filter relevant popular searches
  const matched = commonAcademicTopics.filter((topic) =>
    topic.toLowerCase().split(' ').some((word) => qLower.includes(word) || word.toLowerCase().includes(qLower))
  );

  return matched.length > 0 ? matched.slice(0, 4) : commonAcademicTopics.slice(0, 4);
}
