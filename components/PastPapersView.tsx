import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Download,
  Play,
  Search,
  Filter,
  Calendar,
  Landmark,
  BookOpen,
  ShieldCheck,
  CheckCircle,
  Eye,
  Sparkles,
  X,
  FileCheck,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PastPaper, MCQ } from '../types';
import { PAKISTAN_BOARDS, ACADEMIC_CLASSES, ACADEMIC_SUBJECTS } from '../data/educationalHierarchy';
import { PAST_PAPERS_DATA } from '../data/mockData';
import { documentBrandingService } from '../services/documentBrandingService';

export interface PastPapersViewProps {
  pastPapers?: PastPaper[];
  papers?: PastPaper[];
  onSolvePaper?: (paper: PastPaper) => void;
  onSolveOnline?: (paper: PastPaper) => void;
  studentName?: string;
  initialSubject?: string;
  initialBoard?: string;
  initialClass?: string;
  subFilter?: string;
  allMCQs?: MCQ[];
  onNavigate?: (view: string, filter?: string) => void;
}

export const PastPapersView: React.FC<PastPapersViewProps> = (props) => {
  const {
    pastPapers,
    papers,
    onSolvePaper,
    onSolveOnline,
    studentName = 'Student',
    initialSubject = 'All',
    initialBoard = 'All',
    initialClass = 'All',
    subFilter,
  } = props;

  // Safe past papers source
  const safePapers: PastPaper[] = useMemo(() => {
    if (Array.isArray(pastPapers) && pastPapers.length > 0) return pastPapers;
    if (Array.isArray(papers) && papers.length > 0) return papers;
    if (Array.isArray(PAST_PAPERS_DATA)) return PAST_PAPERS_DATA;
    return [];
  }, [pastPapers, papers]);

  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedBoard, setSelectedBoard] = useState<string>(initialBoard);
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize incoming subFilter / initialSubject
  useEffect(() => {
    const raw = (subFilter || initialSubject || '').trim();
    if (!raw || raw.toLowerCase() === 'all') return;

    const lower = raw.toLowerCase();

    // Check if it's a province
    const provs = ['punjab', 'federal', 'sindh', 'kpk', 'balochistan', 'ajk'];
    const matchedProv = provs.find((p) => p === lower);
    if (matchedProv) {
      const formatted = matchedProv.toUpperCase() === 'KPK' ? 'KPK' :
                        matchedProv.toUpperCase() === 'AJK' ? 'AJK' :
                        matchedProv.charAt(0).toUpperCase() + matchedProv.slice(1);
      setSelectedProvince(formatted);
      return;
    }

    // Check if it matches an academic subject
    const matchedSubj = ACADEMIC_SUBJECTS.find(
      (s) => s.name.toLowerCase() === lower || s.id.toLowerCase() === lower
    );
    if (matchedSubj) {
      setSelectedSubject(matchedSubj.name);
      return;
    }

    // Check if it matches a class
    const matchedClass = ACADEMIC_CLASSES.find(
      (c) => c.name.toLowerCase() === lower || c.id.toLowerCase() === lower
    );
    if (matchedClass) {
      setSelectedClass(matchedClass.name);
      return;
    }

    // Check if it matches a board
    const matchedBoard = PAKISTAN_BOARDS.find(
      (b) => b.name.toLowerCase().includes(lower) || b.id.toLowerCase().includes(lower) || (b.code && b.code.toLowerCase() === lower)
    );
    if (matchedBoard) {
      setSelectedBoard(matchedBoard.name);
      setSelectedProvince(matchedBoard.province);
      return;
    }

    // Otherwise use as search query
    setSearchQuery(raw);
  }, [subFilter, initialSubject]);

  // Preview Modal
  const [previewPaper, setPreviewPaper] = useState<PastPaper | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  const years = ['All', '2024', '2023', '2022', '2021', '2020'];
  const provinces = ['All', 'Punjab', 'Federal', 'Sindh', 'KPK', 'Balochistan', 'AJK'];
  const paperTypes = ['All', 'Objective (MCQs)', 'Subjective (Theory)', 'Model Paper', 'Solved Key'];

  // Board list filtered by province
  const availableBoards = useMemo(() => {
    if (selectedProvince === 'All') return PAKISTAN_BOARDS;
    return PAKISTAN_BOARDS.filter((b) => b.province === selectedProvince);
  }, [selectedProvince]);

  const filteredPapers = useMemo(() => {
    if (!Array.isArray(safePapers)) return [];

    return safePapers.filter((p) => {
      const matchesProv =
        selectedProvince === 'All' ||
        (p.province && p.province.toLowerCase() === selectedProvince.toLowerCase()) ||
        (selectedProvince === 'Punjab' && p.board.toLowerCase().includes('lahore')) ||
        (selectedProvince === 'Federal' && p.board.toLowerCase().includes('fbise'));

      const matchesBoard =
        selectedBoard === 'All' ||
        p.board.toLowerCase().includes(selectedBoard.toLowerCase()) ||
        p.board === 'All';

      const matchesClass =
        selectedClass === 'All' ||
        (p.classLevel && p.classLevel.toLowerCase().includes(selectedClass.toLowerCase()));

      const matchesSubject =
        selectedSubject === 'All' ||
        (p.subject && p.subject.toLowerCase() === selectedSubject.toLowerCase());

      const matchesYear =
        selectedYear === 'All' || (p.year && p.year.toString() === selectedYear);

      const matchesType =
        selectedType === 'All' ||
        (p.type && p.type.toLowerCase().includes(selectedType.toLowerCase()));

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        p.title.toLowerCase().includes(query) ||
        p.board.toLowerCase().includes(query) ||
        p.subject.toLowerCase().includes(query) ||
        (p.classLevel && p.classLevel.toLowerCase().includes(query)) ||
        (p.year && p.year.toString().includes(query));

      return (
        matchesProv &&
        matchesBoard &&
        matchesClass &&
        matchesSubject &&
        matchesYear &&
        matchesType &&
        matchesSearch
      );
    });
  }, [
    safePapers,
    selectedProvince,
    selectedBoard,
    selectedClass,
    selectedSubject,
    selectedYear,
    selectedType,
    searchQuery,
  ]);

  const handleDownloadPDF = async (paper: PastPaper) => {
    try {
      setDownloadSuccessId(paper.id);
      await documentBrandingService.downloadPastPaper(paper, { studentName });
    } catch (err) {
      console.error('[PastPapersView] Failed to download paper:', err);
    } finally {
      setTimeout(() => setDownloadSuccessId(null), 3000);
    }
  };

  const handleSolve = (paper: PastPaper) => {
    if (onSolvePaper) {
      onSolvePaper(paper);
    } else if (onSolveOnline) {
      onSolveOnline(paper);
    }
  };

  const handleResetFilters = () => {
    setSelectedProvince('All');
    setSelectedBoard('All');
    setSelectedClass('All');
    setSelectedSubject('All');
    setSelectedYear('All');
    setSelectedType('All');
    setSearchQuery('');
    setError(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Loading past papers archive...
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 shadow-xl space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Unable to load past papers</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unable to load past papers. Please try again.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-300 border border-white/10 mb-3">
            <FileText className="w-3.5 h-3.5" /> 10-Year Solved & Unsolved Past Papers
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Pakistan National Past Papers Archive
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-2 leading-relaxed">
            Download verified past papers with authentic answer keys and solutions, or practice them interactively as timed online mock exams for all Pakistani education boards.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs space-y-1.5 shrink-0">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <ShieldCheck className="w-4 h-4" /> Board Verified Material
          </div>
          <p className="text-emerald-200 text-[11px] leading-relaxed max-w-xs">
            Every PDF downloaded is automatically stamped with TaleemGuru official attribution and detailed explanations.
          </p>
        </div>
      </div>

      {/* Cascading Filter Bar (Province -> Board -> Class -> Subject -> Year -> Type) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past papers by keyword, board, year, or subject (e.g., Lahore 2024 Physics, Federal Class 10 Chemistry)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        {/* Cascading Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Province */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Province / Region
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setSelectedBoard('All');
              }}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Board */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Education Board
            </label>
            <select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="All">All Boards</option>
              {availableBoards.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name} {b.code ? `(${b.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Class Grade
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="All">All Classes</option>
              {ACADEMIC_CLASSES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="All">All Subjects</option>
              {ACADEMIC_SUBJECTS.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Examination Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Paper Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Paper Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {paperTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter summary bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500 font-medium">
            Showing <strong className="text-slate-900 dark:text-white">{filteredPapers.length}</strong> of{' '}
            <strong className="text-slate-900 dark:text-white">{safePapers.length}</strong> past papers
          </span>
          {(selectedProvince !== 'All' ||
            selectedBoard !== 'All' ||
            selectedClass !== 'All' ||
            selectedSubject !== 'All' ||
            selectedYear !== 'All' ||
            selectedType !== 'All' ||
            searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Papers Grid or Empty State */}
      {filteredPapers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
          <FileText className="w-12 h-12 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              No past papers available yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              No past papers matched your selected filters or search keyword. You can reset filters to browse the complete national archive.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPapers.map((paper) => (
            <div
              key={paper.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-extrabold bg-slate-900 text-white px-2.5 py-0.5 rounded-lg">
                      {paper.year}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {paper.board}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {paper.questionsCount || 12} MCQs
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white mt-3 leading-snug">
                  {paper.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {paper.description ||
                    `${paper.classLevel} ${paper.subject} solved past examination paper for ${paper.board} with answer explanations.`}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    {paper.classLevel}
                  </span>
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    {paper.subject}
                  </span>
                  {paper.paperGroup && (
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                      {paper.paperGroup}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewPaper(paper)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Details</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadPDF(paper)}
                    disabled={downloadSuccessId === paper.id}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Download branded PDF"
                  >
                    {downloadSuccessId === paper.id ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Download className="w-4 h-4 text-emerald-600" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSolve(paper)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Solve Online</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paper Detailed Preview Modal */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                  {previewPaper.board} • {previewPaper.year}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {previewPaper.title}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {previewPaper.subject} • {previewPaper.classLevel} • {previewPaper.paperGroup || 'Annual'}
                </div>
              </div>
              <button
                onClick={() => setPreviewPaper(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Official Examination Details:
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {previewPaper.description ||
                  `Official ${previewPaper.year} ${previewPaper.board} question paper with complete answers, marking scheme, and detailed step-by-step solutions.`}
              </p>
              <div className="pt-2 flex flex-wrap gap-3 text-[11px] text-slate-500 font-semibold">
                <span>Total Questions: {previewPaper.questionsCount || 12}</span>
                <span>•</span>
                <span>Type: {previewPaper.type}</span>
                <span>•</span>
                <span>Status: Verified Board Solved</span>
              </div>
            </div>

            {/* Questions Sample Preview */}
            {previewPaper.questions && previewPaper.questions.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sample MCQs from this Paper:
                </div>
                {previewPaper.questions.slice(0, 3).map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                  >
                    <div className="font-bold text-slate-900 dark:text-white">
                      Q{idx + 1}. {q.question}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`p-1.5 rounded-lg border ${
                            optIdx === q.correctAnswer
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setPreviewPaper(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(previewPaper)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => {
                    handleSolve(previewPaper);
                    setPreviewPaper(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Solve Online</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
