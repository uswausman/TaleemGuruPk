import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  Eye,
  EyeOff,
  Download,
  Share2,
  Tag,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MCQ, Difficulty } from '../types';
import { exportMCQsToWatermarkedPDF, downloadTextWithWatermark } from '../utils/watermark';
import { parseNavContext, NavigationContext } from '../utils/navigationContext';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { useSiteSettings } from '../context/SiteSettingsContext';

interface MCQBankViewProps {
  mcqs?: MCQ[];
  allMCQs?: MCQ[];
  savedQuestionIds?: string[];
  onToggleSaveQuestion?: (mcqId: string) => void;
  studentName?: string;
  initialSubject?: string;
  comparisonContext?: NavigationContext | null;
}

export const MCQBankView: React.FC<MCQBankViewProps> = ({
  mcqs,
  allMCQs,
  savedQuestionIds = [],
  onToggleSaveQuestion,
  studentName = 'Student',
  initialSubject = 'All',
  comparisonContext,
}) => {
  const { siteName } = useSiteSettings();
  const effectiveMCQs = mcqs || allMCQs || [];
  const [searchQuery, setSearchQuery] = useState('');

  const initParsed = parseNavContext(initialSubject);

  const [selectedSubject, setSelectedSubject] = useState(comparisonContext?.subject || (initParsed.subject !== 'All' ? initParsed.subject : 'All'));
  const [selectedClass, setSelectedClass] = useState(comparisonContext?.classLevel || (initParsed.classLevel !== 'All' ? initParsed.classLevel : 'All'));
  const [selectedBoard, setSelectedBoard] = useState(comparisonContext?.board || (initParsed.board !== 'All' ? initParsed.board : 'All'));

  React.useEffect(() => {
    if (comparisonContext) {
      setSelectedSubject(comparisonContext.subject);
      setSelectedClass(comparisonContext.classLevel);
      setSelectedBoard(comparisonContext.board);
    } else {
      const c = parseNavContext(initialSubject);
      if (c.subject && c.subject !== 'All') setSelectedSubject(c.subject);
      if (c.classLevel && c.classLevel !== 'All') setSelectedClass(c.classLevel);
      if (c.board && c.board !== 'All') setSelectedBoard(c.board);
    }
  }, [comparisonContext, initialSubject]);
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedExam, setSelectedExam] = useState('All');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const subjects = ['All', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'Pakistan Studies', 'Islamiat', 'English', 'IQ & Intelligence', 'Current Affairs'];
  const classes = ['All', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Class 9 (Matric Pt 1)', 'Class 10 (Matric Pt 2)', 'Class 11 (FSc / ICS Pt 1)', 'Class 12 (FSc / ICS Pt 2)', 'BS / Masters'];
  const boards = ['All', 'BISE Lahore', 'BISE Rawalpindi', 'BISE Faisalabad', 'BISE Gujranwala', 'BSEK Karachi', 'FBISE Islamabad', 'UHS Lahore'];
  const exams = ['All', 'MDCAT', 'ECAT', 'CSS', 'PPSC', 'Pakistan Army', 'NTS'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  const toggleReveal = (id: string) => {
    setRevealedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyQuestion = (mcq: MCQ) => {
    const text = `Q: ${mcq.question}\n(A) ${mcq.options[0]}\n(B) ${mcq.options[1]}\n(C) ${mcq.options[2]}\n(D) ${mcq.options[3]}\nAnswer: ${mcq.options[mcq.correctAnswer]}\nSource: ${siteName} Pakistan (www.taleemguru.pk)`;
    navigator.clipboard.writeText(text);
    setCopiedId(mcq.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMCQs = useMemo(() => {
    return effectiveMCQs.filter((m) => {
      if (!m) return false;
      const qLower = (searchQuery || '').toLowerCase();
      const mQ = (m.question || '').toLowerCase();
      const mSub = (m.subject || '').toLowerCase();
      const mChap = (m.chapter || '').toLowerCase();
      const mTags = Array.isArray(m.tags) ? m.tags : [];
      const mCls = (m.classLevel || '').toLowerCase();
      const mBrd = (m.board || '').toLowerCase();

      const matchesSearch =
        !searchQuery ||
        mQ.includes(qLower) ||
        mSub.includes(qLower) ||
        mChap.includes(qLower) ||
        mTags.some((t) => (t || '').toLowerCase().includes(qLower));

      const selSub = (selectedSubject || 'All');
      const selCls = (selectedClass || 'All');
      const selBrd = (selectedBoard || 'All');

      const matchesSubject = selSub === 'All' || mSub === selSub.toLowerCase();
      const matchesClass = selCls === 'All' || mCls === selCls.toLowerCase() || mCls.includes(selCls.toLowerCase()) || selCls.toLowerCase().includes(mCls);
      const matchesBoard = selBrd === 'All' || (!m.board || mBrd === selBrd.toLowerCase() || mBrd.includes(selBrd.toLowerCase()) || selBrd.toLowerCase().includes(mBrd));
      const matchesDiff = selectedDifficulty === 'All' || m.difficulty === selectedDifficulty;
      const matchesExam = selectedExam === 'All' || m.exam === selectedExam;

      return matchesSearch && matchesSubject && matchesClass && matchesBoard && matchesDiff && matchesExam;
    });
  }, [effectiveMCQs, searchQuery, selectedSubject, selectedClass, selectedBoard, selectedDifficulty, selectedExam]);

  const totalPages = Math.ceil(filteredMCQs.length / pageSize);
  const paginatedMCQs = useMemo(() => {
    return filteredMCQs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredMCQs, currentPage, pageSize]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Pakistan Central MCQ Bank
            </h1>
            <Badge variant="blue" size="sm">
              {filteredMCQs.length} Questions
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Searchable, chapter-wise database for BISE Boards, MDCAT, ECAT, CSS, Armed Forces & Competitive Exams.
          </p>
        </div>

        {/* Download Stamped PDF of filtered MCQs */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() =>
              exportMCQsToWatermarkedPDF(
                `${selectedSubject !== 'All' ? selectedSubject : 'General'}_MCQ_Bank`,
                selectedClass !== 'All' ? selectedClass : 'All Classes',
                filteredMCQs,
                { includeAnswers: true, studentName }
              )
            }
          >
            Download MCQs (PDF)
          </Button>
        </div>
      </div>

      {/* Multi-Facet Filter Controls */}
      <Card className="p-5 sm:p-6 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by topic, chapter, keyword (e.g., Optics, Matrices, Mitochondria, Lahore Resolution)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Subject */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Class / Level</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Board */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Board</label>
            <select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {boards.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Exam */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Exam Type</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {exams.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {difficulties.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Chips & Reset */}
        {(selectedSubject !== 'All' || selectedClass !== 'All' || selectedBoard !== 'All' || selectedExam !== 'All' || selectedDifficulty !== 'All' || searchQuery) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap text-xs">
            <span className="text-slate-400 font-semibold">Active Filters:</span>
            {selectedSubject !== 'All' && <Badge variant="blue" size="xs">{selectedSubject}</Badge>}
            {selectedClass !== 'All' && <Badge variant="indigo" size="xs">{selectedClass}</Badge>}
            {selectedBoard !== 'All' && <Badge variant="amber" size="xs">{selectedBoard}</Badge>}
            {selectedExam !== 'All' && <Badge variant="purple" size="xs">{selectedExam}</Badge>}
            <button
              onClick={() => {
                setSelectedSubject('All');
                setSelectedClass('All');
                setSelectedBoard('All');
                setSelectedExam('All');
                setSelectedDifficulty('All');
                setSearchQuery('');
              }}
              className="text-blue-600 dark:text-cyan-400 hover:underline font-bold ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </Card>

      {/* MCQs List */}
      <div className="space-y-4">
        {paginatedMCQs.length === 0 && (
          <EmptyState
            title={`No data available for ${selectedBoard} • ${selectedClass} • ${selectedSubject}`}
            description={`No MCQ questions found matching Board: ${selectedBoard}, Class: ${selectedClass}, Subject: ${selectedSubject}.`}
          />
        )}

        {paginatedMCQs.map((mcq, idx) => {
          const isRevealed = revealedAnswers[mcq.id];
          const isSaved = savedQuestionIds.includes(mcq.id);
          const globalIndex = (currentPage - 1) * pageSize + idx + 1;

          return (
            <Card
              key={mcq.id}
              className="p-5 sm:p-6 space-y-4"
            >
              {/* Question Metadata */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-6 h-6 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-[11px]">
                    {globalIndex}
                  </span>
                  <Badge variant="blue" size="xs">
                    {mcq.subject}
                  </Badge>
                  {mcq.chapter && (
                    <Badge variant="slate" size="xs">
                      {mcq.chapter}
                    </Badge>
                  )}
                  {mcq.classLevel && (
                    <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                      • {mcq.classLevel}
                    </span>
                  )}
                  {mcq.board && (
                    <span className="text-slate-500 dark:text-slate-400 hidden md:inline">
                      • {mcq.board}
                    </span>
                  )}
                </div>

                {/* Right Actions: Copy & Bookmark */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopyQuestion(mcq)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Copy Question"
                  >
                    {copiedId === mcq.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onToggleSaveQuestion(mcq.id)}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      isSaved ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={isSaved ? 'Saved in Mistake Book' : 'Save Question'}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                {mcq.question}
              </h3>

              {/* 4 Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
                {mcq.options.map((opt, optIdx) => {
                  const isCorrect = optIdx === mcq.correctAnswer;
                  const showGreen = isRevealed && isCorrect;

                  return (
                    <div
                      key={optIdx}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-colors ${
                        showGreen
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-300 font-bold ring-1 ring-emerald-500'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold opacity-75">{['A', 'B', 'C', 'D'][optIdx]}.</span>
                        <span>{opt}</span>
                      </div>
                      {showGreen && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* Reveal Explanation Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="ghost"
                  size="xs"
                  leftIcon={isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  onClick={() => toggleReveal(mcq.id)}
                >
                  {isRevealed ? 'Hide Solution' : 'Show Correct Answer & Explanation'}
                </Button>

                <div className="flex items-center gap-1.5">
                  {mcq.tags.map((tg, tIdx) => (
                    <span key={tIdx} className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      #{tg}
                    </span>
                  ))}
                </div>
              </div>

              {/* Revealed Explanation Box */}
              {isRevealed && (
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-slate-800 dark:text-slate-200 space-y-1.5 animate-in fade-in duration-150">
                  <div className="font-bold text-blue-900 dark:text-cyan-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                    <span>Correct Answer: ({['A', 'B', 'C', 'D'][mcq.correctAnswer]}) {mcq.options[mcq.correctAnswer]}</span>
                  </div>
                  <p className="leading-relaxed text-slate-700 dark:text-slate-300">{mcq.explanation}</p>
                </div>
              )}
            </Card>
          );
        })}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredMCQs.length)} of {filteredMCQs.length} Questions
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-bold text-slate-800 dark:text-slate-200 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {filteredMCQs.length === 0 && (
          <EmptyState
            title="No Questions Found"
            description="No MCQs match your current filter criteria. Try searching with different keywords or clearing some filters."
            actionLabel="Reset All Filters"
            onAction={() => {
              setSelectedSubject('All');
              setSelectedClass('All');
              setSelectedBoard('All');
              setSelectedExam('All');
              setSelectedDifficulty('All');
              setSearchQuery('');
            }}
          />
        )}
      </div>
    </div>
  );
};
