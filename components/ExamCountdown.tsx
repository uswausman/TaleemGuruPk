import React from 'react';
import { Clock } from 'lucide-react';
import { Card } from './ui/Card';

const EXAMS = [
  { title: 'MDCAT 2026', date: '2026-11-20' },
  { title: 'BISE Boards 2027', date: '2027-05-15' },
];

export const ExamCountdown: React.FC = () => {
  const getDaysRemaining = (targetDate: string) => {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-indigo-500" />
        Exam Countdown
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {EXAMS.map((exam) => (
          <div key={exam.title} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center">
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {getDaysRemaining(exam.date)}
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">{exam.title}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Days remaining</div>
          </div>
        ))}
      </div>
    </Card>
  );
};
