import React, { useState, useMemo } from 'react';
import {
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Download,
  RotateCcw,
  Bookmark,
  ShieldCheck,
  LayoutDashboard,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  AlertTriangle,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { TestResult, MCQ } from '../types';
import { exportResultCardToPDF, exportCertificateToPDF } from '../utils/watermark';
import { Button } from './ui/Button';
import { ReportIssueModal } from './ReportIssueModal';

interface ResultModalProps {
  result: TestResult;
  studentName: string;
  onRetake: () => void;
  onClose: () => void;
  onNextQuiz?: () => void;
  onGoDashboard?: () => void;
  onSaveQuestion?: (mcqId: string) => void;
  savedQuestionIds?: string[];
}

export const ResultModal: React.FC<ResultModalProps> = ({
  result,
  studentName,
  onRetake,
  onClose,
  onNextQuiz,
  onGoDashboard,
  onSaveQuestion,
  savedQuestionIds = [],
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'wrong' | 'correct' | 'skipped'>('all');
  const [showReviewList, setShowReviewList] = useState(true);
  const [reportingQuestion, setReportingQuestion] = useState<{ id: string; subject?: string } | null>(null);

  const isPassed = result.percentage >= 50;
  const avgTimePerQuestion =
    result.totalQuestions > 0 ? Math.round(result.timeUsedSeconds / result.totalQuestions) : 0;

  // Compute Strong & Weak topics dynamically from question performance
  const topicAnalysis = useMemo(() => {
    const topicMap = new Map<string, { total: number; correct: number; wrong: number }>();

    result.questions.forEach((q) => {
      const topicName = q.chapter || q.subject || 'General Concepts';
      const existing = topicMap.get(topicName) || { total: 0, correct: 0, wrong: 0 };
      existing.total += 1;

      const userAns = result.answers.find((a) => a.questionId === q.id);
      if (userAns && userAns.selectedOption === q.correctAnswer) {
        existing.correct += 1;
      } else if (userAns && userAns.selectedOption !== null && userAns.selectedOption !== undefined) {
        existing.wrong += 1;
      }
      topicMap.set(topicName, existing);
    });

    const strong: string[] = [];
    const weak: string[] = [];

    topicMap.forEach((stats, name) => {
      const accuracy = (stats.correct / stats.total) * 100;
      if (accuracy >= 75) {
        strong.push(name);
      } else if (accuracy < 60 || stats.wrong > 0) {
        weak.push(name);
      }
    });

    return { strong, weak, list: Array.from(topicMap.entries()) };
  }, [result]);

  const filteredQuestions = result.questions.filter((q) => {
    const ans = result.answers.find((a) => a.questionId === q.id);
    const userChoice = ans?.selectedOption !== null && ans?.selectedOption !== undefined ? ans.selectedOption : null;
    const isCorrect = userChoice === q.correctAnswer;
    const isSkipped = userChoice === null;

    if (filterMode === 'correct') return isCorrect;
    if (filterMode === 'wrong') return !isCorrect && !isSkipped;
    if (filterMode === 'skipped') return isSkipped;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Candidate Scorecard & Performance Analysis
                </span>
                <span className="text-[10px] bg-blue-500/30 px-2 py-0.5 rounded text-white flex items-center gap-1 border border-blue-400/30">
                  <ShieldCheck className="w-3 h-3 text-cyan-300" /> Assessment Recorded
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">{result.testTitle}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportResultCardToPDF(result, studentName)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
              title="Download Scorecard (PDF)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scorecard PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Score & Status Summary Banner */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-4">
          {/* Pass/Fail Status Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              isPassed
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isPassed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <div>
                <span className="font-extrabold text-sm">
                  {isPassed ? 'Passed Target' : 'Needs Practice & Revision'}
                </span>
                <span className="text-xs opacity-80 block sm:inline sm:ml-2">
                  (Passing Standard: 50% | Your Score: {result.percentage}%)
                </span>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                isPassed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              Grade {result.grade}
            </span>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Score</span>
              <div className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                {result.marksObtained} <span className="text-xs font-medium text-slate-400">/ {result.totalMarks}</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{result.totalQuestions} Questions</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Percentage</span>
              <div className="text-2xl font-black text-blue-600 dark:text-cyan-400 mt-0.5">{result.percentage}%</div>
              <span className="text-[10px] font-bold text-blue-500 dark:text-cyan-300">Grade: {result.grade}</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Correct</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{result.correctCount}</div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">+{result.correctCount * 10} pts</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wide">Incorrect</span>
              <div className="text-2xl font-black text-rose-500 mt-0.5">{result.wrongCount}</div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">{result.wrongCount} to review</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Skipped</span>
              <div className="text-2xl font-black text-slate-600 dark:text-slate-300 mt-0.5">{result.skippedCount}</div>
              <span className="text-[10px] text-slate-400 font-semibold">Not attempted</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">Time & Pace</span>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {Math.floor(result.timeUsedSeconds / 60)}m {result.timeUsedSeconds % 60}s
              </div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold">
                Avg {avgTimePerQuestion}s / Q
              </span>
            </div>
          </div>

          {/* Educational Topic Breakdown (Strong vs Weak Topics) */}
          {(topicAnalysis.strong.length > 0 || topicAnalysis.weak.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {topicAnalysis.strong.length > 0 && (
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 text-xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Strong Topics:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {topicAnalysis.strong.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-semibold text-[11px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {topicAnalysis.weak.length > 0 && (
                <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-xs">
                  <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Areas for Improvement:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {topicAnalysis.weak.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-semibold text-[11px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls & Navigation Row */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReviewList(!showReviewList)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showReviewList ? 'Hide Answer Review' : 'Review Answers'}</span>
            </button>

            {showReviewList && (
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  All ({result.questions.length})
                </button>
                <button
                  onClick={() => setFilterMode('wrong')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    filterMode === 'wrong'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                  }`}
                >
                  Wrong ({result.wrongCount})
                </button>
                <button
                  onClick={() => setFilterMode('correct')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    filterMode === 'correct'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  Correct ({result.correctCount})
                </button>
                <button
                  onClick={() => setFilterMode('skipped')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    filterMode === 'skipped'
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Skipped ({result.skippedCount})
                </button>
              </div>
            )}
          </div>

          {/* Quick Core Actions: Practice Mistakes, Try Again, Next Quiz, Dashboard */}
          <div className="flex items-center gap-2 flex-wrap">
            {result.wrongCount > 0 && (
              <Button
                variant="outline"
                size="xs"
                className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                onClick={() => setFilterMode('wrong')}
              >
                Practice Mistakes ({result.wrongCount})
              </Button>
            )}

            <Button
              variant="outline"
              size="xs"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={onRetake}
            >
              Retake Test
            </Button>

            {onNextQuiz && (
              <Button
                variant="primary"
                size="xs"
                leftIcon={<Zap className="w-3.5 h-3.5" />}
                onClick={onNextQuiz}
              >
                Next Quiz
              </Button>
            )}

            {onGoDashboard && (
              <Button
                variant="secondary"
                size="xs"
                leftIcon={<LayoutDashboard className="w-3.5 h-3.5" />}
                onClick={onGoDashboard}
              >
                Dashboard
              </Button>
            )}
          </div>
        </div>

        {/* Detailed Question Review List */}
        {showReviewList && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-white dark:bg-slate-900">
            {filteredQuestions.map((q, idx) => {
              const ans = result.answers.find((a) => a.questionId === q.id);
              const userChoice = ans?.selectedOption !== null && ans?.selectedOption !== undefined ? ans.selectedOption : null;
              const isCorrect = userChoice === q.correctAnswer;
              const isSkipped = userChoice === null;
              const isSaved = savedQuestionIds.includes(q.id);

              return (
                <div
                  key={q.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isCorrect
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : isSkipped
                      ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                      : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                          isCorrect
                            ? 'bg-emerald-600 text-white'
                            : isSkipped
                            ? 'bg-slate-400 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span
                        className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded ${
                          isCorrect
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : isSkipped
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {isCorrect ? 'Correct' : isSkipped ? 'Skipped' : 'Incorrect'}
                      </span>
                      {q.chapter && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          • {q.chapter}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setReportingQuestion({ id: q.id, subject: q.subject })}
                        className="text-[10px] text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Report an issue with this question"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Report</span>
                      </button>

                      {onSaveQuestion && (
                        <button
                          onClick={() => onSaveQuestion(q.id)}
                          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isSaved ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                          title="Save to Mistake Notebook"
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3">{q.question}</h4>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {q.options.map((opt, optIdx) => {
                      const isOptionCorrect = optIdx === q.correctAnswer;
                      const isUserPick = optIdx === userChoice;

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 font-medium ${
                            isOptionCorrect
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 font-bold text-emerald-900 dark:text-emerald-100'
                              : isUserPick && !isCorrect
                              ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 font-bold text-rose-900 dark:text-rose-100'
                              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {isOptionCorrect && <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                          {isUserPick && !isCorrect && <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailed Explanation */}
                  {q.explanation && (
                    <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 mt-2">
                      <span className="font-bold text-blue-700 dark:text-cyan-400">Explanation & Rationale: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
            <span>Scorecard recorded for student {studentName}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {result.percentage >= 60 && (
              <button
                onClick={() => {
                  const certId = `TG-CERT-${result.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}`;
                  exportCertificateToPDF({
                    id: certId,
                    studentName,
                    testName: result.testTitle,
                    score: result.marksObtained,
                    totalMarks: result.totalMarks,
                    percentage: result.percentage,
                    grade: result.grade,
                    issueDate: result.timestamp,
                    certificateNumber: certId,
                    verificationUrl: `https://taleemguru.pk/verify/${certId}`,
                  });
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-700/20 transition-colors cursor-pointer"
                title="Download Certificate of Achievement (PDF)"
              >
                <Award className="w-4 h-4 text-amber-300" /> Merit Certificate (PDF)
              </button>
            )}
            <button
              onClick={() => exportResultCardToPDF(result, studentName)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Scorecard (PDF)
            </button>
          </div>
        </div>
      </div>

      {reportingQuestion && (
        <ReportIssueModal
          isOpen={Boolean(reportingQuestion)}
          onClose={() => setReportingQuestion(null)}
          questionId={reportingQuestion.id}
          subjectTitle={reportingQuestion.subject}
          defaultCategory="Incorrect Answer Key"
        />
      )}
    </div>
  );
};
