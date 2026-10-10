import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  MapPin,
  Calendar,
  FileText,
  Clock,
  ExternalLink,
  Search,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Download,
  BookOpen,
  GraduationCap,
  Sparkles,
  RotateCcw,
  AlertCircle,
  Loader2,
  Layers,
} from 'lucide-react';
import { BoardInfo, PastPaper, MCQ, TestConfig } from '../types';
import { BOARDS_LIST, PAST_PAPERS_DATA } from '../data/mockData';
import { fetchAcademicBoardsApi } from '../lib/api';
import { documentBrandingService } from '../services/documentBrandingService';
import { useSiteSettings } from '../context/SiteSettingsContext';

export interface BoardsViewProps {
  pastPapers?: PastPaper[];
  papers?: PastPaper[];
  onSelectBoardTest?: (boardName: string) => void;
  onStartBoardTest?: (boardName: string) => void;
  onSelectPaper?: (paper: PastPaper) => void;
  onSolveOnline?: (paper: PastPaper) => void;
  onNavigateMCQBank?: (boardName: string) => void;
  onNavigatePastPapers?: (boardName: string) => void;
  onNavigateSyllabus?: (boardName: string) => void;
  allMCQs?: MCQ[];
  studentName?: string;
  initialProvince?: string;
  subFilter?: string;
}

export const BOARD_CATEGORIES = [
  { id: 'All', label: 'All Boards' },
  { id: 'Punjab', label: 'Punjab Board' },
  { id: 'Federal', label: 'Federal Board (FBISE)' },
  { id: 'Sindh', label: 'Sindh Board' },
  { id: 'KPK', label: 'KPK Board' },
  { id: 'Balochistan', label: 'Balochistan Board' },
  { id: 'AJK', label: 'AJK Board' },
];

export const BoardsView: React.FC<BoardsViewProps> = (props) => {
  const { siteName } = useSiteSettings();
  const {
    pastPapers,
    papers,
    onSelectBoardTest,
    onStartBoardTest,
    onSelectPaper,
    onSolveOnline,
    onNavigateMCQBank,
    onNavigatePastPapers,
    onNavigateSyllabus,
    studentName = 'Student',
    initialProvince = 'All',
    subFilter,
  } = props;

  // Safe fallback past papers array
  const safePapers: PastPaper[] = useMemo(() => {
    if (Array.isArray(pastPapers) && pastPapers.length > 0) return pastPapers;
    if (Array.isArray(papers) && papers.length > 0) return papers;
    if (Array.isArray(PAST_PAPERS_DATA)) return PAST_PAPERS_DATA;
    return [];
  }, [pastPapers, papers]);

  // Normalize province from subFilter or initialProvince
  const normalizeProvince = (input?: string): string => {
    if (!input || input.toLowerCase() === 'all') return 'All';
    const match = BOARD_CATEGORIES.find(
      (c) => c.id.toLowerCase() === input.toLowerCase() || c.label.toLowerCase().includes(input.toLowerCase())
    );
    if (match) return match.id;
    if (input.toLowerCase() === 'fbise') return 'Federal';
    return input;
  };

  const [selectedProvince, setSelectedProvince] = useState<string>(() =>
    normalizeProvince(subFilter || initialProvince)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [allBoardsList, setAllBoardsList] = useState<BoardInfo[]>(BOARDS_LIST || []);

  useEffect(() => {
    fetchAcademicBoardsApi()
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: BoardInfo[] = res.data.map((b: any) => ({
            id: String(b.id),
            name: b.name,
            code: b.code || (b.name.split(' ').pop() || 'BISE'),
            province: (b.province as any) || 'Punjab',
            city: b.city || b.name,
            established: b.establishmentYear ? String(b.establishmentYear) : '1975',
            description: b.description || `${b.name} Education Board`,
            totalPastPapers: 120,
            totalTests: 45,
            website: b.city ? `https://bisepak.edu.pk` : 'https://fbise.edu.pk',
            supportedClasses: ['9th', '10th', '11th', '12th'],
          }));
          setAllBoardsList(mapped);
        }
      })
      .catch((err) => {
        console.warn('Notice: Could not load dynamic boards in BoardsView:', err);
      });
  }, []);

  // Sync province when subFilter or initialProvince changes
  useEffect(() => {
    const nextProv = normalizeProvince(subFilter || initialProvince);
    setSelectedProvince(nextProv);
  }, [subFilter, initialProvince]);

  // Filter boards by province and search term
  const filteredBoards = useMemo(() => {
    try {
      if (!Array.isArray(allBoardsList)) return [];
      return allBoardsList.filter((b) => {
        const matchesProvince = selectedProvince === 'All' || b.province === selectedProvince;
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          b.name.toLowerCase().includes(query) ||
          b.city.toLowerCase().includes(query) ||
          (b.code && b.code.toLowerCase().includes(query)) ||
          b.province.toLowerCase().includes(query);
        return matchesProvince && matchesSearch;
      });
    } catch (err) {
      console.error('[BoardsView] Error filtering boards:', err);
      return [];
    }
  }, [allBoardsList, selectedProvince, searchQuery]);

  // Active selected board
  const [activeBoard, setActiveBoard] = useState<BoardInfo | null>(() => {
    return filteredBoards.length > 0 ? filteredBoards[0] : (BOARDS_LIST?.[0] || null);
  });

  // Ensure activeBoard stays synchronized when filteredBoards change
  useEffect(() => {
    if (filteredBoards.length > 0) {
      if (!activeBoard || !filteredBoards.some((b) => b.id === activeBoard.id)) {
        setActiveBoard(filteredBoards[0]);
      }
    } else {
      setActiveBoard(null);
    }
  }, [filteredBoards, activeBoard]);

  // Filter papers for active board strictly (matching province and board name/city/code)
  const boardPapers = useMemo(() => {
    if (!activeBoard || !Array.isArray(safePapers)) return [];
    const boardNameLower = activeBoard.name.toLowerCase();
    const cityLower = activeBoard.city ? activeBoard.city.toLowerCase() : '';
    const codeLower = activeBoard.code ? activeBoard.code.toLowerCase() : '';
    const boardProvinceLower = activeBoard.province.toLowerCase();

    return safePapers.filter((p) => {
      const pBoard = p.board ? p.board.toLowerCase() : '';
      const pProv = p.province ? p.province.toLowerCase() : '';
      const pTitle = p.title ? p.title.toLowerCase() : '';

      // Province must match strictly (Punjab boards get Punjab papers only, etc.)
      if (pProv !== boardProvinceLower) return false;

      // Board identifier must match
      return (
        pBoard.includes(boardNameLower) ||
        pTitle.includes(boardNameLower) ||
        (cityLower && (pBoard.includes(cityLower) || pTitle.includes(cityLower))) ||
        (codeLower && (pBoard.includes(codeLower) || pTitle.includes(codeLower)))
      );
    });
  }, [activeBoard, safePapers]);

  // Helper to count papers strictly matching any board
  const getStrictPapersCount = (board: BoardInfo): number => {
    if (!Array.isArray(safePapers)) return 0;
    const boardNameLower = board.name.toLowerCase();
    const cityLower = board.city ? board.city.toLowerCase() : '';
    const codeLower = board.code ? board.code.toLowerCase() : '';
    const boardProvinceLower = board.province.toLowerCase();

    return safePapers.filter((p) => {
      const pBoard = p.board ? p.board.toLowerCase() : '';
      const pProv = p.province ? p.province.toLowerCase() : '';
      const pTitle = p.title ? p.title.toLowerCase() : '';

      if (pProv !== boardProvinceLower) return false;

      return (
        pBoard.includes(boardNameLower) ||
        pTitle.includes(boardNameLower) ||
        (cityLower && (pBoard.includes(cityLower) || pTitle.includes(cityLower))) ||
        (codeLower && (pBoard.includes(codeLower) || pTitle.includes(codeLower)))
      );
    }).length;
  };

  // Unified callback triggers
  const handleBoardTest = (boardName: string) => {
    if (onSelectBoardTest) {
      onSelectBoardTest(boardName);
    } else if (onStartBoardTest) {
      onStartBoardTest(boardName);
    }
  };

  const handleSelectPaper = (paper: PastPaper) => {
    if (onSelectPaper) {
      onSelectPaper(paper);
    } else if (onSolveOnline) {
      onSolveOnline(paper);
    }
  };

  // Download PDF with TaleemGuru permanent branding & attribution
  const handleDownloadPaper = async (paper: PastPaper) => {
    try {
      setDownloadingId(paper.id);
      await documentBrandingService.downloadPastPaper(paper, { studentName });
    } catch (err) {
      console.error('[BoardsView] Failed to download paper:', err);
    } finally {
      setTimeout(() => setDownloadingId(null), 1500);
    }
  };

  // Clear filters helper
  const handleResetFilters = () => {
    setSelectedProvince('All');
    setSearchQuery('');
    setError(null);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Loading education boards...
          </span>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 shadow-xl space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Unable to load boards</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unable to load boards. Please try again.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_50%)] pointer-events-none" />
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-cyan-300 border border-white/10 mb-3 backdrop-blur-md">
            <Landmark className="w-3.5 h-3.5" /> All Pakistan Intermediate & Secondary Education Boards
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Pakistan Education Boards Portal
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Access official board past papers, model question papers, pairing schemes, and chapter tests for
            Punjab Board, Federal Board (FBISE), Sindh Board, KPK Board, Balochistan Board, and AJK Board.
          </p>
        </div>
      </div>

      {/* Board Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs scrollbar-none">
        {BOARD_CATEGORIES.map((cat) => {
          const isCatSelected = selectedProvince === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedProvince(cat.id)}
              className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isCatSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Boards List + Board Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Boards Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-3 max-h-[800px] overflow-y-auto pr-1">
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search board by name or city (e.g., Lahore, Federal, Karachi, Peshawar, Mirpur)..."
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-2xl text-xs border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {filteredBoards.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <Landmark className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                No boards available yet
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                No educational boards matched "{searchQuery}" in {selectedProvince === 'All' ? 'any region' : selectedProvince}.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          ) : (
            filteredBoards.map((board) => {
              const isSelected = activeBoard?.id === board.id;
              return (
                <div
                  key={board.id}
                  onClick={() => setActiveBoard(board)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-slate-800/90 border-blue-500 shadow-md ring-1 ring-blue-400/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {board.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {board.province}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{board.city || board.name}</span>
                        {board.code && <span>• Code: {board.code}</span>}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="p-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span>{getStrictPapersCount(board)} Solved Papers</span>
                    <button
                      onClick={() => onNavigateSyllabus?.(board.name)}
                      className="text-blue-600 dark:text-cyan-400 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                    >
                      View Syllabus <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Board Detail Workspace (7 cols) */}
        <div className="lg:col-span-7">
          {activeBoard ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6">
              {/* Board Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md mb-2">
                    <GraduationCap className="w-3.5 h-3.5" /> Official Education Board
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {activeBoard.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {activeBoard.city}, {activeBoard.province}
                    </span>
                    {activeBoard.established && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Est. {activeBoard.established}
                      </span>
                    )}
                    {activeBoard.website && (
                      <a
                        href={activeBoard.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-1 text-blue-600 dark:text-cyan-400 hover:underline font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" /> Official Website
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleBoardTest(activeBoard.name)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Start Board Test</span>
                  </button>
                  {onNavigatePastPapers && (
                    <button
                      onClick={() => onNavigatePastPapers(activeBoard.name)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>All Past Papers</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              {activeBoard.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {activeBoard.description}
                </p>
              )}

              {/* Board Statistics Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {boardPapers.length}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Solved Papers</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-lg font-black text-blue-600 dark:text-cyan-400">
                    {activeBoard.totalTests || 150}+
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Mock Exams</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-lg font-black text-slate-900 dark:text-white">9 to 12</div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Classes Covered</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">100%</div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Free Access</span>
                </div>
              </div>

              {/* Class Quick Selection */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
                  Select Class Syllabus for {activeBoard.name}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Class 9', 'Class 10', 'Class 11', 'Class 12'].map((cls) => (
                    <button
                      key={cls}
                      onClick={() => handleBoardTest(`${activeBoard.name} ${cls}`)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center transition-all group cursor-pointer"
                    >
                      <div className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400">
                        {cls}
                      </div>
                      <span className="text-[10px] text-slate-500">Solved Papers & MCQs</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Solved Past Papers Listing */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Solved Board Past Papers ({boardPapers.length} Available)
                  </h3>
                  {onNavigatePastPapers && (
                    <button
                      onClick={() => onNavigatePastPapers(activeBoard.name)}
                      className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline"
                    >
                      Browse Full Archive →
                    </button>
                  )}
                </div>

                {boardPapers.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="text-xs text-slate-500">
                      Full model papers for {activeBoard.name} are loaded in the Online Examination Engine.
                    </p>
                    <button
                      onClick={() => handleBoardTest(activeBoard.name)}
                      className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      Launch Online Assessment Series →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {boardPapers.map((paper) => (
                      <div
                        key={paper.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white leading-snug">
                            {paper.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {paper.classLevel} • {paper.subject}
                            </span>
                            <span>•</span>
                            <span className="font-mono">{paper.year}</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              Verified Solved
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => handleDownloadPaper(paper)}
                            disabled={downloadingId === paper.id}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title={`Download PDF with permanent ${siteName} branding`}
                          >
                            {downloadingId === paper.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                            ) : (
                              <Download className="w-3 h-3 text-emerald-600" />
                            )}
                            <span>PDF</span>
                          </button>

                          <button
                            onClick={() => handleSelectPaper(paper)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-colors cursor-pointer"
                          >
                            Solve Online
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <Landmark className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Select an Education Board
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Choose an education board from the list on the left to view syllabus information, solved papers, and online practice tests.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
