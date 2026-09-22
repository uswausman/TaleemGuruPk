import React from 'react';
import { Award } from 'lucide-react';
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
      earned: accuracy >= 85,
    },
    {
      id: 'consistent-student',
      title: 'Consistent Student',
      description: 'Completed 20+ quizzes',
      icon: '🔥',
      earned: quizzesAttempted >= 20,
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-amber-500" />
        Achievements
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
              achievement.earned
                ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 opacity-60'
            }`}
          >
            <div className="text-3xl mb-2">{achievement.icon}</div>
            <div className={`text-sm font-bold ${achievement.earned ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500'}`}>
              {achievement.title}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{achievement.description}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};
