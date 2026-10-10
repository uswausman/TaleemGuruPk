import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Quote } from 'lucide-react';
import { useSiteSettings } from '../context/SiteSettingsContext';

export const SuccessStories: React.FC = () => {
  const { siteName } = useSiteSettings();

  const stories = [
    {
      name: 'Ayesha Khan',
      exam: 'FSc Pre-Medical',
      score: 'A+ Grade',
      quote: `${siteName}'s mock tests were a game changer for my MDCAT preparation. The interface is just like the real exam, which really helped calm my nerves.`,
    },
    {
      name: 'Hassan Ali',
      exam: 'Matric (Class 10)',
      score: '95% Score',
      quote: 'The chapter-wise MCQs helped me solidify my concepts for the board exams. I was able to identify my weak areas early and work on them.',
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
      quote: 'The structured approach to past papers and the subject-wise breakdown made my CSS screening preparation much more efficient.',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10 text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Student Success Stories
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          Hear from students across Pakistan who achieved top grades using {siteName}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stories.map((story, index) => (
          <Card
            key={index}
            hoverLift
            className="p-6 flex flex-col justify-between shadow-sm border border-slate-200/90 dark:border-slate-800 relative group"
          >
            <div className="space-y-3">
              <Quote className="w-7 h-7 text-blue-500/40 dark:text-cyan-400/40" />
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                "{story.quote}"
              </p>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-5">
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {story.name}
              </div>
              <div className="flex items-center justify-between mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{story.exam}</span>
                <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60">
                  {story.score}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};
