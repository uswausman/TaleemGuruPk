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
} from 'lucide-react';
import { MCQ, Difficulty } from '../types';
import confetti from 'canvas-confetti';

interface QuizEngineViewProps {
  allMCQs: MCQ[];
  onStartCustomQuiz: (mcqs: MCQ[], title: string, durationMinutes: number) => void;
  onIncrementPoints: (pts: number) => void;
}

export const QuizEngineView: React.FC<QuizEngineViewProps> = ({
  allMCQs,
  onStartCustomQuiz,
  onIncrementPoints,
}) => {
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

  const quizCategories = [
    { id: 'All', name: 'All Quizzes', icon: '🎯', count: 120 },
    { id: 'General Knowledge', name: 'General Knowledge', icon: '🌍', count: 45 },
    { id: 'Pakistan Studies', name: 'Pakistan Quiz', icon: '🇵🇰', count: 38 },
    { id: 'Islamiat', name: 'Islamiyat Quiz', icon: '🕌', count: 32 },
    { id: 'Physics', name: 'Science & Physics', icon: '🔬', count: 40 },
    { id: 'English', name: 'English Quiz', icon: '📖', count: 35 },
    { id: 'Current Affairs', name: 'Current Affairs', icon: '📰', count: 28 },
    { id: 'Computer Science', name: 'Computer Quiz', icon: '💻', count: 25 },
    { id: 'IQ & Intelligence', name: 'IQ & Reasoning', icon: '🧠', count: 30 },
  ];

  const handleStartQuickPlay = (category: string) => {
    let pool = allMCQs;
    if (category !== 'All') {
      pool = pool.filter((m) => m.subject.toLowerCase().includes(category.toLowerCase()));
    }
    if (pool.length === 0) pool = allMCQs;

    // Shuffle and pick
    const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, selectedMode);
    setQuickQuestions(chosen);
    setQuickIdx(0);
    setSelectedChoice(null);
    setQuickScore(0);
    setIsFinished(false);
    setIsQuickPlaying(true);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md text-amber-300 border border-white/10 mb-3">
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Instant Quiz Engine
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Pakistan Master Quiz Arena
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base mt-2 leading-relaxed">
            Test your knowledge across Pakistan Affairs, Islamiyat, Science, General Knowledge, and Current Affairs with rapid quizzes and earn streak points!
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => handleStartQuickPlay('All')}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-md transition-all"
            >
              <Play className="w-4 h-4 fill-current" /> Rapid 10 MCQs Quiz
            </button>
            <button
              onClick={() => handleStartQuickPlay('Current Affairs')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-sm rounded-xl border border-white/20 transition-all"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" /> Daily Current Affairs
            </button>
          </div>
        </div>
      </div>

      {/* Quick Quiz Interactive Modal / Runner */}
      {isQuickPlaying && (
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
          {!isFinished ? (
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                    Question {quickIdx + 1} of {quickQuestions.length}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Category: {quickQuestions[quickIdx]?.subject}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    Score: {quickScore} / {quickQuestions.length}
                  </span>
                  <button
                    onClick={() => setIsQuickPlaying(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700"
                  >
                    Exit Quiz
                  </button>
                </div>
              </div>

              {/* Question */}
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-6">
                {quickQuestions[quickIdx]?.question}
              </h2>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {quickQuestions[quickIdx]?.options.map((opt, optIdx) => {
                  const isPicked = selectedChoice === optIdx;
                  const isCorrect = optIdx === quickQuestions[quickIdx]?.correctAnswer;

                  let btnStyle = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
                  if (selectedChoice !== null) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-500';
                    } else if (isPicked) {
                      btnStyle = 'bg-red-50 border-red-500 text-red-950 font-bold ring-2 ring-red-500';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={selectedChoice !== null}
                      onClick={() => handlePickChoice(optIdx)}
                      className={`p-4 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between gap-3 ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {['A', 'B', 'C', 'D'][optIdx]}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {selectedChoice !== null && isCorrect && (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {selectedChoice !== null && isPicked && !isCorrect && (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant Explanation */}
              {selectedChoice !== null && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-slate-800 space-y-1 mb-5 animate-in fade-in duration-150">
                  <div className="font-bold text-emerald-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Explanation:
                  </div>
                  <p className="leading-relaxed">{quickQuestions[quickIdx]?.explanation}</p>
                </div>
              )}

              {/* Next Control */}
              <div className="flex justify-end">
                {selectedChoice !== null && (
                  <button
                    onClick={handleNextQuickQuestion}
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    {quickIdx + 1 === quickQuestions.length ? 'See Final Score' : 'Next Question →'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Quiz Completed Screen */
            <div className="text-center py-6 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl shadow-inner">
                🎉
              </div>
              <h3 className="text-2xl font-black text-slate-900">Quiz Completed!</h3>
              <p className="text-xs text-slate-500">
                You correctly answered {quickScore} out of {quickQuestions.length} questions.
              </p>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="text-3xl font-black text-emerald-700">
                  {Math.round((quickScore / quickQuestions.length) * 100)}%
                </div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">
                  +{quickScore * 10} Merit Points Earned
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleStartQuickPlay('All')}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                >
                  Play Another Quiz
                </button>
                <button
                  onClick={() => setIsQuickPlaying(false)}
                  className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quiz Modes & Settings Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Questions count selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Quiz Mode:</span>
          {[10, 20, 50, 100].map((num) => (
            <button
              key={num}
              onClick={() => setSelectedMode(num)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedMode === num
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {num} Questions
            </button>
          ))}
        </div>

        {/* Difficulty Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Difficulty:</span>
          {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedDifficulty === diff
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Quiz Categories Grid */}
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-600" />
          <span>Explore Quizzes by Subject & Category</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {cat.count}+ Quizzes
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  High-yield questions curated from past papers, competitive exams and textbook exercises.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{selectedMode} MCQs • Untimed</span>
                <button
                  onClick={() => handleStartQuickPlay(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 group-hover:bg-emerald-700 text-emerald-800 group-hover:text-white text-xs font-bold transition-all"
                >
                  <Play className="w-3 h-3 fill-current" /> Start Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
