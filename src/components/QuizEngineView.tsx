import React, { useState } from 'react';
import {
  HelpCircle,
  Play,
  Zap,
  Flame,
  Award,
  Filter,
  CheckCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  Clock,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { MCQ, Difficulty } from '../types';
import confetti from 'canvas-confetti';
import { useToast } from './ui/Toast';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface QuizEngineViewProps {
  allMCQs: MCQ[];
  onStartCustomQuiz?: (mcqs: MCQ[], title: string, durationMinutes: number) => void;
  onStartQuiz?: (mcqs: MCQ[], title: string, durationMinutes: number) => void;
  onIncrementPoints?: (pts: number) => void;
  studentName?: string;
}

export const QuizEngineView: React.FC<QuizEngineViewProps> = ({
  allMCQs,
  onStartCustomQuiz,
  onStartQuiz,
  onIncrementPoints = () => {},
  studentName = 'Student',
}) => {
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMode, setSelectedMode] = useState<number>(10);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  // Quick In-Place Interactive Quiz state
  const [isQuickPlaying, setIsQuickPlaying] = useState(false);
  const [quickQuestions, setQuickQuestions] = useState<MCQ[]>([]);
  const [quickIdx, setQuickIdx] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [quickScore, setQuickScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const dynamicCategories = React.useMemo(() => {
    const map = new Map<string, number>();
    allMCQs.forEach((m) => {
      const subj = (m.subject || 'General').trim();
      map.set(subj, (map.get(subj) || 0) + 1);
    });

    const iconMap: Record<string, string> = {
      physics: '🔬',
      chemistry: '🧪',
      biology: '🧬',
      mathematics: '📐',
      'computer science': '💻',
      english: '📖',
      urdu: '✍️',
      'pakistan studies': '🇵🇰',
      islamiat: '🕌',
      'general knowledge': '🌍',
      'current affairs': '📰',
      'iq & intelligence': '🧠',
    };

    const list = [{ id: 'All', name: 'All Quizzes', icon: '🎯', count: allMCQs.length }];
    for (const [subj, count] of map) {
      const key = subj.toLowerCase();
      let icon = '📚';
      for (const [k, ic] of Object.entries(iconMap)) {
        if (key.includes(k)) {
          icon = ic;
          break;
        }
      }
      list.push({
        id: subj,
        name: subj,
        icon,
        count,
      });
    }
    return list;
  }, [allMCQs]);

  const handleStartQuickPlay = (category: string) => {
    let pool = allMCQs;
    if (category !== 'All') {
      pool = pool.filter((m) => m.subject.toLowerCase().includes(category.toLowerCase()));
    }
    if (selectedDifficulty !== 'All') {
      pool = pool.filter((m) => (m.difficulty || 'Medium').toLowerCase() === selectedDifficulty.toLowerCase());
    }

    if (pool.length < selectedMode) {
      showToast({
        type: 'info',
        title: 'Not enough questions available',
        message: 'Not enough questions available for this selection.',
      });
      return;
    }

    // Shuffle and pick exact selectedMode questions respecting selectedDifficulty
    const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, selectedMode);
    const title = category === 'All' 
      ? `General Quiz (${selectedMode} Questions - ${selectedDifficulty} Difficulty)` 
      : `${category} Quiz (${selectedMode} Questions - ${selectedDifficulty} Difficulty)`;

    if (onStartQuiz) {
      onStartQuiz(chosen, title, Math.max(10, Math.ceil(selectedMode * 1.5)));
    } else if (onStartCustomQuiz) {
      onStartCustomQuiz(chosen, title, Math.max(10, Math.ceil(selectedMode * 1.5)));
    } else {
      setQuickQuestions(chosen);
      setQuickIdx(0);
      setSelectedChoice(null);
      setQuickScore(0);
      setIsFinished(false);
      setIsQuickPlaying(true);
    }
  };

  const handlePickChoice = (idx: number) => {
    if (selectedChoice !== null) return; // already picked
    setSelectedChoice(idx);

    const currentQ = quickQuestions[quickIdx];
    if (idx === currentQ.correctAnswer) {
      setQuickScore((s) => s + 1);
      onIncrementPoints(10);
    }
  };

  const handleNextQuickQuestion = () => {
    if (quickIdx + 1 < quickQuestions.length) {
      setQuickIdx((i) => i + 1);
      setSelectedChoice(null);
    } else {
      setIsFinished(true);
      if (quickScore >= quickQuestions.length * 0.7) {
        try {
          confetti({ particleCount: 70, spread: 60 });
        } catch (e) {}
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-blue-500/20">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <Badge variant="cyan" size="sm" icon={<Zap className="w-3.5 h-3.5 fill-current" />}>
            Interactive Practice Arena
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Pakistan Master Quiz Arena
          </h1>
          <p className="text-blue-100/85 text-xs sm:text-sm md:text-base leading-relaxed">
            Test your knowledge across Pakistan Affairs, Islamiyat, Science, General Knowledge, and Current Affairs with rapid quizzes and earn streak points!
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="amber"
              size="md"
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              onClick={() => handleStartQuickPlay('All')}
            >
              Rapid 10 MCQs Quiz
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Sparkles className="w-4 h-4 text-cyan-400" />}
              onClick={() => handleStartQuickPlay('Current Affairs')}
            >
              Daily Current Affairs
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Quiz Interactive Modal / Runner */}
      {isQuickPlaying && (
        <Card className="p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 border-2 border-blue-500/30">
          {!isFinished ? (
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="blue" size="sm">
                    Question {quickIdx + 1} of {quickQuestions.length}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Category: {quickQuestions[quickIdx]?.subject}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 px-2.5 py-1 rounded-lg">
                    Score: {quickScore} / {quickQuestions.length}
                  </span>
                  <button
                    onClick={() => setIsQuickPlaying(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Exit Quiz
                  </button>
                </div>
              </div>

              {/* Question */}
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-6 leading-relaxed">
                {quickQuestions[quickIdx]?.question}
              </h2>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {quickQuestions[quickIdx]?.options.map((opt, optIdx) => {
                  const isPicked = selectedChoice === optIdx;
                  const isCorrect = optIdx === quickQuestions[quickIdx]?.correctAnswer;

                  let btnStyle = 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';
                  if (selectedChoice !== null) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold ring-2 ring-emerald-500';
                    } else if (isPicked) {
                      btnStyle = 'bg-rose-50 dark:bg-rose-950/70 border-rose-500 text-rose-950 dark:text-rose-200 font-bold ring-2 ring-rose-500';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={selectedChoice !== null}
                      onClick={() => handlePickChoice(optIdx)}
                      className={`p-4 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-1">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                          {['A', 'B', 'C', 'D'][optIdx]}
                        </span>
                        <span className="truncate">{opt}</span>
                      </div>
                      {selectedChoice !== null && isCorrect && (
                        <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      {selectedChoice !== null && isPicked && !isCorrect && (
                        <X className="w-5 h-5 text-rose-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant Explanation */}
              {selectedChoice !== null && (
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-slate-800 dark:text-slate-200 space-y-1 mb-5 animate-in fade-in duration-150">
                  <div className="font-bold text-blue-900 dark:text-cyan-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500" /> Explanation & Solution:
                  </div>
                  <p className="leading-relaxed text-slate-600 dark:text-slate-300">{quickQuestions[quickIdx]?.explanation}</p>
                </div>
              )}

              {/* Next Control */}
              <div className="flex justify-end">
                {selectedChoice !== null && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleNextQuickQuestion}
                  >
                    {quickIdx + 1 === quickQuestions.length ? 'See Final Score' : 'Next Question →'}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Quiz Completed Screen */
            <div className="text-center py-6 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-cyan-300 flex items-center justify-center mx-auto text-2xl shadow-inner border border-blue-200 dark:border-blue-800">
                🎉
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Quiz Completed!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You correctly answered {quickScore} out of {quickQuestions.length} questions.
              </p>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl">
                <div className="text-3xl font-black text-blue-600 dark:text-cyan-400">
                  {Math.round((quickScore / quickQuestions.length) * 100)}%
                </div>
                <div className="text-xs font-bold text-blue-800 dark:text-cyan-200 mt-0.5">
                  +{quickScore * 10} Merit Points Earned
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStartQuickPlay('All')}
                >
                  Play Another Quiz
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickPlaying(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Quiz Modes & Settings Toolbar */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        {/* Questions count selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Quiz Mode:</span>
          {[10, 20, 50, 100].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setSelectedMode(num)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMode === num
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {num} Questions
            </button>
          ))}
        </div>

        {/* Difficulty Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Difficulty:</span>
          {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
            <button
              key={diff}
              type="button"
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDifficulty === diff
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </Card>

      {/* Quiz Categories Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
          <span>Explore Quizzes by Subject & Category</span>
        </h2>

        {allMCQs.length === 0 ? (
          <Card className="text-center py-16 p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-2xl">
              📭
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No quizzes available yet.</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              There are no questions or quizzes loaded in the database at the moment.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dynamicCategories.map((cat) => (
              <Card
                key={cat.id}
                hoverLift
                className="p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                    <Badge variant="blue" size="xs">
                      {cat.count} Questions
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Real exam questions curated from the authoritative database.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">{selectedMode} MCQs • Untimed</span>
                  <Button
                    variant="primary"
                    size="xs"
                    leftIcon={<Play className="w-3 h-3 fill-current" />}
                    onClick={() => handleStartQuickPlay(cat.id)}
                  >
                    Start Quiz
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
