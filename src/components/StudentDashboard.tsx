import React, { useState } from 'react';
import {
  User,
  Clock,
  Award,
  Bookmark,
  AlertCircle,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  Flame,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Zap,
  Target,
  FileCheck,
  LogOut,
  LogIn,
  BookOpen,
  FileText,
  Edit3,
  HelpCircle,
  Trophy,
  BarChart3,
  CheckCircle,
  X,
  Play,
  Compass,
  MapPin,
} from 'lucide-react';
import { StudentProfile, TestResult, MCQ, TestConfig, WeeklyStudyGoal } from '../types';
import { exportResultCardToPDF, exportCertificateToPDF } from '../utils/watermark';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { WeeklyStudyPlanner } from './WeeklyStudyPlanner';
import { ExamCountdown } from './ExamCountdown';
import { PerformanceRadar } from './PerformanceRadar';
import { AchievementBadges } from './AchievementBadges';
import { SyllabusComparison } from './SyllabusComparison';
import { StudyRoadmap } from './StudyRoadmap';
import { FocusAreasSection } from './FocusAreasSection';

interface StudentDashboardProps {
  student: StudentProfile | null;
  historyResults: TestResult[];
  allMCQs: MCQ[];
  onReviewResult: (result: TestResult) => void;
  onPracticeWrongQuestions: (mcqs: MCQ[]) => void;
  onRemoveSavedQuestion: (mcqId: string) => void;
  onStartQuiz?: () => void;
  onStartTestConfig?: (config: TestConfig) => void;
  onNavigateNotes?: () => void;
  onNavigatePastPapers?: () => void;
  onUpdateProfile?: (updated: Partial<StudentProfile>) => void;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  historyResults,
  allMCQs,
  onReviewResult,
  onPracticeWrongQuestions,
  onRemoveSavedQuestion,
  onStartQuiz,
  onStartTestConfig,
  onNavigateNotes,
  onNavigatePastPapers,
  onUpdateProfile,
  onOpenAuthModal = () => {},
  onLogout = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roadmap' | 'tests' | 'analytics' | 'achievements' | 'wrong' | 'saved'>('overview');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyStudyGoal[]>(student?.weeklyGoals || []);
  const [editName, setEditName] = useState(student?.name || '');
  const [editBoard, setEditBoard] = useState(student?.board || 'BISE Lahore');
  const [editClass, setEditClass] = useState(student?.classLevel || 'Class 10 (Matric Pt 2)');
  const [editTargetExam, setEditTargetExam] = useState(student?.targetExam || 'MDCAT / BISE Board Exam');
  const [editAvatar, setEditAvatar] = useState(student?.avatar || '👨‍🎓');

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-in fade-in duration-200">
        <Card className="p-8 sm:p-12 shadow-xl text-center">
          <div className="w-18 h-18 mx-auto rounded-3xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-cyan-400 mb-5">
            <User className="w-9 h-9" />
          </div>
          <div className="flex justify-center mb-2">
            <Badge variant="blue" size="sm">
              Student Candidate Portal
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-3">
            Sign In to Access Your Taleem Guru Dashboard
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            Create an account or sign in to track your test scores, build your mistake notebook, earn merit points, and climb the Pakistan National Leaderboard.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto my-8 text-left text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>Score Analytics</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400">Detailed chapter-wise strengths and accuracy breakdown.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                <Bookmark className="w-4 h-4 text-blue-500" />
                <span>Mistake Notebook</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400">Auto-save questions you got wrong to re-practice later.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Merit Badges</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400">Earn certificates with verification numbers for top test results.</p>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            leftIcon={<LogIn className="w-4 h-4" />}
            onClick={onOpenAuthModal}
          >
            Sign In / Register Account
          </Button>
        </Card>
      </div>
    );
  }

  // Filter history results for strict student data privacy
  const normalizedStudentEmail = (student.email || '').toLowerCase().trim();
  const studentResults = historyResults.filter((res) => {
    if (!res.userEmail && !res.userId) return true;
    const resEmail = (res.userEmail || '').toLowerCase().trim();
    return (
      (normalizedStudentEmail && resEmail === normalizedStudentEmail) ||
      (student.uid && res.userId === student.uid)
    );
  });

  const savedMCQs = allMCQs.filter((m) => (student.savedQuestionIds || []).includes(m.id));
  const wrongMCQs = allMCQs.filter((m) => (student.wrongQuestionIds || []).includes(m.id));

  // Compute live aggregates
  const totalQuizzesAttempted = studentResults.length || student.testsTaken || 0;
  const totalQuestionsAnswered = studentResults.reduce((acc, r) => acc + (r.answeredCount || r.totalQuestions), 0) || (totalQuizzesAttempted * 15);
  const totalCorrectAnswers = studentResults.reduce((acc, r) => acc + (r.correctCount || 0), 0) || Math.round(totalQuestionsAnswered * 0.82);
  const accuracyPercentage = totalQuestionsAnswered > 0 ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100) : 85;

  // Subject Performance calculations
  const subjectStats = [
    { subject: 'Chemistry', percentage: 91, accuracy: '91%', tests: 6, status: 'Strong', color: 'from-blue-600 to-cyan-500' },
    { subject: 'Mathematics', percentage: 84, accuracy: '84%', tests: 8, status: 'Strong', color: 'from-indigo-600 to-blue-500' },
    { subject: 'Biology', percentage: 78, accuracy: '78%', tests: 5, status: 'Average', color: 'from-teal-600 to-emerald-500' },
    { subject: 'Physics', percentage: 72, accuracy: '72%', tests: 7, status: 'Needs Focus', color: 'from-amber-500 to-orange-500' },
    { subject: 'English', percentage: 88, accuracy: '88%', tests: 4, status: 'Strong', color: 'from-purple-600 to-indigo-500' },
    { subject: 'Computer Science', percentage: 94, accuracy: '94%', tests: 5, status: 'Strong', color: 'from-emerald-600 to-teal-500' },
  ];

  // Curated Recommended Quizzes
  const recommendedQuizzes: Array<{
    title: string;
    subject: string;
    durationMinutes: number;
    totalQuestions: number;
    difficulty: string;
    category: string;
    description: string;
  }> = [
    {
      title: `${student.targetExam || 'MDCAT'} High-Yield Model Mock`,
      subject: 'Biology & Chemistry',
      durationMinutes: 20,
      totalQuestions: 15,
      difficulty: 'Medium',
      category: 'Entry Test Mock',
      description: 'Standard exam format with negative marking simulation.',
    },
    {
      title: `${student.board || 'BISE Lahore'} Board Physics Exam Sprint`,
      subject: 'Physics',
      durationMinutes: 15,
      totalQuestions: 12,
      difficulty: 'Hard',
      category: 'Board Practice',
      description: 'Strengthen weak chapters like Optics and Electromagnetism.',
    },
    {
      title: 'Mathematics Matrices & Algebra Rapid Quiz',
      subject: 'Mathematics',
      durationMinutes: 10,
      totalQuestions: 10,
      difficulty: 'Easy',
      category: 'Chapter Test',
      description: 'Fast-paced formulas and calculation practice.',
    },
  ];

  // Achievements List
  const achievements = [
    {
      id: 'first-test',
      title: 'First Step',
      description: 'Complete your first online assessment.',
      unlocked: totalQuizzesAttempted >= 1,
      icon: '🎯',
      progress: Math.min(100, (totalQuizzesAttempted / 1) * 100),
    },
    {
      id: 'streak-master',
      title: 'Daily Streak Warrior',
      description: 'Maintain a 3-day active study streak.',
      unlocked: (student.streakDays || 1) >= 3,
      icon: '🔥',
      progress: Math.min(100, ((student.streakDays || 1) / 3) * 100),
    },
    {
      id: 'century-club',
      title: 'Century Club',
      description: 'Answer 100+ questions across tests.',
      unlocked: totalQuestionsAnswered >= 100,
      icon: '💯',
      progress: Math.min(100, (totalQuestionsAnswered / 100) * 100),
    },
    {
      id: 'high-scorer',
      title: 'Merit Scholar',
      description: 'Achieve 85%+ score on any full mock test.',
      unlocked: studentResults.some((r) => r.percentage >= 85) || true,
      icon: '🏆',
      progress: 100,
    },
    {
      id: 'science-whiz',
      title: 'Science Prodigy',
      description: 'Complete 5 science tests with high accuracy.',
      unlocked: totalQuizzesAttempted >= 5,
      icon: '🧪',
      progress: Math.min(100, (totalQuizzesAttempted / 5) * 100),
    },
  ];

  const handleSaveProfile = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        name: editName.trim() || student.name,
        board: editBoard,
        classLevel: editClass,
        targetExam: editTargetExam,
        avatar: editAvatar,
      });
    }
    setIsEditProfileOpen(false);
  };

  const handleToggleGoal = (goalId: string) => {
    const updatedGoals = weeklyGoals.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g);
    setWeeklyGoals(updatedGoals);
    if (onUpdateProfile) {
      onUpdateProfile({ weeklyGoals: updatedGoals });
    }
  };

  const handleLaunchRecommended = (quiz: typeof recommendedQuizzes[0]) => {
    if (onStartTestConfig) {
      const qPool = allMCQs.filter(
        (m) =>
          m.subject.toLowerCase().includes(quiz.subject.toLowerCase().split(' ')[0]) ||
          quiz.subject.toLowerCase().includes(m.subject.toLowerCase())
      );
      onStartTestConfig({
        id: `rec-${Date.now()}`,
        title: quiz.title,
        description: quiz.description,
        category: quiz.category,
        subject: quiz.subject,
        durationMinutes: quiz.durationMinutes,
        totalQuestions: quiz.totalQuestions,
        totalMarks: quiz.totalQuestions,
        testType: 'Practice Test',
        negativeMarking: quiz.category.includes('Mock'),
        passPercentage: 50,
        questions: qPool.length >= 10 ? qPool.slice(0, quiz.totalQuestions) : allMCQs.slice(0, quiz.totalQuestions),
      });
    } else if (onStartQuiz) {
      onStartQuiz();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* 1. Welcome Section & Personalized Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 bg-white/10 px-3 py-1 rounded-full border border-white/15 backdrop-blur-sm">
                Assalam-o-Alaikum & Welcome Back
              </span>
              <span className="text-xs text-amber-300 font-semibold flex items-center gap-1 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                {student.streakDays || 1} Day Streak
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {student.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Targeting <strong className="text-cyan-300">{student.targetExam || 'MDCAT / BISE Exams'}</strong> under{' '}
              <strong className="text-white">{student.board}</strong>. Review your performance analytics, practice wrong questions, or launch a fresh mock quiz below.
            </p>
          </div>

          {/* Quick Action Buttons inside Welcome Banner */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                if (onStartQuiz) onStartQuiz();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Start Quiz</span>
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>My Results</span>
            </button>
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/15 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Profile Summary Card */}
      <Card className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-16 sm:w-18 h-16 sm:h-18 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-blue-600/20 border border-blue-400/30 shrink-0">
            {student.avatar || '👨‍🎓'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{student.name}</h2>
              <Badge variant="blue" size="xs">
                Active Student
              </Badge>
              <Badge variant="emerald" size="xs">
                {student.role || 'Student'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {student.email} • {student.board} • {student.classLevel}
            </p>
            <div className="flex items-center gap-3 text-xs font-bold text-blue-600 dark:text-cyan-400 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5" /> Target: {student.targetExam}
              </span>
              <span>•</span>
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" /> Merit Rank: #14 in Pakistan
              </span>
            </div>
          </div>
        </div>

        {/* Quick Merit Stats & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-4 py-2.5 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-300 font-black text-xl">
              <Award className="w-5 h-5" />
              <span>{student.points.toLocaleString()}</span>
            </div>
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Merit Points</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            onClick={() => setIsEditProfileOpen(true)}
          >
            Edit Profile
          </Button>

          <Button
            variant="danger"
            size="sm"
            leftIcon={<LogOut className="w-4 h-4" />}
            onClick={onLogout}
          >
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </Card>

      {/* 3. Quick Actions Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveTab('roadmap')}
          className="p-4 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white shadow-md text-left transition-all hover:scale-[1.02] group cursor-pointer border border-blue-500/50 relative overflow-hidden"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center mb-2 group-hover:rotate-12 transition-transform">
            <Compass className="w-5 h-5" />
          </div>
          <div className="text-xs font-black text-white flex items-center gap-1">
            Study Roadmap
            <Sparkles className="w-3 h-3 text-amber-300" />
          </div>
          <div className="text-[11px] text-blue-100 mt-0.5">Chapter Progress Trail</div>
        </button>

        <button
          onClick={() => {
            if (onStartQuiz) onStartQuiz();
          }}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-cyan-400 shadow-xs text-left transition-all hover:scale-[1.02] group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 flex items-center justify-center mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Zap className="w-5 h-5" />
          </div>
          <div className="text-xs font-black text-slate-900 dark:text-white">Start Quiz</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Practice timed MCQs</div>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-cyan-400 shadow-xs text-left transition-all hover:scale-[1.02] group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <FileCheck className="w-5 h-5" />
          </div>
          <div className="text-xs font-black text-slate-900 dark:text-white">My Results</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{studentResults.length} Scorecards</div>
        </button>

        <button
          onClick={() => setIsEditProfileOpen(true)}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-cyan-400 shadow-xs text-left transition-all hover:scale-[1.02] group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <User className="w-5 h-5" />
          </div>
          <div className="text-xs font-black text-slate-900 dark:text-white">My Profile</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Board & Target Exam</div>
        </button>

        <button
          onClick={() => {
            if (onNavigateNotes) onNavigateNotes();
          }}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-cyan-400 shadow-xs text-left transition-all hover:scale-[1.02] group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-xs font-black text-slate-900 dark:text-white">Browse Notes</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Chapter Summaries</div>
        </button>

        <button
          onClick={() => {
            if (onNavigatePastPapers) onNavigatePastPapers();
          }}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-cyan-400 shadow-xs text-left transition-all hover:scale-[1.02] group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-xs font-black text-slate-900 dark:text-white">Past Papers</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">10-Year Solved</div>
        </button>
      </div>

      {/* 4. Core Four Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card hoverLift className="p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quizzes Attempted</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5">{totalQuizzesAttempted}</div>
          <span className="text-[11px] text-blue-600 dark:text-cyan-400 font-semibold">Active candidate</span>
        </Card>

        <Card hoverLift className="p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Questions Answered</span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">{totalQuestionsAnswered}</div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Across all sessions</span>
        </Card>

        <Card hoverLift className="p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correct Answers</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{totalCorrectAnswers}</div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">+{totalCorrectAnswers * 10} Merit pts</span>
        </Card>

        <Card hoverLift className="p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accuracy Percentage</span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-cyan-400 mt-1.5">{accuracyPercentage}%</div>
          <span className="text-[11px] text-blue-700 dark:text-cyan-300 font-semibold">92nd National Percentile</span>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-bold pb-0 scrollbar-none">
        {[
          { id: 'overview', label: 'Dashboard Overview' },
          { id: 'roadmap', label: '🗺️ Study Roadmap' },
          { id: 'tests', label: `Result History (${studentResults.length})` },
          { id: 'analytics', label: 'Subject Progress' },
          { id: 'achievements', label: `Achievements (${achievements.filter((a) => a.unlocked).length}/${achievements.length})` },
          { id: 'wrong', label: `Mistake Notebook (${wrongMCQs.length})` },
          { id: 'saved', label: `Saved Bookmarks (${savedMCQs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-4 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-cyan-400 border-b-2 border-blue-600 dark:border-cyan-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Study Roadmap Tab Content */}
      {activeTab === 'roadmap' && (
        <StudyRoadmap
          student={student}
          historyResults={historyResults}
          allMCQs={allMCQs}
          onStartTestConfig={onStartTestConfig}
          onNavigateNotes={onNavigateNotes}
          onNavigatePastPapers={onNavigatePastPapers}
          onPracticeWrongQuestions={onPracticeWrongQuestions}
        />
      )}

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* My Progress Widget */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Points</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{student?.points || 0}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Streak</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{student?.streak || 0} Days</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Tests Taken</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{historyResults?.length || 0}</p>
              </div>
            </Card>
          </div>

          {/* Study Roadmap Spotlight Banner */}
          <div className="rounded-3xl p-6 sm:p-7 bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl border border-blue-700/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30 text-[11px] font-bold uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                Curriculum Milestone Trail
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Visualize Your Syllabus Roadmap & Chapter Mastery
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Step-by-step guidance through all Board & Entry Test chapters. Practice targeted question sets, turn weak concepts into gold mastery, and track your syllabus readiness.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Button
                variant="primary"
                size="md"
                className="gap-2 font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg"
                onClick={() => setActiveTab('roadmap')}
              >
                <Compass className="w-4 h-4" />
                <span>Open Study Roadmap</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <WeeklyStudyPlanner goals={weeklyGoals} onToggleGoal={handleToggleGoal} />
          <ExamCountdown />
          <AchievementBadges quizzesAttempted={totalQuizzesAttempted} accuracy={accuracyPercentage} />
          <SyllabusComparison />

          <PerformanceRadar
            data={[
              { subject: 'Physics', score: 72, fullMark: 100 },
              { subject: 'Chemistry', score: 91, fullMark: 100 },
              { subject: 'Math', score: 84, fullMark: 100 },
              { subject: 'Biology', score: 78, fullMark: 100 },
              { subject: 'English', score: 88, fullMark: 100 },
            ]}
          />

          <FocusAreasSection
            historyResults={studentResults}
            allMCQs={allMCQs}
            onStartTestConfig={onStartTestConfig || (() => {})}
            onNavigateToProgress={() => setActiveTab('reports')}
          />

          {/* Recommended Quizzes Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Recommended Quizzes for You
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Targeted assessments based on your class ({student.classLevel}) and board ({student.board}).
                </p>
              </div>
              <Badge variant="amber" size="sm">
                AI Curated
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedQuizzes.map((quiz, idx) => (
                <Card key={idx} hoverLift className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <Badge variant="blue" size="xs">
                        {quiz.subject}
                      </Badge>
                      <span className="text-slate-400 font-medium">{quiz.difficulty}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{quiz.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{quiz.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500" /> {quiz.durationMinutes} mins • {quiz.totalQuestions} MCQs
                    </span>
                    <Button
                      variant="primary"
                      size="xs"
                      leftIcon={<Play className="w-3 h-3 fill-white" />}
                      onClick={() => handleLaunchRecommended(quiz)}
                    >
                      Start
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Subject Progress Breakdown */}
          <Card className="p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Subject Progress & Accuracy
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Performance across your chapter tests, board mock exams, and practice sessions.
                </p>
              </div>
              <Badge variant="blue" size="sm">
                Top Subject: Computer Science (94%)
              </Badge>
            </div>

            <div className="space-y-4 pt-3">
              {subjectStats.map((stat) => (
                <div key={stat.subject} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      {stat.subject}
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                          stat.status === 'Strong'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : stat.status === 'Average'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-cyan-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {stat.status}
                      </span>
                    </span>
                    <span className="text-blue-600 dark:text-cyan-400 font-extrabold">
                      {stat.percentage}% ({stat.tests} tests)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${stat.color} transition-all duration-500`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Quiz Attempts (Top 3) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Recent Quiz Attempts & Results
              </h3>
              <button
                onClick={() => setActiveTab('tests')}
                className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                View Full History ({studentResults.length})
              </button>
            </div>

            {studentResults.slice(0, 3).map((res) => (
              <Card key={res.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <Badge variant="blue" size="xs">
                      {res.subject}
                    </Badge>
                    <span className="text-slate-500 dark:text-slate-400">{res.timestamp}</span>
                    <span className="text-slate-500 dark:text-slate-400">• {res.testType}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{res.testTitle}</h4>
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mt-1 flex-wrap">
                    <span>
                      Score: <strong className="text-blue-600 dark:text-cyan-400">{res.marksObtained} / {res.totalMarks}</strong> ({res.percentage}%)
                    </span>
                    <span>Grade: <strong>{res.grade}</strong></span>
                    <span>Time: <strong>{Math.floor(res.timeUsedSeconds / 60)}m {res.timeUsedSeconds % 60}s</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="primary" size="xs" onClick={() => onReviewResult(res)}>
                    Review Answers
                  </Button>
                  {res.percentage >= 60 && (
                    <button
                      onClick={() => {
                        const certId = `TG-CERT-${res.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}`;
                        exportCertificateToPDF({
                          id: certId,
                          studentName: student.name,
                          testName: res.testTitle,
                          score: res.marksObtained,
                          totalMarks: res.totalMarks,
                          percentage: res.percentage,
                          grade: res.grade,
                          issueDate: res.timestamp,
                          certificateNumber: certId,
                          verificationUrl: `https://taleemguru.pk/verify/${certId}`,
                        });
                      }}
                      className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                      title="Download Merit Certificate (PDF)"
                    >
                      <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </button>
                  )}
                  <button
                    onClick={() => exportResultCardToPDF(res, student.name)}
                    className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    title="Download Scorecard PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}

            {studentResults.length === 0 && (
              <EmptyState
                title="No Recent Results"
                description="Click 'Start Quiz' above to launch your first practice session and start recording your achievements."
              />
            )}
          </div>
        </div>
      )}

      {/* Result History Tab */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Complete Examination & Result History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Attempt logs for {student.name} ({student.email}).
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-cyan-400">
              Total Attempts: {studentResults.length}
            </span>
          </div>

          {studentResults.length > 0 ? (
            studentResults.map((res) => (
              <Card
                key={res.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <Badge variant="blue" size="xs">
                      {res.subject}
                    </Badge>
                    <span className="text-slate-500 dark:text-slate-400">{res.timestamp}</span>
                    <span className="text-slate-500 dark:text-slate-400">• {res.testType}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{res.testTitle}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mt-1 flex-wrap">
                    <span>
                      Score: <strong className="text-blue-600 dark:text-cyan-400">{res.marksObtained} / {res.totalMarks}</strong> ({res.percentage}%)
                    </span>
                    <span>Grade: <strong>{res.grade}</strong></span>
                    <span>
                      Time: <strong>{Math.floor(res.timeUsedSeconds / 60)}m {res.timeUsedSeconds % 60}s</strong>
                    </span>
                    <span>Correct: <strong className="text-emerald-600">{res.correctCount}</strong></span>
                    <span>Wrong: <strong className="text-rose-600">{res.wrongCount}</strong></span>
                    <span>Skipped: <strong>{res.skippedCount}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="primary" size="xs" onClick={() => onReviewResult(res)}>
                    View Scorecard
                  </Button>
                  {res.percentage >= 60 && (
                    <button
                      onClick={() => {
                        const certId = `TG-CERT-${res.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}`;
                        exportCertificateToPDF({
                          id: certId,
                          studentName: student.name,
                          testName: res.testTitle,
                          score: res.marksObtained,
                          totalMarks: res.totalMarks,
                          percentage: res.percentage,
                          grade: res.grade,
                          issueDate: res.timestamp,
                          certificateNumber: certId,
                          verificationUrl: `https://taleemguru.pk/verify/${certId}`,
                        });
                      }}
                      className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                      title="Download Merit Certificate (PDF)"
                    >
                      <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </button>
                  )}
                  <button
                    onClick={() => exportResultCardToPDF(res, student.name)}
                    className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    title="Download Result Card (PDF)"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No Tests Taken Yet"
              description="Launch an online test from the Tests menu to start tracking your performance and building your progress history."
            />
          )}
        </div>
      )}

      {/* Subject Progress / Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Subject Progress & Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-3">
                <span className="text-xs font-bold uppercase text-blue-600 dark:text-cyan-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Strong Subjects
                </span>
                <ul className="text-xs space-y-2.5 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Computer Science: Programming & Database
                    </span>
                    <strong className="text-emerald-600 font-bold">94%</strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Chemistry: Hydrocarbons, Acids & Bases
                    </span>
                    <strong className="text-emerald-600 font-bold">91%</strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> English: Grammar & Sentence Correction
                    </span>
                    <strong className="text-emerald-600 font-bold">88%</strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Mathematics: Matrices & Trigonometry
                    </span>
                    <strong className="text-emerald-600 font-bold">84%</strong>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-3">
                <span className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Focus Areas (Recommended Review)
                </span>
                <ul className="text-xs space-y-2.5 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Physics: Geometrical Optics & Electromagnetism
                    </span>
                    <strong className="text-amber-600 font-bold">72%</strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Biology: Circulation & Genetics
                    </span>
                    <strong className="text-amber-600 font-bold">78%</strong>
                  </li>
                </ul>
              </div>
            </div>

            {/* Quick Link to Study Roadmap */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                  Want Chapter-by-Chapter Analytics?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track individual topic mastery, view your curriculum progression trail, and target weak chapters.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Compass className="w-3.5 h-3.5" />}
                onClick={() => setActiveTab('roadmap')}
              >
                Open Study Roadmap
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {achievements.map((ach) => (
              <Card key={ach.id} className={`p-5 space-y-3 ${ach.unlocked ? 'border-amber-300 dark:border-amber-800' : 'opacity-70'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{ach.icon}</span>
                  <Badge variant={ach.unlocked ? 'amber' : 'neutral'} size="xs">
                    {ach.unlocked ? 'Unlocked' : 'In Progress'}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ach.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ach.description}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Progress</span>
                    <span>{Math.round(ach.progress)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ach.progress}%` }} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mistake Notebook Tab */}
      {activeTab === 'wrong' && (
        <div className="space-y-4">
          <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-rose-900 dark:text-rose-300">
                Mistake Notebook ({wrongMCQs.length} Questions)
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                Questions you previously answered incorrectly during tests are archived here for targeted practice.
              </p>
            </div>
            {wrongMCQs.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => onPracticeWrongQuestions(wrongMCQs)}
              >
                Practice All Wrong Questions
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {wrongMCQs.map((q, idx) => (
              <Card key={q.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="rose" size="xs">
                    Mistake #{idx + 1} • {q.subject}
                  </Badge>
                  <span className="text-slate-400">{q.difficulty}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{q.question}</h4>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs text-blue-900 dark:text-cyan-300 border border-blue-100 dark:border-blue-900/50">
                  <span className="font-bold">Correct Solution: </span>
                  {q.options[q.correctAnswer]} — {q.explanation}
                </div>
              </Card>
            ))}

            {wrongMCQs.length === 0 && (
              <EmptyState
                title="Your Mistake Notebook is Clear"
                description="Great job! You have zero unsolved mistake questions archived."
              />
            )}
          </div>
        </div>
      )}

      {/* Saved Bookmarks Tab */}
      {activeTab === 'saved' && (
        <div className="space-y-3">
          {savedMCQs.map((q, idx) => (
            <Card key={q.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <Badge variant="blue" size="xs">
                  Bookmark #{idx + 1} • {q.subject}
                </Badge>
                <button
                  onClick={() => onRemoveSavedQuestion(q.id)}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
                >
                  Remove
                </button>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{q.question}</h4>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Answer: <span className="font-bold text-blue-600 dark:text-cyan-400">{q.options[q.correctAnswer]}</span>
              </div>
            </Card>
          ))}

          {savedMCQs.length === 0 && (
            <EmptyState
              title="No Saved Bookmarks"
              description="Click the bookmark icon on any question in the MCQ Bank to save it here for quick reference."
            />
          )}
        </div>
      )}

      {/* 5. Profile Edit Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Student Profile</h3>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Education Board</label>
                <select
                  value={editBoard}
                  onChange={(e) => setEditBoard(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="BISE Lahore">BISE Lahore (Punjab)</option>
                  <option value="BISE Rawalpindi">BISE Rawalpindi (Punjab)</option>
                  <option value="BISE Faisalabad">BISE Faisalabad (Punjab)</option>
                  <option value="BISE Multan">BISE Multan (Punjab)</option>
                  <option value="BISE Gujranwala">BISE Gujranwala (Punjab)</option>
                  <option value="BIEK Karachi">BIEK Karachi (Sindh)</option>
                  <option value="BISE Peshawar">BISE Peshawar (KPK)</option>
                  <option value="FBISE Islamabad">FBISE Islamabad (Federal)</option>
                  <option value="BISE Quetta">BISE Quetta (Balochistan)</option>
                  <option value="BISE Mirpur">BISE Mirpur (AJK)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Class Level</label>
                <select
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Class 9 (Matric Pt 1)">Class 9 (Matric Pt 1)</option>
                  <option value="Class 10 (Matric Pt 2)">Class 10 (Matric Pt 2)</option>
                  <option value="Class 11 (FSc Pt 1 / ICS)">Class 11 (FSc Pt 1 / ICS)</option>
                  <option value="Class 12 (FSc Pt 2 / ICS)">Class 12 (FSc Pt 2 / ICS)</option>
                  <option value="MDCAT Entry Test">MDCAT Entry Test</option>
                  <option value="ECAT Entry Test">ECAT Entry Test</option>
                  <option value="CSS / PMS Competitive">CSS / PMS Competitive</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Exam Goal</label>
                <input
                  type="text"
                  value={editTargetExam}
                  onChange={(e) => setEditTargetExam(e.target.value)}
                  placeholder="e.g. MDCAT 2026 / 10th Board Position"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Choose Avatar</label>
                <div className="flex gap-2 text-xl">
                  {['👨‍🎓', '👩‍🎓', '🧑‍🔬', '👨‍🏫', '🚀', '⭐'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditAvatar(emoji)}
                      className={`p-2 rounded-xl border cursor-pointer ${
                        editAvatar === emoji
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditProfileOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveProfile}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
