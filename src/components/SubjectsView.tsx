import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Search,
  ArrowRight,
  Play,
  FileText,
  CheckCircle2,
  Landmark,
} from 'lucide-react';
import { MCQ, PastPaper, StudyNote, TestConfig } from '../types';
import { parseNavContext, NavigationContext, matchesClassGrade, normalizeClassLevel } from '../utils/navigationContext';
import { useToast } from './ui/Toast';

export interface SubjectItem {
  id: string;
  name: string;
  category: 'Science' | 'Arts & Languages' | 'Compulsory' | 'Technology';
  icon: string;
  accentColor: string;
  description: string;
  classes: string[];
  chaptersCount?: number;
  mcqsCount?: number;
  testsCount?: number;
  keyChapters?: string[];
}

// Backward compatibility stub for dropdowns in admin panels
export const SUBJECTS_LIST: SubjectItem[] = [
  { id: 'physics', name: 'Physics', category: 'Science', icon: '⚡', accentColor: '', description: '', classes: [] },
  { id: 'chemistry', name: 'Chemistry', category: 'Science', icon: '🧪', accentColor: '', description: '', classes: [] },
  { id: 'biology', name: 'Biology', category: 'Science', icon: '🧬', accentColor: '', description: '', classes: [] },
  { id: 'mathematics', name: 'Mathematics', category: 'Science', icon: '📐', accentColor: '', description: '', classes: [] },
  { id: 'computer-science', name: 'Computer Science', category: 'Technology', icon: '💻', accentColor: '', description: '', classes: [] },
  { id: 'english', name: 'English', category: 'Arts & Languages', icon: '📖', accentColor: '', description: '', classes: [] },
  { id: 'urdu', name: 'Urdu', category: 'Arts & Languages', icon: '✍️', accentColor: '', description: '', classes: [] },
  { id: 'pakistan-studies', name: 'Pakistan Studies', category: 'Compulsory', icon: '🇵🇰', accentColor: '', description: '', classes: [] },
  { id: 'islamiat', name: 'Islamiat', category: 'Compulsory', icon: '🕌', accentColor: '', description: '', classes: [] },
];

export interface SubjectsViewProps {
  onStartSubjectTest: (subjectName: string, className: string) => void;
  onStartChapterTest?: (subjectName: string, className: string, chapterName: string) => void;
  isTestAvailable: (subjectName: string, className: string) => boolean;
  onNavigateMCQBank: (subjectName: string, className?: string) => void;
  onNavigatePastPapers: (subjectName: string, className?: string) => void;
  onNavigateNotes: (subjectName: string, className?: string) => void;
  allMCQs: MCQ[];
  allTests?: TestConfig[];
  allPastPapers?: PastPaper[];
  allNotes?: StudyNote[];
  studentName: string;
  initialSubject?: string;
  comparisonContext?: NavigationContext | null;
}

const matchesClassLevel = (itemClass: string, targetClass: string): boolean => {
  return matchesClassGrade(itemClass, targetClass);
};

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  onStartSubjectTest,
  onStartChapterTest,
  isTestAvailable,
  onNavigateMCQBank,
  onNavigatePastPapers,
  onNavigateNotes,
  allMCQs = [],
  allTests = [],
  allPastPapers = [],
  allNotes = [],
  studentName,
  initialSubject = 'All',
  comparisonContext,
}) => {
  const detailRef = useRef<HTMLDivElement | null>(null);

  // 1. Build subjects dynamically from real database records
  const subjectsList = useMemo(() => {
    const map = new Map<string, {
      name: string;
      category: 'Science' | 'Arts & Languages' | 'Compulsory' | 'Technology';
      classes: Set<string>;
    }>();

    const registerSubject = (subName: string, classLevel?: string) => {
      if (!subName || !subName.trim()) return;
      const trimmed = subName.trim();
      const key = trimmed.toLowerCase();
      if (!map.has(key)) {
        let cat: 'Science' | 'Arts & Languages' | 'Compulsory' | 'Technology' = 'Science';
        if (key.includes('english') || key.includes('urdu') || key.includes('lang')) cat = 'Arts & Languages';
        else if (key.includes('pakistan') || key.includes('islamiat') || key.includes('compulsory')) cat = 'Compulsory';
        else if (key.includes('computer') || key.includes('tech')) cat = 'Technology';
        else cat = 'Science';

        map.set(key, {
          name: trimmed,
          category: cat,
          classes: new Set<string>(),
        });
      }
      if (classLevel && classLevel.trim()) {
        const rawClass = classLevel.trim();
        if (matchesClassLevel(rawClass, 'Class 9')) map.get(key)!.classes.add('Class 9');
        if (matchesClassLevel(rawClass, 'Class 10')) map.get(key)!.classes.add('Class 10');
        if (matchesClassLevel(rawClass, 'Class 11')) map.get(key)!.classes.add('Class 11');
        if (matchesClassLevel(rawClass, 'Class 12')) map.get(key)!.classes.add('Class 12');
        if (rawClass.toLowerCase().includes('mdcat')) map.get(key)!.classes.add('MDCAT');
        if (rawClass.toLowerCase().includes('ecat')) map.get(key)!.classes.add('ECAT');
        if (rawClass.toLowerCase().includes('css')) map.get(key)!.classes.add('CSS');
        if (rawClass.toLowerCase().includes('pms')) map.get(key)!.classes.add('PMS');
      }
    };

    allMCQs.forEach((m) => registerSubject(m.subject, m.classLevel));
    allTests.forEach((t) => registerSubject(t.subject, t.classLevel));
    allPastPapers.forEach((p) => registerSubject(p.subject, p.classLevel));
    allNotes.forEach((n) => registerSubject(n.subject, n.classLevel));

    const iconMap: Record<string, string> = {
      physics: '⚡',
      chemistry: '🧪',
      biology: '🧬',
      mathematics: '📐',
      'computer science': '💻',
      english: '📖',
      urdu: '✍️',
      'pakistan studies': '🇵🇰',
      islamiat: '🕌',
      'general science': '🔬',
    };

    const list: SubjectItem[] = [];
    for (const [key, e] of map) {
      list.push({
        id: e.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: e.name,
        category: e.category,
        icon: iconMap[key] || '📚',
        accentColor: 'from-blue-600 to-cyan-500',
        description: `Official curriculum syllabus and academic records for ${e.name}.`,
        classes: Array.from(e.classes),
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [allMCQs, allTests, allPastPapers, allNotes]);

  const ctx = parseNavContext(initialSubject);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    comparisonContext?.subject || (ctx.subject !== 'All' ? ctx.subject : 'All')
  );
  const [selectedClass, setSelectedClass] = useState<string>(
    comparisonContext?.classLevel
      ? normalizeClassLevel(comparisonContext.classLevel)
      : (ctx.classLevel !== 'All' ? normalizeClassLevel(ctx.classLevel) : 'All')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);

  // Sync with initialSubject and comparisonContext
  useEffect(() => {
    if (comparisonContext) {
      setSelectedCategory(comparisonContext.subject);
      setSelectedClass(normalizeClassLevel(comparisonContext.classLevel));
      const subject = subjectsList.find(
        (s) => s.name.toLowerCase() === comparisonContext.subject.toLowerCase()
      );
      if (subject) setSelectedSubject(subject);
    } else {
      const c = parseNavContext(initialSubject);
      if (c.subject && c.subject !== 'All') {
        setSelectedCategory(c.subject);
        const subject = subjectsList.find((s) => s.name.toLowerCase() === c.subject.toLowerCase());
        if (subject) setSelectedSubject(subject);
      }
      setSelectedClass(c.classLevel ? normalizeClassLevel(c.classLevel) : 'All');
    }
  }, [comparisonContext, initialSubject, subjectsList]);

  // Filter subjects strictly based on category, class filter, and search
  const filteredSubjects = useMemo(() => {
    return subjectsList.filter((s) => {
      const matchesCat =
        selectedCategory === 'All' || s.category === selectedCategory || s.name === selectedCategory;
      const matchesClass =
        selectedClass === 'All' || s.classes.some((c) => matchesClassLevel(c, selectedClass));
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesClass && matchesSearch;
    });
  }, [subjectsList, selectedCategory, selectedClass, searchQuery]);

  // Keep selectedSubject synchronized with filteredSubjects and filter changes
  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!selectedSubject || !filteredSubjects.some((s) => s.id === selectedSubject.id)) {
        setSelectedSubject(filteredSubjects[0]);
      }
    } else {
      setSelectedSubject(null);
    }
  }, [filteredSubjects, selectedSubject]);

  // Compute exact, real database statistics for any subject under current class filter
  const getSubjectRealStats = React.useCallback(
    (subjectName: string, targetClass: string) => {
      // 1. Real MCQs
      const matchingMCQs = allMCQs.filter((m) => {
        if (!m || !m.subject) return false;
        if (m.subject.toLowerCase() !== subjectName.toLowerCase()) return false;
        return matchesClassLevel(m.classLevel || '', targetClass);
      });
      const mcqsCount = matchingMCQs.length;

      // 2. Real Chapters
      const chaptersSet = new Set<string>();
      matchingMCQs.forEach((m) => {
        if (m.chapter && m.chapter.trim()) {
          chaptersSet.add(m.chapter.trim());
        }
      });
      allNotes.forEach((n) => {
        if (
          n.subject.toLowerCase() === subjectName.toLowerCase() &&
          matchesClassLevel(n.classLevel || '', targetClass)
        ) {
          if (n.chapter && n.chapter.trim()) {
            chaptersSet.add(n.chapter.trim());
          }
        }
      });
      const chapters = Array.from(chaptersSet);
      const chaptersCount = chapters.length;

      // 3. Real Tests
      const matchingTests = allTests.filter((t) => {
        if (!t || !t.subject) return false;
        if (t.subject.toLowerCase() !== subjectName.toLowerCase()) return false;
        return matchesClassLevel(t.classLevel || '', targetClass);
      });
      const testsCount = matchingTests.length;

      // 4. Real Past Papers
      const matchingPapers = allPastPapers.filter((p) => {
        if (!p || !p.subject) return false;
        if (p.subject.toLowerCase() !== subjectName.toLowerCase()) return false;
        return matchesClassLevel(p.classLevel || '', targetClass);
      });
      const pastPapersCount = matchingPapers.length;

      // 5. Real Study Notes
      const matchingNotes = allNotes.filter((n) => {
        if (!n || !n.subject) return false;
        if (n.subject.toLowerCase() !== subjectName.toLowerCase()) return false;
        return matchesClassLevel(n.classLevel || '', targetClass);
      });
      const notesCount = matchingNotes.length;

      return {
        mcqsCount,
        chaptersCount,
        testsCount,
        pastPapersCount,
        notesCount,
        chapters,
      };
    },
    [allMCQs, allTests, allPastPapers, allNotes]
  );

  const { showToast } = useToast();

  const normalizeChapterStr = (str: string): string => {
    if (!str) return '';
    return str
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/^(chapter|ch|unit)\s*\d*[:\.-]?\s*/i, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const matchesChapterStr = (c1?: string, c2?: string): boolean => {
    if (!c1 || !c2) return false;
    const n1 = normalizeChapterStr(c1);
    const n2 = normalizeChapterStr(c2);
    if (!n1 || !n2) return false;
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  };

  // Helper to check chapter test availability
  const isChapterTestAvailable = React.useCallback(
    (subjectName: string, targetClass: string, chapterName: string): boolean => {
      const hasInAllTests = allTests.some(
        (t) =>
          t.subject.toLowerCase() === subjectName.toLowerCase() &&
          matchesClassLevel(t.classLevel || '', targetClass) &&
          ((t.chapter && matchesChapterStr(t.chapter, chapterName)) ||
            matchesChapterStr(t.title, chapterName))
      );
      if (hasInAllTests) return true;

      return allMCQs.some(
        (m) =>
          m.subject.toLowerCase() === subjectName.toLowerCase() &&
          matchesClassLevel(m.classLevel || '', targetClass) &&
          m.chapter &&
          matchesChapterStr(m.chapter, chapterName)
      );
    },
    [allTests, allMCQs]
  );

  // Helper to check test availability
  const testAvailable = useMemo(() => {
    if (!selectedSubject) return false;
    return isTestAvailable(selectedSubject.name, selectedClass);
  }, [selectedSubject, selectedClass, isTestAvailable]);

  // Handle subject card click (make fully clickable, select subject, and scroll into view)
  const handleSelectSubject = (subject: SubjectItem) => {
    setSelectedSubject(subject);
    if (detailRef.current && window.innerWidth < 1024) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-cyan-300 border border-white/10 mb-3 backdrop-blur-md">
            <BookOpen className="w-3.5 h-3.5" /> All Academic & Board Subjects
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Subjects Learning & Examination Center
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
            Master every subject for Class 9, Class 10, Class 11, Class 12, MDCAT, ECAT, CSS, and PMS with chapter-wise MCQs, online tests, solved past papers, and comprehensive notes.
          </p>
        </div>
      </div>

      {comparisonContext && (
        <div className="p-4 bg-blue-50/80 dark:bg-slate-800/80 rounded-2xl border border-blue-200 dark:border-slate-700 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Active Syllabus Target: {comparisonContext.board} • {comparisonContext.classLevel} • {comparisonContext.subject}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Curriculum modules and chapters targeted specifically for {comparisonContext.board} ({comparisonContext.classLevel}).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Class Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {['All', 'Science', 'Compulsory', 'Technology', 'Arts & Languages'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-slate-400 text-[11px] uppercase font-bold">Class:</span>
            {['All', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                  selectedClass === cls
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects (e.g., Mathematics, Physics, English, Urdu, Biology)..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-2xl text-xs border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>

      {/* Main Content Grid: Subjects Cards (Left) + Detailed Subject Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Subjects Cards List (5 cols) */}
        <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {filteredSubjects.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                No subject data available
              </p>
            </div>
          ) : (
            filteredSubjects.map((subject) => {
              const isSelected = selectedSubject?.id === subject.id;
              const stats = getSubjectRealStats(subject.name, selectedClass);

              // Build real statistics labels only for available non-zero values
              const statsParts: string[] = [];
              if (stats.chaptersCount > 0) {
                statsParts.push(`${stats.chaptersCount} Chapter${stats.chaptersCount > 1 ? 's' : ''}`);
              }
              if (stats.mcqsCount > 0) {
                statsParts.push(`${stats.mcqsCount} MCQs`);
              }
              if (stats.testsCount > 0) {
                statsParts.push(`${stats.testsCount} Test${stats.testsCount > 1 ? 's' : ''}`);
              }
              if (stats.pastPapersCount > 0) {
                statsParts.push(`${stats.pastPapersCount} Past Paper${stats.pastPapersCount > 1 ? 's' : ''}`);
              }
              if (stats.notesCount > 0) {
                statsParts.push(`${stats.notesCount} Note${stats.notesCount > 1 ? 's' : ''}`);
              }

              return (
                <button
                  type="button"
                  key={subject.id}
                  onClick={() => handleSelectSubject(subject)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-slate-800/90 border-blue-500 shadow-md ring-1 ring-blue-400/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-xs shrink-0">
                      {subject.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">
                          {subject.name}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {subject.category}
                        </span>
                      </div>
                      {/* Only display statistics row if real statistics are available; otherwise hide completely */}
                      {statsParts.length > 0 && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {statsParts.join(' • ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected
                        ? 'text-blue-600 dark:text-cyan-400 translate-x-1'
                        : 'text-slate-400'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Right: Selected Subject Detail Console (7 cols) */}
        <div
          ref={detailRef}
          className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6"
        >
          {filteredSubjects.length === 0 || !selectedSubject ? (
            <div className="p-12 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                No subject data available
              </h3>
              <p className="text-xs text-slate-500">
                Please select another class or filter to view available subjects.
              </p>
            </div>
          ) : (
            (() => {
              const activeStats = getSubjectRealStats(selectedSubject.name, selectedClass);
              const hasAnyStats =
                activeStats.chaptersCount > 0 ||
                activeStats.mcqsCount > 0 ||
                activeStats.testsCount > 0 ||
                activeStats.pastPapersCount > 0 ||
                activeStats.notesCount > 0;

              return (
                <div className="space-y-6">
                  {/* Header of Selected Subject */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{selectedSubject.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            {selectedSubject.name}
                          </h2>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {selectedSubject.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {selectedSubject.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          testAvailable
                            ? onStartSubjectTest(selectedSubject.name, selectedClass)
                            : alert('No practice test available for this class and subject yet.')
                        }
                        disabled={!testAvailable}
                        className={`flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors ${
                          !testAvailable ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{testAvailable ? 'Start Subject Test' : 'No Test Available'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Metrics Bar - only display non-zero real values. Hide completely if no real statistics available */}
                  {hasAnyStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {activeStats.chaptersCount > 0 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                          <div className="text-lg font-black text-slate-900 dark:text-white">
                            {activeStats.chaptersCount}
                          </div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Chapters</span>
                        </div>
                      )}
                      {activeStats.mcqsCount > 0 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                          <div className="text-lg font-black text-blue-600 dark:text-cyan-400">
                            {activeStats.mcqsCount}
                          </div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">MCQs Available</span>
                        </div>
                      )}
                      {activeStats.testsCount > 0 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {activeStats.testsCount}
                          </div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Online Tests</span>
                        </div>
                      )}
                      {activeStats.pastPapersCount > 0 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                          <div className="text-lg font-black text-purple-600 dark:text-purple-400">
                            {activeStats.pastPapersCount}
                          </div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Past Papers</span>
                        </div>
                      )}
                      {activeStats.notesCount > 0 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                          <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                            {activeStats.notesCount}
                          </div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Study Notes</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grade & Exam Applicability */}
                  {selectedSubject.classes && selectedSubject.classes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        Applicable Classes & Examination Portals
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedSubject.classes.map((cls) => {
                          const normCls = normalizeClassLevel(cls);
                          const isClassActive = matchesClassGrade(cls, selectedClass);
                          return (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => setSelectedClass(normCls)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                isClassActive
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              🎓 {cls}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Key Chapters & Syllabus Modules - only display if real chapters exist */}
                  {activeStats.chapters.length > 0 && (
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
                        Core Syllabus Modules & Chapter Breakdown
                      </h4>
                      <div className="space-y-2">
                        {activeStats.chapters.map((ch, idx) => {
                          const hasChapterTest = isChapterTestAvailable(
                            selectedSubject.name,
                            selectedClass,
                            ch
                          );
                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs hover:border-blue-400 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 font-semibold text-slate-800 dark:text-slate-200">
                                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black text-[10px] flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <span>{ch}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onStartChapterTest) {
                                    onStartChapterTest(selectedSubject.name, selectedClass, ch);
                                  } else if (hasChapterTest) {
                                    onStartSubjectTest(selectedSubject.name, selectedClass);
                                  } else {
                                    showToast({
                                      type: 'info',
                                      title: 'No practice test available',
                                      message: 'No practice test available for this chapter.',
                                    });
                                  }
                                }}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                                  hasChapterTest
                                    ? 'text-blue-600 dark:text-cyan-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:underline'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50'
                                }`}
                                aria-label={`Start test for ${ch}`}
                              >
                                <span>Test</span>
                                {hasChapterTest ? <ArrowRight className="w-3 h-3" /> : null}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Portals */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const targetCls = selectedClass !== 'All' ? normalizeClassLevel(selectedClass) : undefined;
                        onNavigateMCQBank(selectedSubject.name, targetCls);
                      }}
                      className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-xs flex flex-col items-center justify-center gap-1 text-center transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Practice {selectedSubject.name} MCQs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const targetCls = selectedClass !== 'All' ? normalizeClassLevel(selectedClass) : undefined;
                        onNavigatePastPapers(selectedSubject.name, targetCls);
                      }}
                      className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold text-xs flex flex-col items-center justify-center gap-1 text-center transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Past Papers</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const targetCls = selectedClass !== 'All' ? normalizeClassLevel(selectedClass) : undefined;
                        onNavigateNotes(selectedSubject.name, targetCls);
                      }}
                      className="p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold text-xs flex flex-col items-center justify-center gap-1 text-center transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Download Notes</span>
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};
