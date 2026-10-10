import React from 'react';
import { Award, Lock, Sparkles } from 'lucide-react';
import { Card } from './ui/Card';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
}

interface AchievementBadgesProps {
  quizzesAttempted: number;
  accuracy: number;
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ quizzesAttempted, accuracy }) => {
  const achievements: Achievement[] = [
    {
      id: 'quiz-master',
      title: 'Quiz Master',
      description: 'Completed 10+ quizzes',
      icon: '🏆',
      earned: quizzesAttempted >= 10,
    },
    {
      id: 'fast-learner',
      title: 'Fast Learner',
      description: 'Maintained 85%+ accuracy',
      icon: '⚡',
      earned: quizzesAttempted > 0 && accuracy >= 85,
    },
    {
      id: 'consistent-student',
      title: 'Consistent Student',
      description: 'Completed 20+ quizzes',
      icon: '🔥',
      earned: quizzesAttempted >= 20,
    },
  ];

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <Card hoverLift className="p-6 sm:p-7 space-y-5 border-slate-200/90 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <span>Achievement Milestones</span>
        </h3>
        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 px-2.5 py-1 rounded-full">
          {earnedCount}/{achievements.length} Unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`p-4 rounded-2xl border transition-all flex flex-col items-center text-center relative ${
              achievement.earned
                ? 'bg-amber-50/70 border-amber-300/80 dark:bg-amber-950/30 dark:border-amber-800/80 shadow-xs'
                : 'bg-slate-50/70 border-slate-200/80 dark:bg-slate-850 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="text-3xl mb-2.5 transform transition-transform group-hover:scale-110">
              {achievement.icon}
            </div>
            <div
              className={`text-xs sm:text-sm font-bold ${
                achievement.earned ? 'text-amber-900 dark:text-amber-200' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {achievement.title}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {achievement.description}
            </div>
            {!achievement.earned && (
              <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                <Lock className="w-3 h-3" /> Locked
              </div>
            )}
            {achievement.earned && (
              <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Sparkles className="w-3 h-3" /> Unlocked
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
