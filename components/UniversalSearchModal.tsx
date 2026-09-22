import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  FileText,
  Clock,
  BookOpen,
  Landmark,
  Layers,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Calendar,
  Zap,
  HelpCircle,
} from 'lucide-react';
import {
  MCQ,
  TestConfig,
  PastPaper,
  StudyNote,
  VideoLecture,
  BoardInfo,
  AcademicSubjectInfo,
  ViewMode,
} from '../types';
import {
  PAKISTAN_BOARDS,
  ACADEMIC_SUBJECTS,
  ACADEMIC_CLASSES,
} from '../data/educationalHierarchy';

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  mcqs: MCQ[];
  tests: TestConfig[];
  pastPapers: PastPaper[];
  notes: StudyNote[];
  videos?: VideoLecture[];
  onSelectTest: (test: TestConfig) => void;
  onSelectMCQ: (mcq: MCQ) => void;
  onSelectPastPaper: (paper: PastPaper) => void;
  onSelectNote: (note: StudyNote) => void;
  onNavigate: (view: ViewMode, subFilter?: string) => void;
}

type SearchCategory = 'all' | 'questions' | 'quizzes' | 'notes' | 'pastPapers' | 'subjects' | 'boards';

export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({
  isOpen,
  onClose,
  mcqs,
  tests,
  pastPapers,
  notes,
  onSelectTest,
  onSelectMCQ,
  onSelectPastPaper,
  onSelectNote,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [boardFilter, setBoardFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const trimmed = query.trim().toLowerCase();

  // Search Results Computation with Debounced memoization
  const searchResults = useMemo(() => {
    // 1. Filter Questions (MCQs)
    const matchingMCQs = mcqs.filter((m) => {
      const matchesText =
        !trimmed ||
        m.question.toLowerCase().includes(trimmed) ||
        m.subject.toLowerCase().includes(trimmed) ||
        m.chapter?.toLowerCase().includes(trimmed) ||
        m.topic?.toLowerCase().includes(trimmed) ||
        m.tags?.some((tg) => tg.toLowerCase().includes(trimmed));

      const matchesSub = subjectFilter === 'All' || m.subject.toLowerCase() === subjectFilter.toLowerCase();
      const matchesCls = classFilter === 'All' || (m.classLevel && m.classLevel.toLowerCase().includes(classFilter.toLowerCase()));
      const matchesBrd = boardFilter === 'All' || (m.board && m.board.toLowerCase().includes(boardFilter.toLowerCase()));

      return matchesText && matchesSub && matchesCls && matchesBrd;
    });

    // 2. Filter Quizzes (Tests)
    const matchingTests = tests.filter((t) => {
      const matchesText =
        !trimmed ||
        t.title.toLowerCase().includes(trimmed) ||
        t.subject.toLowerCase().includes(trimmed) ||
        t.category.toLowerCase().includes(trimmed) ||
        t.classLevel?.toLowerCase().includes(trimmed) ||
        t.board?.toLowerCase().includes(trimmed);

      const matchesSub = subjectFilter === 'All' || t.subject.toLowerCase() === subjectFilter.toLowerCase();
      const matchesCls = classFilter === 'All' || (t.classLevel && t.classLevel.toLowerCase().includes(classFilter.toLowerCase()));
      const matchesBrd = boardFilter === 'All' || (t.board && t.board.toLowerCase().includes(boardFilter.toLowerCase()));

      return matchesText && matchesSub && matchesCls && matchesBrd;
    });

    // 3. Filter Notes
    const matchingNotes = notes.filter((n) => {
      const matchesText =
        !trimmed ||
        n.title.toLowerCase().includes(trimmed) ||
        n.subject.toLowerCase().includes(trimmed) ||
        n.chapter.toLowerCase().includes(trimmed) ||
        n.topic?.toLowerCase().includes(trimmed) ||
        n.contentSnippet?.toLowerCase().includes(trimmed);

      const matchesSub = subjectFilter === 'All' || n.subject.toLowerCase() === subjectFilter.toLowerCase();
      const matchesCls = classFilter === 'All' || n.classLevel.toLowerCase().includes(classFilter.toLowerCase());
      const matchesBrd = boardFilter === 'All' || (n.board && n.board.toLowerCase().includes(boardFilter.toLowerCase()));

      return matchesText && matchesSub && matchesCls && matchesBrd;
    });

    // 4. Filter Past Papers
    const matchingPastPapers = pastPapers.filter((p) => {
      const matchesText =
        !trimmed ||
        p.title.toLowerCase().includes(trimmed) ||
        p.board.toLowerCase().includes(trimmed) ||
        p.subject.toLowerCase().includes(trimmed) ||
        p.classLevel.toLowerCase().includes(trimmed) ||
        p.year.toString().includes(trimmed);

      const matchesSub = subjectFilter === 'All' || p.subject.toLowerCase() === subjectFilter.toLowerCase();
      const matchesCls = classFilter === 'All' || p.classLevel.toLowerCase().includes(classFilter.toLowerCase());
      const matchesBrd = boardFilter === 'All' || p.board.toLowerCase().includes(boardFilter.toLowerCase());

      return matchesText && matchesSub && matchesCls && matchesBrd;
    });

    // 5. Filter Subjects
    const matchingSubjects = ACADEMIC_SUBJECTS.filter((s) => {
      const matchesText =
        !trimmed ||
        s.name.toLowerCase().includes(trimmed) ||
        s.category.toLowerCase().includes(trimmed) ||
        s.description.toLowerCase().includes(trimmed);

      const matchesSub = subjectFilter === 'All' || s.name.toLowerCase() === subjectFilter.toLowerCase();
      return matchesText && matchesSub;
    });

    // 6. Filter Boards
    const matchingBoards = PAKISTAN_BOARDS.filter((b) => {
      const matchesText =
        !trimmed ||
        b.name.toLowerCase().includes(trimmed) ||
        b.code.toLowerCase().includes(trimmed) ||
        b.city.toLowerCase().includes(trimmed) ||
        b.province.toLowerCase().includes(trimmed);

      const matchesBrd = boardFilter === 'All' || b.name.toLowerCase().includes(boardFilter.toLowerCase()) || b.province.toLowerCase() === boardFilter.toLowerCase();
      return matchesText && matchesBrd;
    });

    return {
      questions: matchingMCQs,
      quizzes: matchingTests,
      notes: matchingNotes,
      pastPapers: matchingPastPapers,
      subjects: matchingSubjects,
      boards: matchingBoards,
      totalCount:
        matchingMCQs.length +
        matchingTests.length +
        matchingNotes.length +
        matchingPastPapers.length +
        matchingSubjects.length +
        matchingBoards.length,
    };
  }, [trimmed, mcqs, tests, notes, pastPapers, subjectFilter, classFilter, boardFilter]);

  if (!isOpen) return null;

  const popularSearches = [
    'Class 10 Physics Chapter 5',
    'MDCAT Biology Mock Test',
    'BISE Lahore Past Papers 2024',
    'FBISE Federal Board Chemistry',
    'Class 9 Mathematics Matrices',
    'Sindh Board English MCQs',
  ];

  const handleResetFilters = () => {
    setQuery('');
    setActiveCategory('all');
    setSubjectFilter('All');
    setClassFilter('All');
    setBoardFilter('All');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search for Questions, Quizzes, Notes, Past Papers, Subjects and Boards"
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 px-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/80 dark:bg-slate-950/50">
          <Search className="w-5 h-5 text-blue-600 dark:text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions, quizzes, notes, past papers, subjects, boards..."
            className="w-full bg-transparent text-sm sm:text-base text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden font-medium"
            aria-label="Search content"
          />

          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Clear input"
              aria-label="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
              showFilters || subjectFilter !== 'All' || classFilter !== 'All' || boardFilter !== 'All'
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-cyan-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Toggle Detailed Filters"
            aria-label="Toggle Search Filters"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shrink-0 cursor-pointer"
            aria-label="Close search"
          >
            Esc
          </button>
        </div>

        {/* Secondary Filter Dropdowns Bar */}
        {showFilters && (
          <div className="p-3 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="All">All Subjects</option>
                {ACADEMIC_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Class / Level</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="All">All Classes</option>
                {ACADEMIC_CLASSES.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Board / Province</label>
              <select
                value={boardFilter}
                onChange={(e) => setBoardFilter(e.target.value)}
                className="w-full p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="All">All Boards</option>
                <option value="Punjab">Punjab Boards</option>
                <option value="Federal">Federal Board</option>
                <option value="Sindh">Sindh Boards</option>
                <option value="KPK">KPK Boards</option>
                <option value="Balochistan">Balochistan Boards</option>
                <option value="AJK">AJK Board</option>
              </select>
            </div>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto text-xs"
        >
          {[
            { id: 'all', label: 'All Results', count: searchResults.totalCount },
            { id: 'questions', label: 'Questions (MCQs)', count: searchResults.questions.length },
            { id: 'quizzes', label: 'Quizzes / Tests', count: searchResults.quizzes.length },
            { id: 'notes', label: 'Notes', count: searchResults.notes.length },
            { id: 'pastPapers', label: 'Past Papers', count: searchResults.pastPapers.length },
            { id: 'subjects', label: 'Subjects', count: searchResults.subjects.length },
            { id: 'boards', label: 'Boards', count: searchResults.boards.length },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeCategory === tab.id}
              onClick={() => setActiveCategory(tab.id as SearchCategory)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* If there are NO results across selected category */}
          {searchResults.totalCount === 0 && (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No matches found for &quot;{query}&quot;
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Try adjusting your search terms, removing active subject/board filters, or explore one of the popular educational topics below.
                </p>
              </div>

              {/* Suggestions */}
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Suggested Searches:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {popularSearches.map((s) => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-cyan-400 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}

          {/* 1. QUIZZES / TESTS SECTION */}
          {(activeCategory === 'all' || activeCategory === 'quizzes') &&
            searchResults.quizzes.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-cyan-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Quizzes & Mock Tests ({searchResults.quizzes.length})
                  </h4>
                  {activeCategory === 'all' && searchResults.quizzes.length > 3 && (
                    <button
                      onClick={() => setActiveCategory('quizzes')}
                      className="text-xs text-blue-600 hover:underline font-bold"
                    >
                      View all {searchResults.quizzes.length}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {searchResults.quizzes.slice(0, activeCategory === 'all' ? 4 : 20).map((test) => (
                    <div
                      key={test.id}
                      onClick={() => {
                        onSelectTest(test);
                        onClose();
                      }}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 dark:hover:border-cyan-400 transition-all cursor-pointer flex flex-col justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span className="text-blue-600 dark:text-cyan-400">{test.category}</span>
                          <span>{test.totalQuestions} MCQs • {test.durationMinutes}m</span>
                        </div>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                          {test.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                          {test.subject} {test.classLevel && `• ${test.classLevel}`}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-cyan-400">
                        <span>Start Test</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* 2. QUESTIONS (MCQS) SECTION */}
          {(activeCategory === 'all' || activeCategory === 'questions') &&
            searchResults.questions.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Questions & MCQs ({searchResults.questions.length})
                  </h4>
                  {activeCategory === 'all' && searchResults.questions.length > 3 && (
                    <button
                      onClick={() => setActiveCategory('questions')}
                      className="text-xs text-emerald-600 hover:underline font-bold"
                    >
                      View all {searchResults.questions.length}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {searchResults.questions.slice(0, activeCategory === 'all' ? 3 : 25).map((mcq, idx) => (
                    <div
                      key={mcq.id || idx}
                      onClick={() => {
                        onSelectMCQ(mcq);
                        onClose();
                      }}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all cursor-pointer shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="px-2 py-0.5 rounded font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {mcq.subject} • {mcq.difficulty}
                        </span>
                        {mcq.chapter && <span className="text-slate-400 font-medium">{mcq.chapter}</span>}
                      </div>

                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                        {mcq.question}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Answer: Option {String.fromCharCode(65 + mcq.correctAnswer)} ({mcq.options[mcq.correctAnswer]})</span>
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          View Solution <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* 3. NOTES SECTION */}
          {(activeCategory === 'all' || activeCategory === 'notes') &&
            searchResults.notes.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> High-Yield Notes ({searchResults.notes.length})
                  </h4>
                  {activeCategory === 'all' && searchResults.notes.length > 3 && (
                    <button
                      onClick={() => setActiveCategory('notes')}
                      className="text-xs text-purple-600 hover:underline font-bold"
                    >
                      View all {searchResults.notes.length}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {searchResults.notes.slice(0, activeCategory === 'all' ? 4 : 20).map((note) => (
                    <div
                      key={note.id}
                      onClick={() => {
                        onSelectNote(note);
                        onClose();
                      }}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-500 dark:hover:border-purple-400 transition-all cursor-pointer flex flex-col justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-purple-600 dark:text-purple-400 font-bold mb-1">
                          <span>{note.subject} • {note.type || 'Notes'}</span>
                          <span className="text-slate-400">{note.readTime || '6m'}</span>
                        </div>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                          {note.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {note.contentSnippet || note.description}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-purple-600 dark:text-purple-400">
                        <span>Read Online / PDF</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* 4. PAST PAPERS SECTION */}
          {(activeCategory === 'all' || activeCategory === 'pastPapers') &&
            searchResults.pastPapers.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Solved Board Past Papers ({searchResults.pastPapers.length})
                  </h4>
                  {activeCategory === 'all' && searchResults.pastPapers.length > 3 && (
                    <button
                      onClick={() => setActiveCategory('pastPapers')}
                      className="text-xs text-teal-600 hover:underline font-bold"
                    >
                      View all {searchResults.pastPapers.length}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {searchResults.pastPapers.slice(0, activeCategory === 'all' ? 4 : 20).map((paper) => (
                    <div
                      key={paper.id}
                      onClick={() => {
                        onSelectPastPaper(paper);
                        onClose();
                      }}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-500 dark:hover:border-teal-400 transition-all cursor-pointer flex flex-col justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold mb-1">
                          <span className="font-mono bg-slate-900 text-white px-1.5 py-0.2 rounded">
                            {paper.year}
                          </span>
                          <span className="text-teal-700 dark:text-teal-300 font-semibold">{paper.board}</span>
                        </div>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                          {paper.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {paper.classLevel} • {paper.subject}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-teal-600 dark:text-teal-400">
                        <span>Solve Online / Preview</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* 5. SUBJECTS SECTION */}
          {(activeCategory === 'all' || activeCategory === 'subjects') &&
            searchResults.subjects.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Academic Subjects ({searchResults.subjects.length})
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {searchResults.subjects.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => {
                        onNavigate('subjects', sub.name);
                        onClose();
                      }}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 transition-all cursor-pointer flex items-center gap-2.5"
                    >
                      <span className="text-xl">{sub.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {sub.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{sub.category}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* 6. BOARDS SECTION */}
          {(activeCategory === 'all' || activeCategory === 'boards') &&
            searchResults.boards.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" /> Education Boards ({searchResults.boards.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {searchResults.boards.slice(0, activeCategory === 'all' ? 4 : 20).map((board) => (
                    <div
                      key={board.id}
                      onClick={() => {
                        onNavigate('boards', board.name);
                        onClose();
                      }}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {board.name}
                          </span>
                          <span className="text-[10px] font-mono px-1 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-500">
                            {board.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {board.city}, {board.province}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Footer info & shortcut hint */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Navigation: Click any result to open</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">ESC</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
