import React from 'react';
import { Card } from './ui/Card';
import { Calculator, Scale, CalendarDays } from 'lucide-react';

const TOOLS = [
  {
    title: 'GPA Calculator',
    description: 'Calculate your semester GPA',
    icon: Calculator,
    link: '/tools/gpa-calculator',
  },
  {
    title: 'Unit Converter',
    description: 'Convert scientific units',
    icon: Scale,
    link: '/tools/unit-converter',
  },
  {
    title: 'Exam Date Tracker',
    description: 'Track upcoming exam dates',
    icon: CalendarDays,
    link: '/tools/exam-tracker',
  },
];

export const QuickTools: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {TOOLS.map((tool) => (
          <a key={tool.title} href={tool.link} className="block group">
            <Card className="p-6 flex items-center gap-4 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <tool.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{tool.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tool.description}</p>
              </div>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
};
