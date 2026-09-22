import React from 'react';
import { Target, CheckCircle2, Circle } from 'lucide-react';
import { WeeklyStudyGoal } from '../types';

interface WeeklyStudyPlannerProps {
  goals: WeeklyStudyGoal[];
  onToggleGoal: (goalId: string) => void;
}

export const WeeklyStudyPlanner: React.FC<WeeklyStudyPlannerProps> = ({ goals, onToggleGoal }) => {
  const days: WeeklyStudyGoal['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />
          Weekly Study Planner
        </h3>
        <div className="text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full">
          {goals.filter(g => g.completed).length}/{goals.length} Goals
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayGoal = goals.find(g => g.day === day);
          return (
            <div key={day} className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{day}</span>
              <button
                onClick={() => dayGoal && onToggleGoal(dayGoal.id)}
                disabled={!dayGoal}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  dayGoal?.completed 
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                }`}
              >
                {dayGoal?.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate w-full text-center">
                {dayGoal?.subject || '-'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
