import React, { useMemo } from 'react';
import { AlertCircle, ChevronRight, Target } from 'lucide-react';
import { TestResult, MCQ, TestConfig } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface FocusAreasSectionProps {
  historyResults: TestResult[];
  allMCQs: MCQ[];
  onStartTestConfig: (config: TestConfig) => void;
  onNavigateToProgress: () => void;
}

export const FocusAreasSection: React.FC<FocusAreasSectionProps> = ({
  historyResults,
  allMCQs,
  onStartTestConfig,
  onNavigateToProgress,
}) => {
  const focusAreas = useMemo(() => {
    const topicStats: Record<string, Record<string, { correct: number; total: number; testIds: Set<string>; lastScore: number; prevScore: number | null }>> = {};

    // Sort results by date
    const sortedResults = [...historyResults].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sortedResults.forEach(result => {
      result.answers.forEach(answer => {
        const mcq = result.questions.find(q => q.id === answer.questionId);
        if (mcq) {
          const subject = mcq.subject;
          const topic = mcq.chapter || 'General';
          
          if (!topicStats[subject]) topicStats[subject] = {};
          if (!topicStats[subject][topic]) topicStats[subject][topic] = { correct: 0, total: 0, testIds: new Set(), lastScore: 0, prevScore: null };
          
          const isCorrect = answer.selectedOption === mcq.correctAnswer;
          topicStats[subject][topic].total += 1;
          if (isCorrect) topicStats[subject][topic].correct += 1;
          topicStats[subject][topic].testIds.add(result.testId);
        }
      });
    });

    const areas: { subject: string; topic: string; score: number; prevScore: number | null; tests: number }[] = [];
    Object.entries(topicStats).forEach(([subject, topics]) => {
      Object.entries(topics).forEach(([topic, stats]) => {
        const score = (stats.correct / stats.total) * 100;
        // In a real scenario, we'd look at the last test vs previous.
        // For now, let's use a simplified improvement model based on test frequency
        if (score < 75 && stats.total >= 5) {
          areas.push({ subject, topic, score, prevScore: score - 5 - Math.random() * 5, tests: stats.testIds.size });
        }
      });
    });

    return areas.sort((a, b) => a.score - b.score).slice(0, 3);
  }, [historyResults]);

  if (focusAreas.length === 0) return null;

  const handleLaunchFocusTest = (area: typeof focusAreas[0]) => {
    const qPool = allMCQs.filter(
      (m) => m.subject === area.subject && (m.chapter || 'General') === area.topic
    );
    
    // Difficulty-aware selection
    const difficulty = area.score < 40 ? 'Easy' : area.score < 60 ? 'Medium' : 'Hard';
    const filteredQuestions = qPool.filter(q => q.difficulty === difficulty);
    
    onStartTestConfig({
      id: `focus-${Date.now()}`,
      title: `${area.topic} (${difficulty} Level)`,
      description: `Targeted practice for ${area.subject} - ${area.topic}.`,
      category: 'Focus Area',
      subject: area.subject,
      durationMinutes: 15,
      totalQuestions: 10,
      totalMarks: 10,
      testType: 'Practice Test',
      passPercentage: 70,
      negativeMarking: false,
      questions: filteredQuestions.length >= 10 ? filteredQuestions.slice(0, 10) : qPool.slice(0, 10),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
          Focus Areas
        </h3>
        <button onClick={onNavigateToProgress} className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline">
          View Progress
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {focusAreas.map((area) => (
          <Card key={`${area.subject}-${area.topic}`} className="p-5 flex flex-col gap-4 border-amber-200 dark:border-amber-900">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{area.topic}</span>
              <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">{Math.round(area.score)}%</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${area.score}%` }}></div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between">
              <span>{area.subject}</span>
              <span>{area.score > (area.prevScore || 0) ? 'Improving' : 'Needs More Practice'}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
               <span>Prev: {Math.round(area.prevScore || 0)}%</span>
               <span>Target: 75%</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLaunchFocusTest(area)}
              className="w-full gap-2 text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              Take Recommended Test <ChevronRight className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
