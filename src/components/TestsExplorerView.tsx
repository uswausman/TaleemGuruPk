import React, { useState } from 'react';
import {
  FileCheck,
  Play,
  Download,
  Clock,
  Filter,
  Search,
  CheckCircle,
  ShieldCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import { TestConfig, MCQ } from '../types';
import { POPULAR_TESTS } from '../data/mockData';
import { exportMCQsToWatermarkedPDF } from '../utils/watermark';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';

interface TestsExplorerViewProps {
  onStartTest: (config: TestConfig) => void;
  allMCQs: MCQ[];
  studentName: string;
  tests?: TestConfig[];
}

export const TestsExplorerView: React.FC<TestsExplorerViewProps> = ({
  onStartTest,
  allMCQs,
  studentName,
  tests = POPULAR_TESTS,
}) => {
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const testTypes = [
    'All',
    'Chapter Test',
    'Subject Test',
    'Full Book Test',
    'Board Test',
    'Mock Test',
    'Entry Test',
    'Competitive Exam Test',
    'Daily Test',
    'Practice Test',
  ];

  const subjects = ['All', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'Pakistan Studies', 'General Knowledge'];
  const classes = ['All', 'Class 9 (Matric Pt 1)', 'Class 10 (Matric Pt 2)', 'Class 11 (FSc Pt 1)', 'Class 12 (FSc Pt 2)', 'MDCAT / Pre-Med', 'ECAT / Pre-Eng', 'CSS / PMS'];

  const matchesTestType = (t: TestConfig, type: string): boolean => {
    if (type === 'All') return true;
    const tType = (t.testType || '').trim().toLowerCase();
    const tTitle = (t.title || '').trim().toLowerCase();
    const tCat = (t.category || '').trim().toLowerCase();
    const target = type.trim().toLowerCase();

    if (tType === target || tType.includes(target) || target.includes(tType)) return true;

    if (type === 'Chapter Test') return tType.includes('chapter') || tTitle.includes('chapter') || tCat.includes('chapter');
    if (type === 'Subject Test') return tType.includes('subject') || tTitle.includes('subject') || tCat.includes('subject');
    if (type === 'Full Book Test') return tType.includes('full book') || tType.includes('full-book') || tType.includes('fullbook') || tTitle.includes('full book') || tTitle.includes('full-book');
    if (type === 'Board Test') return tType.includes('board') || tTitle.includes('board') || tCat.includes('board') || tCat.includes('matric') || tCat.includes('inter');
    if (type === 'Mock Test') return tType.includes('mock') || tTitle.includes('mock') || tCat.includes('mock');
    if (type === 'Entry Test') return tType.includes('entry') || tTitle.includes('entry') || tCat.includes('entry') || tCat.includes('mdcat') || tCat.includes('ecat');
    if (type === 'Competitive Exam Test') return tType.includes('competitive') || tType.includes('css') || tType.includes('pms') || tCat.includes('competitive') || tCat.includes('css') || tCat.includes('pms');
    if (type === 'Daily Test') return tType.includes('daily') || tTitle.includes('daily') || tTitle.includes('quiz') || tCat.includes('daily');
    if (type === 'Practice Test') return tType.includes('practice') || tTitle.includes('practice') || tTitle.includes('drill') || tCat.includes('practice');

    return false;
  };

  const filteredTests = tests.filter((t) => {
    const matchesType = matchesTestType(t, selectedType);
    const matchesSubject = selectedSubject === 'All' || t.subject === selectedSubject;
    const matchesClass = selectedClass === 'All' || t.classLevel === selectedClass;
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSubject && matchesClass && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-blue-500/20">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="max-w-2xl relative z-10 space-y-3">
          <Badge variant="cyan" size="sm" icon={<FileCheck className="w-3.5 h-3.5" />}>
            Curriculum-Aligned Practice Tests
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Online Examination Center
          </h1>
          <p className="text-blue-100/85 text-xs sm:text-sm md:text-base leading-relaxed">
            Chapter Tests, Full Book Tests, Board-Pattern Papers, and Competitive Exam Mocks with real-time countdown timer, question palette navigation, negative marking, and instant result breakdown.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-5 sm:p-6 space-y-4">
        {/* Test Types Quick Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs scrollbar-none">
          {testTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedType === type
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {type === 'All' ? 'All Test Types' : type}
            </button>
          ))}
        </div>

        {/* Dropdowns & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Class / Level</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Search Tests</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, chapter..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <EmptyState
          title="No tests available for this test type."
          description="No tests match your selected test type and filter criteria. Try selecting 'All Test Types' or resetting filters."
          actionLabel="Reset All Filters"
          onAction={() => {
            setSelectedType('All');
            setSelectedSubject('All');
            setSelectedClass('All');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTests.map((test) => (
            <Card
              key={test.id}
              hoverLift
              className="p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="blue" size="xs">
                    {test.testType}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{test.durationMinutes} mins</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{test.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {test.classLevel} • {test.board || 'All Boards'}
                </p>

                <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
                  <Badge variant="slate" size="xs">
                    {test.totalQuestions} MCQs
                  </Badge>
                  <Badge variant="slate" size="xs">
                    {test.totalMarks} Marks
                  </Badge>
                  {test.negativeMarking && (
                    <Badge variant="rose" size="xs">
                      -0.25 Neg. Marking
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() =>
                    exportMCQsToWatermarkedPDF(
                      test.title,
                      `${test.subject} • ${test.classLevel}`,
                      allMCQs.slice(0, 10),
                      { studentName }
                    )
                  }
                  className="p-2.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
                  title="Download Test Paper (PDF)"
                >
                  <Download className="w-4 h-4" />
                </button>

                <Button
                  variant="primary"
                  size="xs"
                  leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                  onClick={() => onStartTest(test)}
                >
                  Start Online Test
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
