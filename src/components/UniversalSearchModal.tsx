import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Play,
  Download,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  MCQ,
  TestConfig,
  PastPaper,
  StudyNote,
  VideoLecture,
  ViewMode,
  UnifiedSearchResultItem,
  SearchContentType,
} from '../types.ts';
import {
  PAKISTAN_BOARDS,
  ACADEMIC_SUBJECTS,
  ACADEMIC_CLASSES,
} from '../data/educationalHierarchy.ts';

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

type SearchCategory = 'all' | 'questions' | 'quizzes' | 'notes' | 'pastPapers' | 'documents' | 'curriculum';

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
  const [chapterFilter, setChapterFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Server-side search states
  const [serverResults, setServerResults] = useState<UnifiedSearchResultItem[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const [serverSuggestions, setServerSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useServer, setUseServer] = useState<boolean>(true);

  // Dynamic filter lists from database
  const [dynamicFilters, setDynamicFilters] = useState<{
    boards: string[];
    classes: string[];
    subjects: string[];
    chapters: string[];
    years: number[];
  }>({
    boards: [],
    classes: [],
    subjects: [],
    chapters: [],
    years: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Load dynamic filters once
  useEffect(() => {
    if (isOpen) {
      fetch('/api/search/filters')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.boards) {
            setDynamicFilters({
              boards: data.boards,
              classes: data.classes,
              subjects: data.subjects,
              chapters: data.chapters,
              years: data.years,
            });
          }
        })
        .catch(() => {
          // fallback to client data
        });
    }
  }, [isOpen]);

  // Map category to API type
  const mapCategoryToApiType = (cat: SearchCategory): string => {
    switch (cat) {
      case 'questions':
        return 'mcqs';
      case 'quizzes':
        return 'tests';
      case 'notes':
        return 'study_notes';
      case 'pastPapers':
        return 'past_papers';
      case 'documents':
        return 'documents';
      case 'curriculum':
        return 'curriculum';
      default:
        return 'all';
    }
  };

  // Perform server-side search
  const fetchServerResults = useCallback(async () => {
    if (!useServer) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append('q', query.trim());
      params.append('type', mapCategoryToApiType(activeCategory));
      if (boardFilter !== 'All') params.append('board', boardFilter);
      if (classFilter !== 'All') params.append('classLevel', classFilter);
      if (subjectFilter !== 'All') params.append('subject', subjectFilter);
      if (chapterFilter !== 'All') params.append('chapter', chapterFilter);
      if (yearFilter !== 'All') params.append('year', yearFilter);
      params.append('limit', '30');

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setServerResults(data.results || []);
      setServerTotal(data.total || 0);
      setServerSuggestions(data.suggestions || []);
    } catch {
      // If server error, fallback to client-side filtering
      setUseServer(false);
    } finally {
      setIsLoading(false);
    }
  }, [query, activeCategory, boardFilter, classFilter, subjectFilter, chapterFilter, yearFilter, useServer]);

  // Debounced search trigger
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchServerResults();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchServerResults, isOpen]);

  // Client-side fallback computation
  const trimmed = query.trim().toLowerCase();
  const fallbackResults = useMemo(() => {
    if (useServer && serverResults.length > 0) return [];

    const matchingMCQs = mcqs.filter((m) => {
      const matchesText =
        !trimmed ||
        m.question.toLowerCase().includes(trimmed) ||
        m.subject.toLowerCase().includes(trimmed) ||
        m.chapter?.toLowerCase().includes(trimmed);
      const matchesSub = subjectFilter === 'All' || m.subject.toLowerCase() === subjectFilter.toLowerCase();
      const matchesCls = classFilter === 'All' || (m.classLevel && m.classLevel.toLowerCase().includes(classFilter.toLowerCase()));
      const matchesBrd = boardFilter === 'All' || (m.board && m.board.toLowerCase().includes(boardFilter.toLowerCase()));
      return matchesText && matchesSub && matchesCls && matchesBrd;
    });

    const matchingTests = tests.filter((t) => {
      const matchesText =
        !trimmed ||
        t.title.toLowerCase().includes(trimmed) ||
        t.subject.toLowerCase().includes(trimmed);
      const matchesSub = subjectFilter === 'All' || t.subject.toLowerCase() === subjectFilter.toLowerCase();
      const matchesCls = classFilter === 'All' || (t.classLevel && t.classLevel.toLowerCase().includes(classFilter.toLowerCase()));
      const matchesBrd = boardFilter === 'All' || (t.board && t.board.toLowerCase().includes(boardFilter.toLowerCase()));
      return matchesText && matchesSub && matchesCls && matchesBrd;
    });

    const items: UnifiedSearchResultItem[] = [];
    matchingTests.forEach((t) =>
      items.push({
        id: t.id,
        type: 'test',
        title: t.title,
        subtitle: `${t.subject} • ${t.category}`,
        subject: t.subject,
        classLevel: t.classLevel,
        board: t.board,
        status: t.status,
        badge: 'Test',
      })
    );
    matchingMCQs.forEach((m) =>
      items.push({
        id: m.id,
        type: 'mcq',
        title: m.question,
        subtitle: `${m.subject} • ${m.difficulty}`,
        subject: m.subject,
        classLevel: m.classLevel,
        board: m.board,
        status: 'Published',
        badge: 'MCQ',
      })
    );

    return items;
  }, [trimmed, mcqs, tests, subjectFilter, classFilter, boardFilter, useServer, serverResults]);

  const activeResults = useServer ? serverResults : fallbackResults;

  // Global shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < activeResults.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeResults[selectedIndex]) {
          handleItemSelection(activeResults[selectedIndex]);
        } else if (query.trim()) {
          onClose();
          onNavigate('search', query.trim());
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeResults, selectedIndex, query, onNavigate]);

  const handleItemSelection = (item: UnifiedSearchResultItem) => {
    onClose();
    switch (item.type) {
      case 'test':
        onSelectTest({
          id: item.id,
          title: item.title,
          description: item.description || '',
          testType: 'Chapter Test',
          category: 'Academic',
          subject: item.subject || 'General',
          classLevel: item.classLevel || 'Class 9',
          board: item.board || 'All',
          durationMinutes: item.meta?.durationMinutes || 15,
          totalQuestions: item.meta?.totalQuestions || 10,
          totalMarks: item.meta?.totalMarks || 10,
          negativeMarking: false,
          passPercentage: 50,
          status: (item.status === 'Draft' ? 'Draft' : 'Published') as 'Draft' | 'Published',
          questions: [],
        });
        break;

      case 'mcq':
        onSelectMCQ({
          id: item.id,
          question: item.title,
          options: item.meta?.options || ['A', 'B', 'C', 'D'],
          correctAnswer: item.meta?.correctAnswer || 0,
          explanation: item.description || '',
          subject: item.subject || 'General',
          difficulty: (item.difficulty as any) || 'Medium',
          tags: item.meta?.tags || [],
        });
        break;

      case 'past_paper':
        onSelectPastPaper({
          id: item.id,
          title: item.title,
          board: item.board || 'BISE Lahore',
          classLevel: item.classLevel || 'Class 10',
          subject: item.subject || 'General',
          year: item.year || 2024,
          type: 'Objective (MCQs)',
          totalQuestions: 20,
          totalMarks: 20,
          questionsCount: item.meta?.totalQuestions || 20,
          downloadUrl: item.url,
          status: item.status,
          version: 1,
          brandingStatus: 'Branded',
          downloadsCount: item.meta?.downloadsCount || 0,
        });
        break;

      case 'study_note':
        onSelectNote({
          id: item.id,
          title: item.title,
          subject: item.subject || 'General',
          classLevel: item.classLevel || 'Class 10',
          chapter: item.chapter || 'Chapter 1',
          type: 'Notes',
          contentSnippet: item.description,
          pdfUrl: item.url,
          status: item.status,
          version: 1,
          brandingStatus: 'Branded',
          downloadsCount: item.meta?.downloadsCount || 0,
        });
        break;

      case 'document':
        if (item.url) {
          window.open(item.url, '_blank');
        }
        break;

      case 'board':
        onNavigate('boards', item.title);
        break;

      case 'class':
        onNavigate('classes', item.title);
        break;

      case 'subject':
        onNavigate('subjects', item.title);
        break;

      default:
        onNavigate('search', item.title);
        break;
    }
  };

  if (!isOpen) return null;

  const popularSearches = [
    'Physics Class 9',
    'Class 10 Biology Past Papers',
    'Mathematics ECAT Drill',
    'MDCAT Mock Test',
    'BISE Lahore Chemistry',
    'English Grammar Notes',
  ];

  const handleResetFilters = () => {
    setQuery('');
    setActiveCategory('all');
    setSubjectFilter('All');
    setClassFilter('All');
    setBoardFilter('All');
    setChapterFilter('All');
    setYearFilter('All');
  };

  const boardOptions = dynamicFilters.boards.length > 0 ? dynamicFilters.boards : PAKISTAN_BOARDS.map((b) => b.name);
  const classOptions = dynamicFilters.classes.length > 0 ? dynamicFilters.classes : ACADEMIC_CLASSES.map((c) => c.name);
  const subjectOptions = dynamicFilters.subjects.length > 0 ? dynamicFilters.subjects : ACADEMIC_SUBJECTS.map((s) => s.name);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Universal Search for Questions, Quizzes, Notes, Past Papers, Subjects and Boards"
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
            placeholder="Search MCQs, tests, notes, past papers, boards, subjects..."
            className="w-full bg-transparent text-sm sm:text-base text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden font-medium"
            aria-label="Search content"
          />

          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold px-2.5 transition-colors cursor-pointer ${
              showFilters || subjectFilter !== 'All' || classFilter !== 'All' || boardFilter !== 'All' || chapterFilter !== 'All' || yearFilter !== 'All'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-cyan-400'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle filters"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ml-1"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cascading Filter Bar */}
        {showFilters && (
          <div className="p-3 bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Filters:
            </span>

            {/* Board */}
            <select
              value={boardFilter}
              onChange={(e) => setBoardFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Boards</option>
              {boardOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Class */}
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Subject */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Subjects</option>
              {subjectOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Year */}
            {dynamicFilters.years.length > 0 && (
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Years</option>
                {dynamicFilters.years.map((y) => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
              </select>
            )}

            {(subjectFilter !== 'All' || classFilter !== 'All' || boardFilter !== 'All' || chapterFilter !== 'All' || yearFilter !== 'All') && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1 ml-auto cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none bg-slate-50/40 dark:bg-slate-900/40">
          {(
            [
              { id: 'all', label: 'All Content' },
              { id: 'questions', label: 'MCQs' },
              { id: 'quizzes', label: 'Tests' },
              { id: 'pastPapers', label: 'Past Papers' },
              { id: 'notes', label: 'Notes' },
              { id: 'documents', label: 'Documents' },
              { id: 'curriculum', label: 'Curriculum' },
            ] as const
          ).map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveCategory(tab.id);
                  setSelectedIndex(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4 max-h-[60vh]">
          {/* Quick suggestions when query is empty */}
          {!query && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Popular Academic Searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Search className="w-3 h-3 text-slate-400" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Searching verified curriculum database...
            </div>
          )}

          {/* Results List */}
          {!isLoading && activeResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Found {serverTotal || activeResults.length} matches in database
                </span>
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('search', query);
                  }}
                  className="text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>Open Full Results</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {activeResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${item.type}-${item.id}-${idx}`}
                    onClick={() => handleItemSelection(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500 shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5">
                        {item.type === 'test' && <Play className="w-4 h-4 fill-current" />}
                        {item.type === 'mcq' && <CheckCircle2 className="w-4 h-4" />}
                        {item.type === 'past_paper' && <FileText className="w-4 h-4" />}
                        {item.type === 'study_note' && <BookOpen className="w-4 h-4" />}
                        {item.type === 'document' && <Download className="w-4 h-4" />}
                        {item.type === 'board' && <Landmark className="w-4 h-4" />}
                        {item.type === 'class' && <GraduationCap className="w-4 h-4" />}
                        {item.type === 'subject' && <Layers className="w-4 h-4" />}
                        {item.type === 'chapter' && <BookOpen className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-100/60 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300">
                            {item.badge || item.type}
                          </span>
                          {item.subject && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {item.subject}
                            </span>
                          )}
                          {item.board && (
                            <span className="text-xs text-purple-600 dark:text-purple-400 truncate">
                              • {item.board}
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                          {item.title}
                        </p>

                        {item.subtitle && (
                          <p className="text-xs text-slate-400 truncate">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && query && activeResults.length === 0 && (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No matching content found
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No verified records match your query and active filters. Try searching for broader subjects or resetting filters.
              </p>

              {serverSuggestions.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-slate-400 mb-2 font-medium">Try searching for:</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {serverSuggestions.map((sug) => (
                      <button
                        key={sug}
                        onClick={() => setQuery(sug)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 text-xs"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="hidden sm:flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-sm font-mono text-[10px]">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-sm font-mono text-[10px]">↵</kbd> Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-sm font-mono text-[10px]">Esc</kbd> Close
            </span>
          </div>

          <button
            onClick={() => {
              onClose();
              onNavigate('search', query);
            }}
            className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1 ml-auto cursor-pointer"
          >
            <span>Open Advanced Search Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
