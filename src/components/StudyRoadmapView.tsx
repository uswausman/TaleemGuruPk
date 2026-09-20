import React, { useState, useMemo } from 'react';
import {
  Compass,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Zap,
  BookOpen,
  ArrowRight,
  Filter,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  BarChart2,
  ListOrdered,
  Layers,
  GraduationCap,
  TrendingUp,
  Target,
  FileText,
  Star,
  Check,
  X,
  HelpCircle,
  CheckSquare,
  Square,
  CheckCheck,
  BookCheck,
} from 'lucide-react';
import { MCQ, TestConfig, TestResult, ChapterInfo, StudentProfile } from '../types';
import { ACADEMIC_CHAPTERS, ACADEMIC_SUBJECTS, MASTER_STUDY_NOTES } from '../data/educationalHierarchy';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { StudyRoadmapTrendsChart } from './StudyRoadmapTrendsChart';

export interface ChapterProgressStats {
  chapter: ChapterInfo;
  subjectName: string;
  classLevel: string;
  totalAvailableMCQs: number;
  attemptedCount: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  coverageRate: number; // % of total available MCQs practiced
  masteryTier: 'Mastered' | 'Proficient' | 'Needs Practice' | 'Not Started';
  wrongQuestions: MCQ[];
  lastPracticedDate?: string;
  completedTopicCount: number;
}

export interface SubjectRoadmapSummary {
  subjectId: string;
  subjectName: string;
  icon: string;
  accentColor: string;
  totalChapters: number;
  masteredChapters: number;
  inProgressChapters: number;
  unexploredChapters: number;
  totalAvailableMCQs: number;
  totalAttemptedMCQs: number;
  totalCorrectMCQs: number;
  averageAccuracy: number;
  syllabusCoverageRate: number;
}

interface StudyRoadmapViewProps {
  student: StudentProfile | null;
  historyResults: TestResult[];
  allMCQs: MCQ[];
  onStartTestConfig?: (config: TestConfig) => void;
  onNavigateNotes?: () => void;
  onNavigatePastPapers?: () => void;
  onPracticeWrongQuestions?: (mcqs: MCQ[]) => void;
}

export const StudyRoadmapView: React.FC<StudyRoadmapViewProps> = ({
  student,
  historyResults = [],
  allMCQs = [],
  onStartTestConfig,
  onNavigateNotes,
  onNavigatePastPapers,
  onPracticeWrongQuestions,
}) => {
  // State
  const [selectedClass, setSelectedClass] = useState<string>(student?.classLevel || 'All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Mastered' | 'In Progress' | 'Needs Practice' | 'Not Started'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewLayout, setViewLayout] = useState<'timeline' | 'checklist' | 'grid' | 'subjects' | 'trends'>('timeline');
  const [selectedChapterModal, setSelectedChapterModal] = useState<ChapterProgressStats | null>(null);
  const [expandedChapterIds, setExpandedChapterIds] = useState<Record<string, boolean>>({});

  // Local student completed topics state
  const [userCheckedTopicIds, setUserCheckedTopicIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('taleem_checked_topics');
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const handleToggleTopic = (topicId: string) => {
    setUserCheckedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      try {
        localStorage.setItem('taleem_checked_topics', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleChapterExpand = (chapterId: string) => {
    setExpandedChapterIds((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    filteredChapters.forEach((c) => {
      allExpanded[c.chapter.id] = true;
    });
    setExpandedChapterIds(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedChapterIds({});
  };

  // 1. Compile all practice history data question-by-question
  const questionAttemptMap = useMemo(() => {
    const map = new Map<string, { total: number; correct: number; wrong: number; lastDate: string }>();

    // Build question lookup map from allMCQs
    const mcqLookup = new Map<string, MCQ>();
    allMCQs.forEach((m) => mcqLookup.set(m.id, m));

    historyResults.forEach((res) => {
      if (res.questions) {
        res.questions.forEach((q) => mcqLookup.set(q.id, q));
      }

      if (!res.answers) return;
      res.answers.forEach((ans) => {
        const existing = map.get(ans.questionId) || { total: 0, correct: 0, wrong: 0, lastDate: res.timestamp || 'Recent' };
        existing.total += 1;
        
        const q = mcqLookup.get(ans.questionId);
        const isCorrect = (ans as any).isCorrect ?? (q && ans.selectedOption !== null && ans.selectedOption === q.correctAnswer);
        
        if (isCorrect) {
          existing.correct += 1;
        } else {
          existing.wrong += 1;
        }
        existing.lastDate = res.timestamp || 'Recent';
        map.set(ans.questionId, existing);
      });
    });

    return map;
  }, [historyResults, allMCQs]);

  // 2. Discover and merge all chapters (Academic static + dynamically discovered from MCQs)
  const allChapterProgress = useMemo<ChapterProgressStats[]>(() => {
    // Collect unique chapter names and subjects from allMCQs
    const rawChaptersMap = new Map<string, ChapterInfo>();

    // Seed with official ACADEMIC_CHAPTERS
    ACADEMIC_CHAPTERS.forEach((chap) => {
      rawChaptersMap.set(`${chap.subjectName.toLowerCase()}_${chap.name.toLowerCase()}`, chap);
    });

    // Also discover any chapter in allMCQs not explicitly in static list
    allMCQs.forEach((mcq) => {
      if (!mcq.chapter || !mcq.subject) return;
      const key = `${mcq.subject.toLowerCase()}_${mcq.chapter.toLowerCase()}`;
      if (!rawChaptersMap.has(key)) {
        rawChaptersMap.set(key, {
          id: `dyn-chap-${mcq.subject.toLowerCase()}-${mcq.chapter.toLowerCase().replace(/\s+/g, '-')}`,
          subjectId: mcq.subject.toLowerCase().replace(/\s+/g, '-'),
          subjectName: mcq.subject,
          classLevel: mcq.classLevel || 'General',
          chapterNumber: rawChaptersMap.size + 1,
          name: mcq.chapter,
          description: `Comprehensive syllabus study module for ${mcq.chapter} in ${mcq.subject}.`,
          topics: mcq.topic
            ? [
                {
                  id: `dyn-top-${mcq.id}`,
                  chapterId: `dyn-chap-${mcq.chapter}`,
                  topicNumber: '1.1',
                  title: mcq.topic,
                  keyPoints: [`Core concept practice for ${mcq.topic}`],
                },
              ]
            : [],
        });
      }
    });

    // Calculate progress for each chapter
    const progressList: ChapterProgressStats[] = [];

    rawChaptersMap.forEach((chap) => {
      // Find all MCQs belonging to this chapter
      const chapterMCQs = allMCQs.filter((m) => {
        const matchesSubject = m.subject?.toLowerCase() === chap.subjectName?.toLowerCase();
        const matchesChapter =
          m.chapter?.toLowerCase() === chap.name?.toLowerCase() ||
          m.chapter?.toLowerCase().includes(chap.name?.toLowerCase()) ||
          chap.name?.toLowerCase().includes(m.chapter?.toLowerCase());
        return matchesSubject && matchesChapter;
      });

      const totalAvailableMCQs = chapterMCQs.length > 0 ? chapterMCQs.length : 10; // Baseline available

      let attemptedCount = 0;
      let correctCount = 0;
      let wrongCount = 0;
      let lastDate: string | undefined = undefined;
      const wrongQuestionsList: MCQ[] = [];

      chapterMCQs.forEach((mcq) => {
        const stat = questionAttemptMap.get(mcq.id);
        if (stat) {
          attemptedCount += stat.total;
          correctCount += stat.correct;
          wrongCount += stat.wrong;
          lastDate = stat.lastDate;
          if (stat.wrong > 0) {
            wrongQuestionsList.push(mcq);
          }
        }
      });

      // Accuracy calculation
      const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
      const coverageRate = Math.min(100, Math.round((attemptedCount / totalAvailableMCQs) * 100));

      // Mastery tier
      let masteryTier: 'Mastered' | 'Proficient' | 'Needs Practice' | 'Not Started' = 'Not Started';
      if (attemptedCount === 0) {
        masteryTier = 'Not Started';
      } else if (accuracy >= 80 && attemptedCount >= 4) {
        masteryTier = 'Mastered';
      } else if (accuracy >= 60) {
        masteryTier = 'Proficient';
      } else {
        masteryTier = 'Needs Practice';
      }

      // Estimate completed topics
      const completedTopicCount =
        masteryTier === 'Mastered'
          ? chap.topics?.length || 1
          : masteryTier === 'Proficient'
          ? Math.max(1, Math.floor((chap.topics?.length || 1) * 0.75))
          : masteryTier === 'Needs Practice'
          ? Math.max(1, Math.floor((chap.topics?.length || 1) * 0.4))
          : 0;

      progressList.push({
        chapter: chap,
        subjectName: chap.subjectName,
        classLevel: chap.classLevel,
        totalAvailableMCQs,
        attemptedCount,
        correctCount,
        wrongCount,
        accuracy,
        coverageRate,
        masteryTier,
        wrongQuestions: wrongQuestionsList,
        lastPracticedDate: lastDate,
        completedTopicCount,
      });
    });

    // Sort chapters cleanly by subject then chapter number
    return progressList.sort((a, b) => {
      if (a.subjectName !== b.subjectName) {
        return a.subjectName.localeCompare(b.subjectName);
      }
      return (a.chapter.chapterNumber || 0) - (b.chapter.chapterNumber || 0);
    });
  }, [allMCQs, questionAttemptMap]);

  // 3. Subject-level Summaries for Radar / Grid
  const subjectSummaries = useMemo<SubjectRoadmapSummary[]>(() => {
    const map = new Map<string, SubjectRoadmapSummary>();

    ACADEMIC_SUBJECTS.forEach((sub) => {
      map.set(sub.name.toLowerCase(), {
        subjectId: sub.id,
        subjectName: sub.name,
        icon: sub.icon || '📚',
        accentColor: sub.accentColor || 'from-blue-600 to-indigo-600',
        totalChapters: 0,
        masteredChapters: 0,
        inProgressChapters: 0,
        unexploredChapters: 0,
        totalAvailableMCQs: 0,
        totalAttemptedMCQs: 0,
        totalCorrectMCQs: 0,
        averageAccuracy: 0,
        syllabusCoverageRate: 0,
      });
    });

    allChapterProgress.forEach((item) => {
      const key = item.subjectName.toLowerCase();
      let summary = map.get(key);
      if (!summary) {
        summary = {
          subjectId: item.chapter.subjectId || key,
          subjectName: item.subjectName,
          icon: '📖',
          accentColor: 'from-slate-600 to-slate-800',
          totalChapters: 0,
          masteredChapters: 0,
          inProgressChapters: 0,
          unexploredChapters: 0,
          totalAvailableMCQs: 0,
          totalAttemptedMCQs: 0,
          totalCorrectMCQs: 0,
          averageAccuracy: 0,
          syllabusCoverageRate: 0,
        };
        map.set(key, summary);
      }

      summary.totalChapters += 1;
      summary.totalAvailableMCQs += item.totalAvailableMCQs;
      summary.totalAttemptedMCQs += item.attemptedCount;
      summary.totalCorrectMCQs += item.correctCount;

      if (item.masteryTier === 'Mastered') {
        summary.masteredChapters += 1;
      } else if (item.masteryTier === 'Proficient' || item.masteryTier === 'Needs Practice') {
        summary.inProgressChapters += 1;
      } else {
        summary.unexploredChapters += 1;
      }
    });

    // Compute averages
    return Array.from(map.values())
      .filter((s) => s.totalChapters > 0)
      .map((s) => {
        const accuracy = s.totalAttemptedMCQs > 0 ? Math.round((s.totalCorrectMCQs / s.totalAttemptedMCQs) * 100) : 0;
        const coverage = s.totalAvailableMCQs > 0 ? Math.min(100, Math.round((s.totalAttemptedMCQs / s.totalAvailableMCQs) * 100)) : 0;
        return {
          ...s,
          averageAccuracy: accuracy,
          syllabusCoverageRate: coverage,
        };
      });
  }, [allChapterProgress]);

  // 4. Filtered Chapter List
  const filteredChapters = useMemo(() => {
    return allChapterProgress.filter((item) => {
      // Class filter
      if (selectedClass !== 'All') {
        const normSelected = selectedClass.toLowerCase();
        const normItemClass = item.classLevel.toLowerCase();
        if (!normItemClass.includes(normSelected) && !normSelected.includes(normItemClass)) {
          // If class is e.g. "Class 10 (Matric Pt 2)" vs "Class 10"
          if (
            !(selectedClass.includes('10') && item.classLevel.includes('10')) &&
            !(selectedClass.includes('9') && item.classLevel.includes('9')) &&
            !(selectedClass.includes('11') && item.classLevel.includes('11')) &&
            !(selectedClass.includes('12') && item.classLevel.includes('12')) &&
            !(selectedClass.includes('MDCAT') && (item.classLevel.includes('MDCAT') || item.classLevel.includes('11') || item.classLevel.includes('12'))) &&
            !(selectedClass.includes('ECAT') && (item.classLevel.includes('ECAT') || item.classLevel.includes('11') || item.classLevel.includes('12')))
          ) {
            return false;
          }
        }
      }

      // Subject filter
      if (selectedSubject !== 'All' && item.subjectName.toLowerCase() !== selectedSubject.toLowerCase()) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'In Progress' && item.masteryTier !== 'Proficient' && item.masteryTier !== 'Needs Practice') {
          return false;
        } else if (statusFilter !== 'In Progress' && item.masteryTier !== statusFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.chapter.name.toLowerCase().includes(query);
        const matchesSubject = item.subjectName.toLowerCase().includes(query);
        const matchesDesc = item.chapter.description.toLowerCase().includes(query);
        const matchesTopics = item.chapter.topics?.some((t) => t.title.toLowerCase().includes(query) || t.keyPoints?.some((k) => k.toLowerCase().includes(query)));
        return matchesName || matchesSubject || matchesDesc || matchesTopics;
      }

      return true;
    });
  }, [allChapterProgress, selectedClass, selectedSubject, statusFilter, searchQuery]);

  // Overall Global Progress Statistics
  const globalStats = useMemo(() => {
    const totalChapters = allChapterProgress.length;
    const masteredCount = allChapterProgress.filter((c) => c.masteryTier === 'Mastered').length;
    const proficientCount = allChapterProgress.filter((c) => c.masteryTier === 'Proficient').length;
    const needsPracticeCount = allChapterProgress.filter((c) => c.masteryTier === 'Needs Practice').length;
    const totalAttempted = allChapterProgress.reduce((acc, c) => acc + c.attemptedCount, 0);
    const totalCorrect = allChapterProgress.reduce((acc, c) => acc + c.correctCount, 0);
    const totalAvailable = allChapterProgress.reduce((acc, c) => acc + c.totalAvailableMCQs, 0);

    const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
    const syllabusProgress = totalChapters > 0 ? Math.round(((masteredCount + proficientCount * 0.6) / totalChapters) * 100) : 0;
    const examReadinessScore = Math.min(100, Math.round(syllabusProgress * 0.6 + overallAccuracy * 0.4));

    // Identify next recommended milestone chapter (e.g. first in needs practice or first unexplored)
    const nextMilestone =
      allChapterProgress.find((c) => c.masteryTier === 'Needs Practice') ||
      allChapterProgress.find((c) => c.masteryTier === 'Not Started') ||
      allChapterProgress[0];

    return {
      totalChapters,
      masteredCount,
      proficientCount,
      needsPracticeCount,
      totalAttempted,
      totalCorrect,
      totalAvailable,
      overallAccuracy,
      syllabusProgress,
      examReadinessScore,
      nextMilestone,
    };
  }, [allChapterProgress]);

  // Quick Action: Launch Topic-Level Test Drill
  const handleLaunchTopicTest = (chapterStat: ChapterProgressStats, topicTitle: string, questionCount = 5) => {
    if (!onStartTestConfig) return;

    // Filter MCQs matching this specific topic or chapter
    let pool = allMCQs.filter((m) => {
      const matchesSubject = m.subject.toLowerCase() === chapterStat.subjectName.toLowerCase();
      const matchesTopic = m.topic?.toLowerCase().includes(topicTitle.toLowerCase()) || topicTitle.toLowerCase().includes(m.topic?.toLowerCase() || '');
      const matchesChapter = m.chapter?.toLowerCase() === chapterStat.chapter.name.toLowerCase() || chapterStat.chapter.name.toLowerCase().includes(m.chapter?.toLowerCase() || '');
      return matchesSubject && (matchesTopic || matchesChapter);
    });

    if (pool.length === 0) {
      pool = allMCQs.filter((m) => m.subject.toLowerCase() === chapterStat.subjectName.toLowerCase());
    }

    const testQuestions = pool.slice(0, questionCount);

    const config: TestConfig = {
      id: `roadmap-topic-test-${Date.now()}`,
      title: `${topicTitle} - Topic Concept Drill`,
      description: `Targeted 5-minute mastery drill for ${topicTitle} (${chapterStat.chapter.name} • ${chapterStat.subjectName})`,
      category: 'Chapter Test',
      subject: chapterStat.subjectName,
      chapter: chapterStat.chapter.name,
      durationMinutes: Math.max(4, Math.ceil(testQuestions.length * 1.5)),
      totalQuestions: testQuestions.length,
      totalMarks: testQuestions.length,
      testType: 'Chapter Test',
      negativeMarking: false,
      passPercentage: 60,
      questions: testQuestions,
    };

    setSelectedChapterModal(null);
    onStartTestConfig(config);
  };

  // Quick Action: Launch Chapter Test
  const handleLaunchChapterTest = (chapterStat: ChapterProgressStats, questionCount = 10) => {
    if (!onStartTestConfig) return;

    // Filter MCQs matching this chapter
    let pool = allMCQs.filter(
      (m) =>
        m.subject.toLowerCase() === chapterStat.subjectName.toLowerCase() &&
        (m.chapter?.toLowerCase() === chapterStat.chapter.name.toLowerCase() ||
          m.chapter?.toLowerCase().includes(chapterStat.chapter.name.toLowerCase()) ||
          chapterStat.chapter.name.toLowerCase().includes(m.chapter?.toLowerCase() || ''))
    );

    if (pool.length === 0) {
      // Fallback to subject pool
      pool = allMCQs.filter((m) => m.subject.toLowerCase() === chapterStat.subjectName.toLowerCase());
    }

    const testQuestions = pool.slice(0, questionCount);

    const config: TestConfig = {
      id: `roadmap-test-${Date.now()}`,
      title: `${chapterStat.chapter.name} - Roadmap Milestone Quiz`,
      description: `Targeted concept mastery practice for ${chapterStat.chapter.name} (${chapterStat.subjectName})`,
      category: 'Chapter Test',
      subject: chapterStat.subjectName,
      chapter: chapterStat.chapter.name,
      durationMinutes: Math.max(5, Math.ceil(testQuestions.length * 1.5)),
      totalQuestions: testQuestions.length,
      totalMarks: testQuestions.length,
      testType: 'Chapter Test',
      negativeMarking: false,
      passPercentage: 60,
      questions: testQuestions,
    };

    setSelectedChapterModal(null);
    onStartTestConfig(config);
  };

  return (
    <div id="study-roadmap-root" className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & AI Exam Readiness Coach Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 md:p-10 shadow-xl border border-blue-800/40">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Title & Readiness */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
              Personalized Syllabus Navigation
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Academic Study Roadmap & Mastery Trail
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Track your exact syllabus completion across Pakistan Board & Entry Test chapters. Practice MCQs, conquer weak topics, and advance through milestone tiers from beginner to gold mastery.
            </p>

            {/* Micro Stats Bar */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">
                  <strong className="text-white font-bold">{globalStats.masteredCount}</strong> Mastered Chapters
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-300">
                  <strong className="text-white font-bold">{globalStats.proficientCount + globalStats.needsPracticeCount}</strong> In Progress
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-slate-300">
                  <strong className="text-white font-bold">{globalStats.totalAttempted}</strong> MCQs Practiced
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Exam Readiness Scorecard */}
          <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/15 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold">
                  <Target className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Exam Readiness Index</h3>
                  <p className="text-base font-bold text-white">{student?.targetExam || 'Board / MDCAT Finals'}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-cyan-300">
                  {globalStats.examReadinessScore}%
                </span>
                <span className="block text-[11px] text-slate-300 font-medium">Readiness Score</span>
              </div>
            </div>

            {/* Gauge Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-300">
                <span>Syllabus Coverage: {globalStats.syllabusProgress}%</span>
                <span>Accuracy: {globalStats.overallAccuracy}%</span>
              </div>
              <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-linear-to-r from-cyan-400 via-blue-500 to-emerald-400 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.max(5, globalStats.examReadinessScore)}%` }}
                />
              </div>
            </div>

            {/* AI Coach Suggestion */}
            {globalStats.nextMilestone && (
              <div className="pt-2 border-t border-white/10 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-200">
                  <strong className="text-amber-300">Recommended Action:</strong> Practice{' '}
                  <span className="font-bold text-white">{globalStats.nextMilestone.chapter.name}</span> in{' '}
                  <span className="text-cyan-300">{globalStats.nextMilestone.subjectName}</span> to boost your readiness.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Interactive Navigation Controls & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Top Controls Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex-wrap gap-1">
            <button
              onClick={() => setViewLayout('timeline')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'timeline'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              Milestone Trail
            </button>

            <button
              onClick={() => setViewLayout('checklist')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'checklist'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Step-by-Step Checklist
            </button>

            <button
              onClick={() => setViewLayout('grid')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Chapter Matrix
            </button>

            <button
              onClick={() => setViewLayout('subjects')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'subjects'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Subject Overview
            </button>

            <button
              onClick={() => setViewLayout('trends')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'trends'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400" />
              Progress Trends
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chapters, topics, formulas (e.g. Optics, Matrices)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Secondary Dropdown Filters */}
          <div className="flex items-center gap-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="All">All Grades & Levels</option>
              <option value="Class 9">Class 9 (Matric 1)</option>
              <option value="Class 10">Class 10 (Matric 2)</option>
              <option value="Class 11">Class 11 (FSc 1)</option>
              <option value="Class 12">Class 12 (FSc 2)</option>
              <option value="MDCAT">MDCAT Medical</option>
              <option value="ECAT">ECAT Engineering</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="All">All Mastery Levels</option>
              <option value="Mastered">🌟 Mastered (80%+)</option>
              <option value="In Progress">⚡ In Progress</option>
              <option value="Needs Practice">⚠️ Needs Focus</option>
              <option value="Not Started">⚪ Not Started</option>
            </select>
          </div>
        </div>

        {/* Subject Pills Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedSubject('All')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSubject === 'All'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>📚 All Subjects</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
              {allChapterProgress.length}
            </span>
          </button>

          {subjectSummaries.map((sub) => {
            const isSelected = selectedSubject.toLowerCase() === sub.subjectName.toLowerCase();
            return (
              <button
                key={sub.subjectId}
                onClick={() => setSelectedSubject(sub.subjectName)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{sub.icon} {sub.subjectName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
                  {sub.totalChapters}
                </span>
                {sub.masteredChapters > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title={`${sub.masteredChapters} mastered`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Views Render */}

      {/* VIEW A: MILESTONE JOURNEY TIMELINE */}
      {viewLayout === 'timeline' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              Syllabus Progression Pathway ({filteredChapters.length} Chapters)
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Click any milestone to open practice drills & key concepts
            </span>
          </div>

          {filteredChapters.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Chapters Match Filters</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try clearing your search query or selecting "All Subjects" to view the complete curriculum.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSelectedSubject('All');
                  setSelectedClass('All');
                  setStatusFilter('All');
                  setSearchQuery('');
                }}
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3.5 sm:before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-linear-to-b before:from-blue-500 before:via-cyan-400 before:to-emerald-400">
              {filteredChapters.map((item, index) => {
                const isMastered = item.masteryTier === 'Mastered';
                const isProficient = item.masteryTier === 'Proficient';
                const isNeedsPractice = item.masteryTier === 'Needs Practice';
                const isNotStarted = item.masteryTier === 'Not Started';

                return (
                  <div key={item.chapter.id} className="relative group">
                    {/* Milestone Node Badge on the Timeline Line */}
                    <div
                      className={`absolute -left-6 sm:-left-10 top-5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-transform duration-200 group-hover:scale-110 z-10 ${
                        isMastered
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-950'
                          : isProficient
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950'
                          : isNeedsPractice
                          ? 'bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-950'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 ring-4 ring-slate-100 dark:ring-slate-800'
                      }`}
                    >
                      {isMastered ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <span>{item.chapter.chapterNumber || index + 1}</span>
                      )}
                    </div>

                    {/* Milestone Card */}
                    <div
                      onClick={() => setSelectedChapterModal(item)}
                      className={`cursor-pointer rounded-2xl p-5 sm:p-6 transition-all duration-200 border bg-white dark:bg-slate-900 hover:shadow-lg hover:border-blue-400 dark:hover:border-cyan-500 ${
                        isMastered
                          ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : isNeedsPractice
                          ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Title & Metadata */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 border border-blue-200 dark:border-blue-900">
                              {item.subjectName}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {item.classLevel}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">
                              Chapter {item.chapter.chapterNumber || index + 1}
                            </span>

                            {/* Mastery Badge */}
                            {isMastered && (
                              <Badge variant="success" size="sm" className="gap-1">
                                <Award className="w-3 h-3" /> Mastered
                              </Badge>
                            )}
                            {isProficient && (
                              <Badge variant="info" size="sm" className="gap-1">
                                <Zap className="w-3 h-3" /> Proficient
                              </Badge>
                            )}
                            {isNeedsPractice && (
                              <Badge variant="warning" size="sm" className="gap-1">
                                <AlertCircle className="w-3 h-3" /> Needs Focus
                              </Badge>
                            )}
                            {isNotStarted && (
                              <Badge variant="secondary" size="sm">
                                Not Started
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                            {item.chapter.name}
                          </h3>

                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-2xl leading-relaxed">
                            {item.chapter.description}
                          </p>

                          {/* Key Topics List (if available) */}
                          {item.chapter.topics && item.chapter.topics.length > 0 && (
                            <div className="pt-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-slate-400">Key Topics:</span>
                              {item.chapter.topics.slice(0, 3).map((top) => (
                                <span
                                  key={top.id}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium"
                                >
                                  {top.title}
                                </span>
                              ))}
                              {item.chapter.topics.length > 3 && (
                                <span className="text-[10px] text-slate-400 font-bold">
                                  +{item.chapter.topics.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Progress Metrics & Action CTA */}
                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                          <div className="space-y-1 text-left lg:text-right">
                            <div className="flex items-center gap-2 lg:justify-end">
                              <span className="text-xs text-slate-500 dark:text-slate-400">Accuracy:</span>
                              <span
                                className={`text-sm font-black ${
                                  item.accuracy >= 80
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : item.accuracy >= 60
                                    ? 'text-blue-600 dark:text-cyan-400'
                                    : item.accuracy > 0
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {item.attemptedCount > 0 ? `${item.accuracy}%` : '—'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              <strong className="text-slate-700 dark:text-slate-300">{item.attemptedCount}</strong> /{' '}
                              {item.totalAvailableMCQs} MCQs Practiced
                            </div>

                            {/* Mini Progress Bar */}
                            <div className="w-28 sm:w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isMastered
                                    ? 'bg-emerald-500'
                                    : isProficient
                                    ? 'bg-blue-500'
                                    : isNeedsPractice
                                    ? 'bg-amber-500'
                                    : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                                style={{ width: `${item.coverageRate}%` }}
                              />
                            </div>
                          </div>

                          <Button
                            variant={isNeedsPractice ? 'primary' : 'outline'}
                            size="sm"
                            className="gap-1.5 text-xs shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLaunchChapterTest(item);
                            }}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{item.attemptedCount === 0 ? 'Start Chapter' : 'Practice MCQs'}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW B: STEP-BY-STEP TOPIC CHECKLIST */}
      {viewLayout === 'checklist' && (
        <div className="space-y-6">
          {/* Checklist View Sub-Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
                Step-by-Step Syllabus & Topic Mastery Checklist
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track your syllabus topic by topic. Practice high-yield MCQ drills and mark concepts as completed.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleExpandAll}
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleCollapseAll}
              >
                <ChevronUp className="w-3.5 h-3.5" />
                Collapse All
              </Button>
            </div>
          </div>

          {filteredChapters.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Chapters Match Filters</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try clearing your search query or selecting "All Subjects" to view the complete curriculum checklist.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredChapters.map((item, index) => {
                const isExpanded = !!expandedChapterIds[item.chapter.id];
                const topics = item.chapter.topics || [];
                
                // Calculate topic completion for this chapter
                const checkedCount = topics.filter(
                  (t) => userCheckedTopicIds.has(t.id) || item.masteryTier === 'Mastered'
                ).length;
                const totalTopicCount = Math.max(1, topics.length);
                const topicProgressPct = Math.round((checkedCount / totalTopicCount) * 100);

                const isMastered = item.masteryTier === 'Mastered';
                const isProficient = item.masteryTier === 'Proficient';
                const isNeedsPractice = item.masteryTier === 'Needs Practice';

                return (
                  <div
                    key={item.chapter.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
                  >
                    {/* Chapter Header Row */}
                    <div
                      onClick={() => toggleChapterExpand(item.chapter.id)}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3.5 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                            isMastered
                              ? 'bg-emerald-500 text-white'
                              : isProficient
                              ? 'bg-blue-600 text-white'
                              : isNeedsPractice
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isMastered ? <Check className="w-5 h-5 stroke-[3]" /> : `Ch ${item.chapter.chapterNumber || index + 1}`}
                        </div>

                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 border border-blue-200 dark:border-blue-900">
                              {item.subjectName}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {item.classLevel}
                            </span>
                            {isMastered && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                                <Award className="w-3 h-3" /> Mastered
                              </span>
                            )}
                            {isNeedsPractice && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Needs Focus
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {item.chapter.name}
                          </h3>
                        </div>
                      </div>

                      {/* Chapter Progress & Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-4 pl-13 md:pl-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                        {/* Progress stats */}
                        <div className="text-left md:text-right space-y-1">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>{checkedCount} / {topics.length} Topics Done</span>
                            <span className="text-slate-400 ml-1.5 font-normal">({topicProgressPct}%)</span>
                          </div>

                          <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                topicProgressPct === 100
                                  ? 'bg-emerald-500'
                                  : topicProgressPct >= 50
                                  ? 'bg-blue-600 dark:bg-cyan-400'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.max(4, topicProgressPct)}%` }}
                            />
                          </div>

                          <div className="text-[10px] text-slate-400 font-medium">
                            {item.attemptedCount} MCQs Solved • {item.accuracy}% Accuracy
                          </div>
                        </div>

                        {/* Button group */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-xs gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLaunchChapterTest(item);
                            }}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span className="hidden sm:inline">Quiz</span>
                          </Button>

                          <div className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Step-by-Step Topics Sub-Checklist */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-6 space-y-3">
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ListOrdered className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                            Step-by-Step Topic Progression Checklist ({topics.length} Steps)
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            Check box to mark topic as reviewed
                          </span>
                        </div>

                        {topics.length === 0 ? (
                          <div className="text-xs text-slate-500 py-3 text-center">
                            Comprehensive syllabus module covering core concepts and numerical problems for {item.chapter.name}.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {topics.map((topic, tIdx) => {
                              const isChecked = userCheckedTopicIds.has(topic.id) || isMastered;
                              const stepLabel = `Step ${item.chapter.chapterNumber || index + 1}.${tIdx + 1}`;

                              return (
                                <div
                                  key={topic.id}
                                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                    isChecked
                                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                                  }`}
                                >
                                  {/* Left: Checkbox + Topic Details */}
                                  <div className="flex items-start gap-3 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTopic(topic.id)}
                                      className={`mt-0.5 p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                                        isChecked
                                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50'
                                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700'
                                      }`}
                                      title={isChecked ? 'Mark as incomplete' : 'Mark as completed'}
                                    >
                                      {isChecked ? (
                                        <CheckSquare className="w-4 h-4" />
                                      ) : (
                                        <Square className="w-4 h-4" />
                                      )}
                                    </button>

                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                          {stepLabel}
                                        </span>
                                        <h4
                                          className={`text-xs sm:text-sm font-bold ${
                                            isChecked
                                              ? 'text-emerald-950 dark:text-emerald-200 line-through decoration-emerald-500/50'
                                              : 'text-slate-900 dark:text-white'
                                          }`}
                                        >
                                          {topic.title}
                                        </h4>
                                        {topic.important && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                            🔥 High Yield
                                          </span>
                                        )}
                                      </div>

                                      {/* Key points preview */}
                                      {topic.keyPoints && topic.keyPoints.length > 0 && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                          {topic.keyPoints.join(' • ')}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Quick Action buttons */}
                                  <div className="flex items-center gap-2 shrink-0 pl-8 sm:pl-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-[11px] h-7 px-2.5 gap-1"
                                      onClick={() => handleLaunchTopicTest(item, topic.title)}
                                    >
                                      <Zap className="w-3 h-3 text-amber-500" />
                                      5-MCQ Drill
                                    </Button>

                                    {onNavigateNotes && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-[11px] h-7 px-2 gap-1 text-slate-600 dark:text-slate-300"
                                        onClick={onNavigateNotes}
                                      >
                                        <BookOpen className="w-3 h-3" />
                                        Notes
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW C: CHAPTER MATRIX (BENTO GRID) */}
      {viewLayout === 'grid' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              Chapter Matrix & Syllabus Modules ({filteredChapters.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredChapters.map((item, index) => {
              const isMastered = item.masteryTier === 'Mastered';
              const isProficient = item.masteryTier === 'Proficient';
              const isNeedsPractice = item.masteryTier === 'Needs Practice';

              return (
                <div
                  key={item.chapter.id}
                  onClick={() => setSelectedChapterModal(item)}
                  className="cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-cyan-500 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    {/* Header Pill */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 border border-blue-100 dark:border-blue-900">
                        {item.subjectName} • Ch {item.chapter.chapterNumber || index + 1}
                      </span>

                      {isMastered && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <Award className="w-3.5 h-3.5" /> Mastered
                        </span>
                      )}
                      {isProficient && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-cyan-400">
                          <Zap className="w-3.5 h-3.5" /> Proficient
                        </span>
                      )}
                      {isNeedsPractice && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5" /> Needs Focus
                        </span>
                      )}
                      {item.masteryTier === 'Not Started' && (
                        <span className="text-[11px] font-medium text-slate-400">Unexplored</span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {item.chapter.name}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.chapter.description}
                    </p>
                  </div>

                  {/* Progress & Stats Bar */}
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Practiced: {item.attemptedCount} MCQs</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        Accuracy: {item.attemptedCount > 0 ? `${item.accuracy}%` : '—'}
                      </span>
                    </div>

                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isMastered
                            ? 'bg-emerald-500'
                            : isProficient
                            ? 'bg-blue-500'
                            : isNeedsPractice
                            ? 'bg-amber-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        style={{ width: `${Math.max(item.attemptedCount > 0 ? 10 : 0, item.coverageRate)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchChapterTest(item);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-cyan-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Quick Test
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChapterModal(item);
                        }}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        title="View Syllabus Details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW C: SUBJECT RADAR & HEALTH OVERVIEW */}
      {viewLayout === 'subjects' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              Subject Health & Syllabus Completion Matrix
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {subjectSummaries.map((sub) => {
              return (
                <div
                  key={sub.subjectId}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-2xl flex items-center justify-center shadow-inner">
                        {sub.icon}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{sub.subjectName}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {sub.totalChapters} Syllabus Chapters • {sub.totalAvailableMCQs} Question Bank Depth
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-blue-600 dark:text-cyan-400">
                        {sub.averageAccuracy}%
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">Avg Accuracy</span>
                    </div>
                  </div>

                  {/* Chapter Distribution Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                      <span className="block font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {sub.masteredChapters}
                      </span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400">Mastered</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                      <span className="block font-black text-blue-600 dark:text-cyan-400 text-sm">
                        {sub.inProgressChapters}
                      </span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400">In Progress</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="block font-black text-slate-600 dark:text-slate-400 text-sm">
                        {sub.unexploredChapters}
                      </span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400">Unexplored</span>
                    </div>
                  </div>

                  {/* Overall Subject Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Syllabus Coverage:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {Math.round(((sub.masteredChapters + sub.inProgressChapters * 0.5) / Math.max(1, sub.totalChapters)) * 100)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round(((sub.masteredChapters + sub.inProgressChapters * 0.5) / Math.max(1, sub.totalChapters)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Filter by this Subject CTA */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        setSelectedSubject(sub.subjectName);
                        setViewLayout('timeline');
                      }}
                    >
                      <ListOrdered className="w-3 h-3" />
                      View {sub.subjectName} Pathway
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        const firstChapter = allChapterProgress.find(
                          (c) => c.subjectName.toLowerCase() === sub.subjectName.toLowerCase()
                        );
                        if (firstChapter) {
                          handleLaunchChapterTest(firstChapter);
                        }
                      }}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Practice Subject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW E: CUMULATIVE PROGRESS & MASTERY TRENDS (RECHARTS) */}
      {viewLayout === 'trends' && (
        <div className="space-y-6">
          <StudyRoadmapTrendsChart
            historyResults={historyResults}
            allMCQs={allMCQs}
            student={student}
          />
        </div>
      )}

      {/* 4. Interactive Chapter Drilldown Modal / Drawer */}
      {selectedChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 border border-blue-200 dark:border-blue-800">
                    {selectedChapterModal.subjectName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedChapterModal.classLevel}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    Chapter {selectedChapterModal.chapter.chapterNumber || '—'}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {selectedChapterModal.chapter.name}
                </h2>
              </div>

              <button
                onClick={() => setSelectedChapterModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chapter Description */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              {selectedChapterModal.chapter.description}
            </p>

            {/* Performance Analytics Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <span className="block text-lg font-black text-slate-900 dark:text-white">
                  {selectedChapterModal.attemptedCount}
                </span>
                <span className="text-[11px] text-slate-500">MCQs Solved</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <span className="block text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {selectedChapterModal.correctCount}
                </span>
                <span className="text-[11px] text-slate-500">Correct Answers</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <span className="block text-lg font-black text-amber-600 dark:text-amber-400">
                  {selectedChapterModal.wrongCount}
                </span>
                <span className="text-[11px] text-slate-500">Mistakes</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <span
                  className={`block text-lg font-black ${
                    selectedChapterModal.accuracy >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : selectedChapterModal.accuracy >= 60
                      ? 'text-blue-600 dark:text-cyan-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {selectedChapterModal.attemptedCount > 0 ? `${selectedChapterModal.accuracy}%` : '0%'}
                </span>
                <span className="text-[11px] text-slate-500">Mastery Accuracy</span>
              </div>
            </div>

            {/* Syllabus Topic Checklist */}
            {selectedChapterModal.chapter.topics && selectedChapterModal.chapter.topics.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                  Syllabus Learning Objectives & Topics ({selectedChapterModal.chapter.topics.length})
                </h3>

                <div className="space-y-2">
                  {selectedChapterModal.chapter.topics.map((topic, i) => (
                    <div
                      key={topic.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {topic.topicNumber} {topic.title}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">Topic {i + 1}</span>
                      </div>

                      {topic.keyPoints && topic.keyPoints.length > 0 && (
                        <ul className="text-xs text-slate-600 dark:text-slate-400 list-disc list-inside space-y-0.5">
                          {topic.keyPoints.map((point, pIdx) => (
                            <li key={pIdx}>{point}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wrong Questions Retest Section (if any mistakes exist) */}
            {selectedChapterModal.wrongQuestions.length > 0 && onPracticeWrongQuestions && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      {selectedChapterModal.wrongQuestions.length} Incorrect Questions in this Chapter
                    </h4>
                  </div>
                  <Button
                    variant="warning"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => {
                      onPracticeWrongQuestions(selectedChapterModal.wrongQuestions);
                      setSelectedChapterModal(null);
                    }}
                  >
                    <RotateCcw className="w-3 h-3" /> Re-test Mistakes
                  </Button>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Reviewing your previous mistakes is the fastest way to turn this chapter into gold mastery.
                </p>
              </div>
            )}

            {/* Action Buttons Toolbar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setSelectedChapterModal(null)}
              >
                Close
              </Button>

              {onNavigateNotes && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs gap-1.5"
                  onClick={() => {
                    setSelectedChapterModal(null);
                    onNavigateNotes();
                  }}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Study Notes
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto text-xs gap-2 font-bold"
                onClick={() => handleLaunchChapterTest(selectedChapterModal, 10)}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Launch Chapter Practice Test (10 MCQs)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
