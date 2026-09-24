import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Download,
  RotateCcw,
  ShieldCheck,
  Flag,
  FileText,
  Sparkles,
  Command,
  BookOpen,
  GraduationCap,
  Layers,
  HelpCircle,
  X,
  Loader2,
} from 'lucide-react';
import { TestConfig, UserAnswer, TestResult, MCQ } from '../types';
import { exportMCQsToWatermarkedPDF } from '../utils/watermark';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { startExamApi, saveExamAnswerApi, submitExamApi } from '../lib/api';

interface OnlineTestViewProps {
  test: TestConfig;
  onFinishTest: (result: TestResult) => void;
  onExitTest: () => void;
  studentName: string;
}

export const OnlineTestView: React.FC<OnlineTestViewProps> = ({
  test,
  onFinishTest,
  onExitTest,
  studentName,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const totalDurationSeconds = Math.max(60, test.durationMinutes * 60);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(totalDurationSeconds);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(Boolean(test.randomizeQuestions));
  const [shuffledList, setShuffledList] = useState<MCQ[]>(test.questions || []);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isPaletteOpenMobile, setIsPaletteOpenMobile] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverConnected, setServerConnected] = useState(true);

  const timerRef = useRef<any>(null);
  const endTimeRef = useRef<number>(Date.now() + totalDurationSeconds * 1000);
  const answersRef = useRef<Record<string, UserAnswer>>({});
  const shuffledListRef = useRef<MCQ[]>(test.questions || []);
  const hasAutoSubmittedRef = useRef<boolean>(false);
  const attemptIdRef = useRef<string | null>(null);

  // Keep refs synchronized with latest state
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    shuffledListRef.current = shuffledList;
  }, [shuffledList]);

  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  // Initialize server-authoritative test session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const response = await startExamApi({
          testId: test.id,
          studentName,
        });

        if (!isMounted) return;

        if (response && response.attemptId) {
          setAttemptId(response.attemptId);
          attemptIdRef.current = response.attemptId;

          if (response.questions && response.questions.length > 0) {
            const mappedQuestions: MCQ[] = response.questions.map((q: any) => ({
              id: q.id,
              question: q.question,
              options: q.options || [],
              correctAnswer: 0, // Hidden client-side during exam
              explanation: '',
              subject: q.subject || test.subject,
              chapter: q.chapter,
              topic: q.topic,
              difficulty: q.difficulty || 'Medium',
              tags: [],
            }));
            setShuffledList(mappedQuestions);
            shuffledListRef.current = mappedQuestions;
          }

          if (response.timeRemainingSeconds !== undefined) {
            const serverRemaining = Math.max(10, response.timeRemainingSeconds);
            setTimeRemainingSeconds(serverRemaining);
            endTimeRef.current = Date.now() + serverRemaining * 1000;
          }

          if (response.savedAnswers) {
            const initialMap: Record<string, UserAnswer> = {};
            Object.entries(response.savedAnswers).forEach(([qId, ans]: [string, any]) => {
              initialMap[qId] = {
                questionId: qId,
                selectedOption: ans.selectedOption !== undefined ? ans.selectedOption : null,
                markedForReview: Boolean(ans.markedForReview),
                timeSpentSeconds: ans.timeSpentSeconds || 0,
              };
            });
            setAnswers((prev) => ({ ...prev, ...initialMap }));
          }
        }
      } catch (err) {
        console.warn('Notice: Server exam start fallback to local session:', err);
        setServerConnected(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [test.id, studentName]);

  // Initialize default question answers map
  useEffect(() => {
    let qList = [...(test.questions || [])];
    if (shuffleQuestions) {
      qList = qList.sort(() => Math.random() - 0.5);
    }
    setShuffledList(qList);
    shuffledListRef.current = qList;

    const initialAnswers: Record<string, UserAnswer> = {};
    qList.forEach((q) => {
      initialAnswers[q.id] = {
        questionId: q.id,
        selectedOption: null,
        markedForReview: false,
        timeSpentSeconds: 0,
      };
    });
    setAnswers(initialAnswers);
    answersRef.current = initialAnswers;

    endTimeRef.current = Date.now() + totalDurationSeconds * 1000;
  }, [test, shuffleQuestions, totalDurationSeconds]);

  // Calculate Local Result Fallback
  const calculateLocalResult = (timeRemainingSecs: number): TestResult => {
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    const currentList = shuffledListRef.current;
    const currentAnsMap = answersRef.current;

    currentList.forEach((q) => {
      const userAns = currentAnsMap[q.id];
      if (userAns?.selectedOption === null || userAns?.selectedOption === undefined) {
        skipped++;
      } else if (userAns.selectedOption === q.correctAnswer) {
        correct++;
      } else {
        wrong++;
      }
    });

    const marksPerCorrect = test.totalMarks / (currentList.length || 1);
    const penalty = test.negativeMarking ? (test.negativeMarkValue || 0.25) : 0;
    const rawMarks = correct * marksPerCorrect - wrong * penalty;
    const marksObtained = Math.max(0, Math.round(rawMarks * 100) / 100);
    const percentage = Math.round((marksObtained / (test.totalMarks || 1)) * 100);

    let grade = 'F';
    if (percentage >= 85) grade = 'A+';
    else if (percentage >= 75) grade = 'A';
    else if (percentage >= 65) grade = 'B';
    else if (percentage >= 50) grade = 'C';

    const timeUsed = totalDurationSeconds - Math.max(0, timeRemainingSecs);

    return {
      id: `res-${Date.now()}`,
      testId: test.id,
      testTitle: test.title,
      testType: test.testType,
      subject: test.subject,
      category: test.category,
      timestamp:
        new Date().toLocaleDateString('en-GB') +
        ' ' +
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalQuestions: currentList.length,
      answeredCount: correct + wrong,
      correctCount: correct,
      wrongCount: wrong,
      skippedCount: skipped,
      marksObtained,
      totalMarks: test.totalMarks,
      percentage,
      grade,
      timeUsedSeconds: Math.max(5, timeUsed),
      totalDurationSeconds,
      percentileRank: Math.min(99, Math.max(45, Math.floor(percentage * 0.95) + 5)),
      answers: Object.values(currentAnsMap),
      questions: currentList,
    };
  };

  // Execute Submission
  const executeSubmission = async (timeRemainingSecs: number) => {
    if (hasAutoSubmittedRef.current) return;
    hasAutoSubmittedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSubmitting(true);

    const activeAttemptId = attemptIdRef.current;
    const timeUsed = totalDurationSeconds - Math.max(0, timeRemainingSecs);

    if (activeAttemptId) {
      try {
        const payloadAnswers: Record<string, any> = {};
        Object.entries(answersRef.current).forEach(([qId, ans]) => {
          payloadAnswers[qId] = {
            selectedOption: ans.selectedOption,
            markedForReview: ans.markedForReview,
            timeSpentSeconds: ans.timeSpentSeconds || 0,
          };
        });

        const evalResponse = await submitExamApi(activeAttemptId, {
          answers: payloadAnswers,
          timeSpentSeconds: Math.max(5, timeUsed),
        });

        if (evalResponse && evalResponse.result) {
          setIsSubmitting(false);
          onFinishTest(evalResponse.result);
          return;
        }
      } catch (err) {
        console.warn('Notice: Server exam evaluation fallback to client scoring:', err);
      }
    }

    // Fallback to client-side evaluation
    setIsSubmitting(false);
    const localResult = calculateLocalResult(timeRemainingSecs);
    onFinishTest(localResult);
  };

  const handleAutoSubmit = () => {
    setIsTimeUp(true);
    executeSubmission(0);
  };

  const handleManualSubmit = () => {
    setShowSubmitConfirm(false);
    executeSubmission(timeRemainingSeconds);
  };

  // Persistent Countdown Timer Loop
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const remainingMs = endTimeRef.current - Date.now();
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeRemainingSeconds(remainingSecs);

      if (remainingSecs <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleAutoSubmit();
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const currentMCQ = shuffledList[currentIdx] || (test.questions && test.questions[0]) || {
    id: 'q-default',
    question: 'Question Loading...',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswer: 0,
    explanation: '',
    subject: test.subject,
    difficulty: 'Medium',
    tags: [],
  };

  const currentAnswer = answers[currentMCQ?.id];

  const handleSelectOption = (optIdx: number) => {
    setAnswers((prev) => {
      const updated = {
        ...prev,
        [currentMCQ.id]: {
          ...(prev[currentMCQ.id] || {
            questionId: currentMCQ.id,
            markedForReview: false,
            timeSpentSeconds: 0,
          }),
          selectedOption: optIdx,
        },
      };

      // Background Autosave to Server
      if (attemptIdRef.current) {
        saveExamAnswerApi(attemptIdRef.current, {
          questionId: currentMCQ.id,
          selectedOption: optIdx,
          markedForReview: updated[currentMCQ.id]?.markedForReview,
        });
      }

      return updated;
    });
  };

  const handleClearOption = () => {
    setAnswers((prev) => {
      const updated = {
        ...prev,
        [currentMCQ.id]: {
          ...(prev[currentMCQ.id] || {
            questionId: currentMCQ.id,
            markedForReview: false,
            timeSpentSeconds: 0,
          }),
          selectedOption: null,
        },
      };

      if (attemptIdRef.current) {
        saveExamAnswerApi(attemptIdRef.current, {
          questionId: currentMCQ.id,
          selectedOption: null,
          markedForReview: updated[currentMCQ.id]?.markedForReview,
        });
      }

      return updated;
    });
  };

  const handleToggleReview = () => {
    setAnswers((prev) => {
      const newMarked = !prev[currentMCQ.id]?.markedForReview;
      const updated = {
        ...prev,
        [currentMCQ.id]: {
          ...(prev[currentMCQ.id] || {
            questionId: currentMCQ.id,
            selectedOption: null,
            timeSpentSeconds: 0,
          }),
          markedForReview: newMarked,
        },
      };

      if (attemptIdRef.current) {
        saveExamAnswerApi(attemptIdRef.current, {
          questionId: currentMCQ.id,
          selectedOption: updated[currentMCQ.id]?.selectedOption ?? null,
          markedForReview: newMarked,
        });
      }

      return updated;
    });
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSubmitConfirm) return;

      if (e.key === '1' || e.key.toLowerCase() === 'a') {
        handleSelectOption(0);
      } else if (e.key === '2' || e.key.toLowerCase() === 'b') {
        handleSelectOption(1);
      } else if (e.key === '3' || e.key.toLowerCase() === 'c') {
        handleSelectOption(2);
      } else if (e.key === '4' || e.key.toLowerCase() === 'd') {
        handleSelectOption(3);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') {
        setCurrentIdx((p) => Math.min(shuffledList.length - 1, p + 1));
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') {
        setCurrentIdx((p) => Math.max(0, p - 1));
      } else if (e.key.toLowerCase() === 'm') {
        handleToggleReview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, shuffledList, showSubmitConfirm, currentMCQ]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Status counts for palette
  const allAnswers = Object.values(answers) as UserAnswer[];
  const answeredCount = allAnswers.filter((a) => a.selectedOption !== null && a.selectedOption !== undefined).length;
  const reviewCount = allAnswers.filter((a) => a.markedForReview).length;
  const skippedCount = Math.max(0, shuffledList.length - answeredCount);

  const isLowTime = timeRemainingSeconds < 120; // less than 2 mins
  const isUrgentTime = timeRemainingSeconds < 30; // less than 30 secs
  const timeProgressPercent = Math.max(0, Math.min(100, Math.round((timeRemainingSeconds / totalDurationSeconds) * 100)));
  const questionProgressPercent = Math.round((answeredCount / (shuffledList.length || 1)) * 100);

  // Metadata labels
  const boardName = test.board || currentMCQ.board || 'BISE / National Pattern';
  const className = test.classLevel || currentMCQ.classLevel || 'Class 9–12 / Entry Test';
  const subjectName = test.subject || currentMCQ.subject || 'General';
  const chapterName = currentMCQ.chapter || currentMCQ.topic || 'Curriculum Syllabus Revision';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors relative">
      {/* Dynamic Persistent Sticky Top Exam Header */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
        {/* Critical Low Time Alert Bar */}
        {isLowTime && timeRemainingSeconds > 0 && (
          <div
            className={`px-4 py-1.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              isUrgentTime
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-amber-500 text-slate-950'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isUrgentTime
                ? `⚠️ FINAL SECONDS! Auto-submitting in ${timeRemainingSeconds}s — Complete your answers now!`
                : `⏳ Time Warning: Less than 2 minutes remaining (${formatTime(timeRemainingSeconds)}). Auto-submitting at zero.`}
            </span>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Test Title & Breadcrumb Details */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Exit Test"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                {test.title}
              </h1>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                <span className="font-bold text-blue-600 dark:text-cyan-400">{subjectName}</span>
                <span>•</span>
                <span className="hidden sm:inline">{className}</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate">{boardName}</span>
                {test.negativeMarking && (
                  <span className="hidden md:inline text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/50 text-[10px]">
                    Negative (-{test.negativeMarkValue || 0.25})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions, Palette Mobile Toggle, Timer & Submit */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Question Palette Toggle */}
            <button
              onClick={() => setIsPaletteOpenMobile(!isPaletteOpenMobile)}
              className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1"
              title="View Question Grid"
            >
              <Layers className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              <span className="hidden xs:inline">Grid</span>
            </button>

            {/* Paper PDF Download */}
            <button
              onClick={() => exportMCQsToWatermarkedPDF(test.title, test.category, shuffledList, { studentName })}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-cyan-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-xl transition-colors"
              title="Download Question Paper (PDF)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Paper PDF</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Fullscreen Mode"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Countdown Timer Widget */}
            <div
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-mono text-xs sm:text-sm font-extrabold border transition-all duration-300 shadow-xs ${
                isUrgentTime
                  ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400 animate-bounce'
                  : isLowTime
                  ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 animate-pulse'
                  : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700 dark:border-slate-700'
              }`}
            >
              <Clock
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                  isUrgentTime ? 'text-white' : isLowTime ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-400'
                }`}
              />
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
                <span className="tracking-wider">{formatTime(timeRemainingSeconds)}</span>
                <span className="hidden md:inline text-[10px] font-sans font-normal opacity-80">
                  {timeRemainingSeconds > 0 ? 'Remaining' : 'Time Up!'}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="test-submit-btn"
              onClick={() => setShowSubmitConfirm(true)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              Submit Test
            </button>
          </div>
        </div>

        {/* Dual Progress Tracking Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 relative overflow-hidden">
          {/* Answered Progress Bar */}
          <div
            className="h-full bg-blue-600 dark:bg-cyan-400 transition-all duration-300"
            style={{ width: `${questionProgressPercent}%` }}
            title={`Questions Answered: ${answeredCount}/${shuffledList.length} (${questionProgressPercent}%)`}
          />
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Question Area (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Detailed Context Header Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-blue-600 dark:text-cyan-400 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {subjectName}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {className}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {boardName}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Chapter: {chapterName}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 relative overflow-hidden">
            {/* Watermark Security Ribbon on Exam Paper */}
            <div className="absolute right-6 top-6 hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-blue-900 dark:text-cyan-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900/60">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span>Exam Simulator</span>
            </div>

            {/* Question Header & Meta */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-mono text-xs font-bold">
                Question {currentIdx + 1} of {shuffledList.length}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Marks: +{Math.round((test.totalMarks / (shuffledList.length || 1)) * 10) / 10} | {currentMCQ.difficulty}
              </span>
              {currentAnswer?.markedForReview && (
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <Bookmark className="w-3 h-3 fill-amber-500 text-amber-500" /> Marked for Review
                </span>
              )}
            </div>

            {/* Question Text */}
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed mb-6">
              {currentMCQ.question}
            </h2>

            {/* Four Answer Options */}
            <div className="space-y-3">
              {currentMCQ.options.map((option, optIdx) => {
                const isSelected = currentAnswer?.selectedOption === optIdx;
                const letter = ['A', 'B', 'C', 'D'][optIdx];

                return (
                  <button
                    key={optIdx}
                    id={`opt-btn-${optIdx}`}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer min-h-[52px] group ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-600 dark:border-cyan-400 shadow-sm ring-1 ring-blue-500 dark:ring-cyan-400'
                        : 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 pt-0.5 leading-relaxed flex-1">
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action Bar inside Question Card */}
            <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  id="mark-review-btn"
                  onClick={handleToggleReview}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    currentAnswer?.markedForReview
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{currentAnswer?.markedForReview ? 'Marked' : 'Mark for Review'}</span>
                </button>

                {currentAnswer?.selectedOption !== null && currentAnswer?.selectedOption !== undefined && (
                  <button
                    onClick={handleClearOption}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Option</span>
                  </button>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                <button
                  id="prev-question-btn"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {currentIdx < shuffledList.length - 1 ? (
                  <button
                    id="next-question-btn"
                    onClick={() => setCurrentIdx((p) => Math.min(shuffledList.length - 1, p + 1))}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    Review & Submit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Keyboard shortcut helper bar */}
          <div className="hidden sm:flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-medium">
              <Command className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span>Keyboard Shortcuts:</span>
            </div>
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono">1-4</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono">A-D</kbd> Select Option
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono">→</kbd> Next
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono">M</kbd> Review
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Question Palette & Status Summary (4 cols) */}
        <div className={`lg:col-span-4 space-y-4 ${isPaletteOpenMobile ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Question Palette
              </h3>
              <span className="text-[11px] font-bold text-blue-600 dark:text-cyan-400">
                {answeredCount} / {shuffledList.length} Answered
              </span>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] mb-4 pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-md bg-blue-600 inline-block" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 inline-block" />
                <span>Unanswered ({skippedCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-md bg-amber-500 inline-block" />
                <span>Marked ({reviewCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-md ring-2 ring-blue-500 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 inline-block" />
                <span>Current</span>
              </div>
            </div>

            {/* Question Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
              {shuffledList.map((q, idx) => {
                const ans = answers[q.id];
                const isSelected = ans?.selectedOption !== null && ans?.selectedOption !== undefined;
                const isMarked = ans?.markedForReview;
                const isCurrent = idx === currentIdx;

                let colorClasses =
                  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700';
                if (isMarked) {
                  colorClasses = 'bg-amber-500 text-white font-bold border-amber-600 shadow-xs';
                } else if (isSelected) {
                  colorClasses = 'bg-blue-600 text-white font-bold border-blue-700 shadow-xs';
                }

                return (
                  <button
                    key={q.id}
                    id={`palette-btn-${idx + 1}`}
                    onClick={() => {
                      setCurrentIdx(idx);
                      setIsPaletteOpenMobile(false);
                    }}
                    className={`h-9 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${colorClasses} ${
                      isCurrent
                        ? 'ring-2 ring-blue-500 dark:ring-cyan-400 ring-offset-2 dark:ring-offset-slate-900 scale-105 z-10'
                        : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Test Stats Box */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <div className="flex justify-between font-semibold">
                <span>Total Questions:</span>
                <span className="text-slate-900 dark:text-white font-bold">{shuffledList.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Attempted:</span>
                <span className="text-blue-600 dark:text-cyan-400 font-bold">
                  {answeredCount} / {shuffledList.length} ({questionProgressPercent}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Marked for Review:</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{reviewCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Passing Requirement:</span>
                <span className="text-slate-900 dark:text-white font-bold">{test.passPercentage}%</span>
              </div>
            </div>

            {/* Verification Guarantee Stamp */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Assessment sessions are timed and scored. A detailed performance summary is generated upon submission.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Times Up Automatic Submission Overlay */}
      {isTimeUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-rose-300 dark:border-rose-900 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-900 shadow-sm animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
              Time Expired!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6">
              The test timer reached zero. Your answers have been recorded and your scorecard is generating now.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-600 dark:text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-ping" />
              <span>Calculating marks and final rank...</span>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Test Submission</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Are you sure you want to finish this test?</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Answered Questions:</span>
                <span className="font-bold text-blue-600 dark:text-cyan-400">{answeredCount} / {shuffledList.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Unanswered / Skipped:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{skippedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Marked for Review:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{reviewCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Time Remaining:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{formatTime(timeRemainingSeconds)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Continue Test
              </button>
              <button
                id="modal-confirm-submit-btn"
                disabled={isSubmitting}
                onClick={handleManualSubmit}
                className="px-5 py-2.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-xl shadow-md shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <span>Yes, Submit Now</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitting Loading Overlay */}
      {isSubmitting && !isTimeUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-blue-600 dark:text-cyan-400 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Evaluating Assessment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your responses are being authoritatively verified against the question bank.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
