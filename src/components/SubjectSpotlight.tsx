import React from 'react';
import { Card } from './ui/Card';
import { Star, Lightbulb, BookOpen } from 'lucide-react';
import { Button } from './ui/Button';

interface SpotlightProps {
  subject: string;
  teacherName: string;
  tip: string;
  guideLink: string;
}

const WEEKLY_SPOTLIGHT: SpotlightProps = {
  subject: 'Mathematics',
  teacherName: 'Prof. Tariq Mahmood',
  tip: 'Don\'t just memorize formulas. Practice deriving them once, and you\'ll understand how to apply them to any variation of the problem.',
  guideLink: '/notes/math-fundamentals',
};

export const SubjectSpotlight: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="p-6 md:p-8 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-100 dark:border-indigo-900">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="shrink-0">
            <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center shadow-lg text-4xl">
              📐
            </div>
          </div>
          
          <div className="flex-grow space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Star className="w-4 h-4" />
              Subject Expert Spotlight
            </div>
            
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {WEEKLY_SPOTLIGHT.subject}
            </h2>
            
            <div className="flex items-start gap-3 bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Tip from {WEEKLY_SPOTLIGHT.teacherName}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  "{WEEKLY_SPOTLIGHT.tip}"
                </p>
              </div>
            </div>
          </div>
          
          <div className="shrink-0 w-full md:w-auto">
            <Button className="w-full justify-center" leftIcon={<BookOpen className="w-4 h-4" />}>
              View Study Guide
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
};
