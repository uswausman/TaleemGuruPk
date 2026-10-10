import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Search,
  Filter,
  X,
  BookOpen,
  FileText,
  Clock,
  Landmark,
  GraduationCap,
  Layers,
  ChevronLeft,
  ChevronRight,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import type {
  UnifiedSearchResultItem,
  UnifiedSearchResponse,
  SearchContentType,
  TestConfig,
  MCQ,
  PastPaper,
  StudyNote,
  ViewMode,
} from '../types.ts';

interface PublicSearchViewProps {
  initialQuery?: string;
  initialType?: SearchContentType;
  onSelectTest?: (test: TestConfig) => void;
  onSelectMCQ?: (mcq: MCQ) => void;
  onSelectPastPaper?: (paper: PastPaper) => void;
  onSelectNote?: (note: StudyNote) => void;
  onNavigate?: (view: ViewMode, subFilter?: string) => void;
}

export const PublicSearchView: React.FC<PublicSearchViewProps> = ({
  initialQuery = '',
  initialType = 'all',
  onSelectTest,
  onSelectMCQ,
  onSelectPastPaper,
  onSelectNote,
  onNavigate,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState<SearchContentType>(initialType);
  const [selectedBoard, setSelectedBoard] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedChapter, setSelectedChapter] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  // Dynamic filter lists from database
  const [filterOptions, setFilterOptions] = useState<{
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

  const [searchResponse, setSearchResponse] = useState<UnifiedSearchResponse>({
    results: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasMore: false,
    countsByCategory: {},
    suggestions: [],
    query: '',
    appliedFilters: {},
  });

  // Fetch filter options once
  useEffect(() => {
    fetch('/api/search/filters')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.boards) {
          setFilterOptions({
            boards: data.boards || [],
            classes: data.classes || [],
            subjects: data.subjects || [],
            chapters: data.chapters || [],
            years: data.years || [],
          });
        }
      })
      .catch((err) => console.error('Failed to load search filters:', err));
  }, []);

  // Fetch Search Results
  const performSearch = useCallback(
    async (targetPage = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.append('q', query.trim());
        if (activeType !== 'all') params.append('type', activeType);
        if (selectedBoard !== 'All') params.append('board', selectedBoard);
        if (selectedClass !== 'All') params.append('classLevel', selectedClass);
        if (selectedSubject !== 'All') params.append('subject', selectedSubject);
        if (selectedChapter !== 'All') params.append('chapter', selectedChapter);
        if (selectedYear !== 'All') params.append('year', selectedYear);
        params.append('page', targetPage.toString());
        params.append('limit', '20');

        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error('Search failed');
        const data: UnifiedSearchResponse = await res.json();
        setSearchResponse(data);
        setCurrentPage(data.page || targetPage);
      } catch (err) {
        console.error('Search request failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [query, activeType, selectedBoard, selectedClass, selectedSubject, selectedChapter, selectedYear]
  );

  // Trigger search on filter changes or query debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [performSearch]);

  const handleResetFilters = () => {
    setQuery('');
    setActiveType('all');
    setSelectedBoard('All');
    setSelectedClass('All');
    setSelectedSubject('All');
    setSelectedChapter('All');
    setSelectedYear('All');
    setCurrentPage(1);
  };

  const handleItemClick = (item: UnifiedSearchResultItem) => {
    switch (item.type) {
      case 'test':
        if (onSelectTest) {
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
            negativeMarking: item.meta?.negativeMarking || false,
            passPercentage: 50,
            status: (item.status === 'Draft' ? 'Draft' : 'Published') as 'Draft' | 'Published',
            questions: [],
          });
        } else if (onNavigate) {
          onNavigate('tests', item.id);
        }
        break;

      case 'mcq':
        if (onSelectMCQ) {
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
        } else if (onNavigate) {
          onNavigate('mcqs', item.subject);
        }
        break;

      case 'past_paper':
        if (onSelectPastPaper) {
          onSelectPastPaper({
            id: item.id,
            title: item.title,
            board: item.board || 'BISE Lahore',
            classLevel: item.classLevel || 'Class 10',
            subject: item.subject || 'General',
            year: item.year || 2024,
            type: item.meta?.type || 'Objective (MCQs)',
            totalQuestions: 20,
            totalMarks: 20,
            questionsCount: item.meta?.totalQuestions || 20,
            downloadUrl: item.url,
            status: item.status,
            version: 1,
            brandingStatus: 'Branded',
            downloadsCount: item.meta?.downloadsCount || 0,
          });
        } else if (onNavigate) {
          onNavigate('past-papers', item.subject);
        }
        break;

      case 'study_note':
        if (onSelectNote) {
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
        } else if (onNavigate) {
          onNavigate('notes', item.subject);
        }
        break;

      case 'document':
        if (item.url) {
          window.open(item.url, '_blank');
        }
        break;

      case 'board':
        if (onNavigate) onNavigate('boards', item.title);
        break;

      case 'class':
        if (onNavigate) onNavigate('classes', item.title);
        break;

      case 'subject':
        if (onNavigate) onNavigate('subjects', item.title);
        break;

      default:
        break;
    }
  };

  const contentTabs: Array<{ id: SearchContentType; label: string; count?: number }> = [
    { id: 'all', label: 'All Content', count: searchResponse.countsByCategory?.all },
    { id: 'mcqs', label: 'MCQs', count: searchResponse.countsByCategory?.mcqs },
    { id: 'tests', label: 'Tests', count: searchResponse.countsByCategory?.tests },
    { id: 'past_papers', label: 'Past Papers', count: searchResponse.countsByCategory?.past_papers },
    { id: 'study_notes', label: 'Study Notes', count: searchResponse.countsByCategory?.study_notes },
    { id: 'documents', label: 'Documents', count: searchResponse.countsByCategory?.documents },
    { id: 'curriculum', label: 'Curriculum', count: searchResponse.countsByCategory?.curriculum },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Search Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Educational Search & Discovery
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Explore verified MCQs, online tests, solved past papers, study notes, and syllabus documents.
              </p>
            </div>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-cyan-400 rounded-xl font-medium text-sm self-start"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{showMobileFilters ? 'Hide Filters' : 'Show Filters'}</span>
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by topic, subject, chapter, board, year or question..."
              className="w-full pl-11 pr-24 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-base transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-12 flex items-center pr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => performSearch(1)}
              className="absolute inset-y-1.5 right-1.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Search</span>
            </button>
          </div>

          {/* Content Type Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
            {contentTabs.map((tab) => {
              const isActive = activeType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveType(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-blue-700 text-blue-100'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Sidebar Filters + Results */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Cascading Filter Sidebar */}
          <div
            className={`lg:block ${
              showMobileFilters ? 'block' : 'hidden'
            } bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 h-fit`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                <Filter className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                <span>Filters</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* 1. Board Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Examination Board
              </label>
              <select
                value={selectedBoard}
                onChange={(e) => {
                  setSelectedBoard(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">All Boards</option>
                {filterOptions.boards.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Class / Grade Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Class / Grade
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">All Classes</option>
                {filterOptions.classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Subject Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">All Subjects</option>
                {filterOptions.subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Chapter Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => {
                  setSelectedChapter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">All Chapters</option>
                {filterOptions.chapters.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Year Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Examination Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">All Years</option>
                {filterOptions.years.map((y) => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 px-1">
              <span>
                {isLoading
                  ? 'Searching verified database...'
                  : `Found ${searchResponse.total} verified result${searchResponse.total === 1 ? '' : 's'}`}
              </span>
              {!isLoading && searchResponse.total > 0 && (
                <span>
                  Page {searchResponse.page} of {searchResponse.totalPages}
                </span>
              )}
            </div>

            {/* Skeleton Loading State */}
            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
                  >
                    <div className="flex gap-2">
                      <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                      <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    </div>
                    <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && searchResponse.results.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-cyan-400 mx-auto flex items-center justify-center">
                  <Search className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    No results found
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    We couldn't find any content matching your search terms and filters. Try adjusting your query or resetting filters.
                  </p>
                </div>

                {searchResponse.suggestions && searchResponse.suggestions.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Suggested Topics & Searches</span>
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {searchResponse.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setQuery(suggestion);
                            setCurrentPage(1);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-300 text-xs font-medium transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}

            {/* Results List */}
            {!isLoading && searchResponse.results.length > 0 && (
              <div className="space-y-3">
              {searchResponse.results.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleItemClick(item)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-xs hover:shadow-md cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-cyan-300">
                        {item.badge || item.type}
                      </span>
                      {item.subject && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.subject}
                        </span>
                      )}
                      {item.classLevel && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                          {item.classLevel}
                        </span>
                      )}
                      {item.board && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400">
                          {item.board}
                        </span>
                      )}
                      {item.year && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                          {item.year}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                      {item.title}
                    </h3>

                    {/* Subtitle & Description */}
                    {item.subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.subtitle}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Right Action Button */}
                  <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                    {item.type === 'test' && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold group-hover:bg-blue-700 shadow-xs">
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Test</span>
                      </span>
                    )}
                    {item.type === 'past_paper' && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold group-hover:bg-emerald-700 shadow-xs">
                        <Download className="w-3.5 h-3.5" />
                        <span>View Paper</span>
                      </span>
                    )}
                    {item.type === 'study_note' && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold group-hover:bg-purple-700 shadow-xs">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read Note</span>
                      </span>
                    )}
                    {item.type === 'mcq' && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold group-hover:bg-indigo-700 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Practice</span>
                      </span>
                    )}
                    {item.type === 'document' && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-700 text-white rounded-xl text-xs font-semibold group-hover:bg-slate-800 shadow-xs">
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </span>
                    )}
                    {(item.type === 'board' || item.type === 'class' || item.type === 'subject' || item.type === 'chapter') && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold group-hover:bg-slate-200 dark:group-hover:bg-slate-700">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Explore</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}

            {/* Pagination Controls */}
            {searchResponse.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => performSearch(currentPage - 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, searchResponse.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => performSearch(pageNum)}
                        className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {searchResponse.totalPages > 5 && (
                    <span className="px-2 text-slate-400">...</span>
                  )}
                </div>

                <button
                  disabled={currentPage >= searchResponse.totalPages}
                  onClick={() => performSearch(currentPage + 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
