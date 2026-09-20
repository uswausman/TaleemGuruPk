import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Quote } from 'lucide-react';

const STORIES = [
  {
    name: 'Ayesha Khan',
    exam: 'FSc Pre-Medical',
    score: 'A+ Grade',
    quote: "Taleem Guru's mock tests were a game changer for my MDCAT preparation. The interface is just like the real exam, which really helped calm my nerves.",
  },
  {
    name: 'Hassan Ali',
    exam: 'Matric (Class 10)',
    score: '95% Score',
    quote: "The chapter-wise MCQs helped me solidify my concepts for the board exams. I was able to identify my weak areas early and work on them.",
  },
  {
    name: 'Fatima Zahra',
    exam: 'ECAT Engineering',
    score: 'Top 100 Rank',
    quote: "I couldn't have managed the time pressure without their timed practice sessions. The feedback after each quiz was invaluable.",
  },
  {
    name: 'Bilal Ahmed',
    exam: 'CSS MPT',
    score: 'Qualified',
    quote: "The structured approach to past papers and the subject-wise breakdown made my CSS screening preparation much more efficient.",
  },
];

export const SuccessStories: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">
          Student Success Stories
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Hear from students who achieved their goals using Taleem Guru.
        </p>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-8 -mb-4 snap-x">
        {STORIES.map((story, index) => (
          <div key={index} className="flex-none w-80 sm:w-96 snap-start">
            <Card className="p-6 h-full flex flex-col justify-between shadow-sm">
              <Quote className="w-8 h-8 text-indigo-400 mb-4 opacity-50" />
              <p className="text-slate-700 dark:text-slate-300 italic mb-6 flex-grow">
                "{story.quote}"
              </p>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto">
                <div className="font-bold text-slate-900 dark:text-white">{story.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-500">{story.exam}</span>
                  <Badge variant="emerald" size="xs">{story.score}</Badge>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
};
