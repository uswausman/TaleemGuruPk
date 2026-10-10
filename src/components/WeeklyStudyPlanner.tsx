import React from 'react';
import { Target, CheckCircle2, Circle } from 'lucide-react';
import { WeeklyStudyGoal } from '../types';
import { Card } from './ui/Card';

interface WeeklyStudyPlannerProps {
  goals: WeeklyStudyGoal[];
  onToggleGoal: (goalId: string) => void;
}

export const WeeklyStudyPlanner: React.FC<WeeklyStudyPlannerProps> = ({ goals, onToggleGoal }) => {
  const days: WeeklyStudyGoal['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Card hoverLift className="p-6 sm:p-7 border-slate-200/90 dark:border-slate-800 space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
            <span>Weekly Study Routine</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track your daily revision schedule and study habit targets.
          </p>
        </div>
        <div className="text-xs font-bold text-blue-700 dark:text-cyan-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 px-3 py-1 rounded-full">
          {goals.length > 0 ? `${goals.filter(g => g.completed).length}/${goals.length} Goals` : '0 Goals Set'}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {days.map((day) => {
          const dayGoal = goals.find(g => g.day === day);
          return (
            <div key={day} className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{day}</span>
              <button
                onClick={() => dayGoal && onToggleGoal(dayGoal.id)}
                disabled={!dayGoal}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  dayGoal?.completed 
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/80 shadow-xs' 
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 border border-slate-200 dark:border-slate-700'
                } ${!dayGoal ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                title={dayGoal ? `${day}: ${dayGoal.subject}` : `${day}: No goal`}
              >
                {dayGoal?.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </button>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate w-full text-center">
                {dayGoal?.subject || '—'}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
