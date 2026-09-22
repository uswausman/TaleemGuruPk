import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  School,
  Sparkles,
  Layers,
  Award,
} from 'lucide-react';
import { TestConfig, MCQ } from '../types';

interface ClassesViewProps {
  onStartClassTest: (className: string, subject: string) => void;
  onNavigateStudyNotes?: (className: string) => void;
  onNavigateNotes?: (className: string) => void;
  onNavigateMCQBank?: (className: string) => void;
  onNavigatePastPapers?: (className: string) => void;
  allMCQs?: MCQ[];
  studentName?: string;
  initialClass?: string;
}

export const FEATURED_CLASSES = [
  { id: 'Class 9', label: 'Class 9 (Matric Pt 1)', badge: 'SSC-I', desc: 'Matriculation Part 1 Science & General Groups' },
  { id: 'Class 10', label: 'Class 10 (Matric Pt 2)', badge: 'SSC-II', desc: 'Matriculation Part 2 Board Examinations' },
  { id: 'Class 11', label: 'Class 11 (FSc / ICS Pt 1)', badge: 'HSSC-I', desc: 'Pre-Medical, Pre-Engineering & ICS Part 1' },
  { id: 'Class 12', label: 'Class 12 (FSc / ICS Pt 2)', badge: 'HSSC-II', desc: 'Pre-Medical, Pre-Engineering & ICS Part 2' },
];

export const OTHER_CLASSES = [
  'Playgroup',
  'Nursery',
  'KG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'BA / Associate Degree',
  'BSc / Associate Degree',
  'BS (4 Years Honors)',
  'Masters & Postgraduate',
];

export const ClassesView: React.FC<ClassesViewProps> = ({
  onStartClassTest,
  onNavigateStudyNotes,
  initialClass = 'Class 10 (Matric Pt 2)',
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);

  const subjectsForClass = [
    { name: 'Physics', chapters: 9, tests: 45, icon: '⚡', desc: 'Mechanics, Heat, Waves, Electricity & Magnetism' },
    { name: 'Chemistry', chapters: 8, tests: 40, icon: '🧪', desc: 'Atomic Structure, Chemical Bonding, States & Organic' },
    { name: 'Biology', chapters: 9, tests: 42, icon: '🧬', desc: 'Cell Biology, Enzymes, Bioenergetics & Coordination' },
    { name: 'Mathematics', chapters: 13, tests: 60, icon: '📐', desc: 'Algebra, Matrices, Trigonometry, Calculus & Geometry' },
    { name: 'Computer Science', chapters: 7, tests: 35, icon: '💻', desc: 'Programming, Data Structures, Networks & Databases' },
    { name: 'English', chapters: 12, tests: 38, icon: '📖', desc: 'Grammar, Tenses, Comprehension, Essays & Vocabulary' },
    { name: 'Urdu', chapters: 14, tests: 32, icon: '✍️', desc: 'Qawaid, Asbaaq, Nazmein, Ghazaliyat & Mazameen' },
    { name: 'Pakistan Studies', chapters: 6, tests: 28, icon: '🇵🇰', desc: 'History, Constitution, Geography & Foreign Policy' },
    { name: 'Islamiat', chapters: 8, tests: 30, icon: '🕌', desc: 'Surahs, Ahadees, Arkaan-e-Islam & Seerat-un-Nabi' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-cyan-300 border border-white/10 mb-3">
            <School className="w-3.5 h-3.5" /> Class-Wise Academic Portals
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Classes 9, 10, 11 & 12 Academic Hub
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
            Targeted syllabus preparation for Matriculation (Class 9 & 10) and Intermediate (Class 11 & 12 FSc / ICS) across all Pakistan Education Boards with chapter-wise tests and notes.
          </p>
        </div>
      </div>

      {/* Featured 4 Classes (Class 9, Class 10, Class 11, Class 12) */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Core High School & Intermediate Classes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_CLASSES.map((cls) => {
            const isSelected = selectedClass.includes(cls.id);
            return (
              <div
                key={cls.id}
                onClick={() => setSelectedClass(cls.label)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xl scale-[1.02]'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-cyan-400'
                      }`}
                    >
                      {cls.badge}
                    </span>
                    <span className="text-xs font-bold opacity-80">8 Subjects</span>
                  </div>
                  <h4 className="text-lg font-black mt-2">{cls.id}</h4>
                  <p
                    className={`text-xs mt-1 ${
                      isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {cls.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/20 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                  <span>{isSelected ? 'Currently Viewing' : 'Select Class'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Other Grades Selector Pills */}
      <div className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Additional Grades & Higher Education
        </h4>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
          {OTHER_CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedClass === cls
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Class Subject Directory */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                Active Curriculum
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {selectedClass}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              National Curriculum of Pakistan & Provincial Textbook Boards aligned syllabus.
            </p>
          </div>

          <button
            onClick={() => onNavigateStudyNotes(selectedClass)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-800 dark:text-cyan-300 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
            <span>Download {selectedClass} Notes (PDF)</span>
          </button>
        </div>

        {/* Subjects for Selected Class */}
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4">
            Subjects & Online Assessment Series for {selectedClass}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectsForClass.map((sub) => (
              <div
                key={sub.name}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{sub.icon}</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {sub.chapters} Chapters
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mt-3 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                    {sub.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {sub.desc}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {sub.tests} Practice Tests
                  </span>
                  <button
                    onClick={() => onStartClassTest(selectedClass, sub.name)}
                    className="text-xs font-bold text-blue-600 dark:text-cyan-400 group-hover:underline flex items-center gap-1"
                  >
                    Start Test <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
