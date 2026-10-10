import React, { useState, useEffect } from 'react';
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
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Filter,
  Search,
} from 'lucide-react';
import { StudentProfile, TestResult, MCQ, TestConfig, WeeklyStudyGoal } from '../types';
import { exportResultCardToPDF, exportCertificateToPDF } from '../utils/watermark';
import {
  changeStudentPasswordApi,
  fetchStudentDashboardApi,
  fetchStudentPerformanceApi,
  fetchStudentActiveExamApi,
  fetchUserCertificatesApi,
  fetchTestsApi,
} from '../lib/api';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { WeeklyStudyPlanner } from './WeeklyStudyPlanner';
import { PerformanceRadar } from './PerformanceRadar';
import { AchievementBadges } from './AchievementBadges';
import { SyllabusComparison } from './SyllabusComparison';
import { StudyRoadmap } from './StudyRoadmap';
import { useSiteSettings } from '../context/SiteSettingsContext';

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
  const { siteName } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'my-tests' | 'roadmap' | 'tests' | 'analytics' | 'achievements' | 'certificates' | 'wrong' | 'saved'
  >('overview');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyStudyGoal[]>(student?.weeklyGoals || []);
  const [editName, setEditName] = useState(student?.name || '');
  const [editBoard, setEditBoard] = useState(student?.board || 'BISE Lahore');
  const [editClass, setEditClass] = useState(student?.classLevel || 'Class 10 (Matric Pt 2)');
  const [editTargetExam, setEditTargetExam] = useState(student?.targetExam || 'MDCAT / BISE Board Exam');
  const [editAvatar, setEditAvatar] = useState(student?.avatar || '👨‍🎓');

  // Real backend analytics and active session states
  const [activeExam, setActiveExam] = useState<{
    attemptId: string;
    testId: string;
    testTitle: string;
    timeRemainingSeconds: number;
    totalQuestions: number;
  } | null>(null);
  const [dbCertificates, setDbCertificates] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [availableTests, setAvailableTests] = useState<TestConfig[]>([]);

  // Test Filters state
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');
  const [selectedClassFilter, setSelectedClassFilter] = useState('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
  const [testSearchQuery, setTestSearchQuery] = useState('');

  // Profile Modal Tab & Password Change State
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'password'>('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);

  // Load server-authoritative active exam, performance, certificates, and test list
  useEffect(() => {
    if (!student) return;

    let isMounted = true;

    async function loadAuthoritativeData() {
      try {
        const [dashRes, activeRes, perfRes, certRes, testsRes] = await Promise.allSettled([
          fetchStudentDashboardApi(),
          fetchStudentActiveExamApi(),
          fetchStudentPerformanceApi(),
          fetchUserCertificatesApi(),
          fetchTestsApi(),
        ]);

        if (!isMounted) return;

        if (dashRes.status === 'fulfilled' && dashRes.value?.success) {
          setDashboardData(dashRes.value);
        }
        if (activeRes.status === 'fulfilled' && activeRes.value) {
          setActiveExam(activeRes.value);
        }
        if (perfRes.status === 'fulfilled' && perfRes.value) {
          setPerformanceData(perfRes.value);
        }
        if (certRes.status === 'fulfilled' && Array.isArray(certRes.value)) {
          setDbCertificates(certRes.value);
        }
        if (testsRes.status === 'fulfilled' && Array.isArray(testsRes.value)) {
          setAvailableTests(testsRes.value);
        }
      } catch (err) {
        console.warn('Notice loading student data:', err);
      }
    }

    loadAuthoritativeData();

    return () => {
      isMounted = false;
    };
  }, [student?.uid]);

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
            Sign In to Access Your {siteName} Dashboard
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
            Sign In / Register Candidate
          </Button>
        </Card>
      </div>
    );
  }

  // Filter history results for strict student data privacy
  const normalizedStudentEmail = (student.email || '').toLowerCase().trim();
  const localStudentResults = historyResults.filter((res) => {
    if (!res.userEmail && !res.userId) return false;
    const resEmail = (res.userEmail || '').toLowerCase().trim();
    return (
      (normalizedStudentEmail && resEmail === normalizedStudentEmail) ||
      (student.uid && res.userId === student.uid)
    );
  });

  // Merge server-authoritative attempts if present
  const studentResults = React.useMemo(() => {
    const combined = [...localStudentResults];
    const existingIds = new Set(combined.map((r) => r.id || (r as any).resultId));

    if (dashboardData?.recentAttempts && Array.isArray(dashboardData.recentAttempts)) {
      dashboardData.recentAttempts.forEach((r: any) => {
        const rId = r.resultId || r.id;
        if (rId && !existingIds.has(rId)) {
          existingIds.add(rId);
          combined.push({
            id: rId,
            testId: r.testId,
            testTitle: r.testTitle,
            testType: r.testType,
            subject: r.subject,
            category: r.category,
            totalQuestions: r.totalQuestions,
            answeredCount: r.answeredCount,
            correctCount: r.correctCount,
            wrongCount: r.wrongCount,
            skippedCount: r.skippedCount,
            marksObtained: r.marksObtained,
            totalMarks: r.totalMarks,
            percentage: r.percentage,
            grade: r.grade,
            timeUsedSeconds: r.timeUsedSeconds || 0,
            totalDurationSeconds: r.totalDurationSeconds || 0,
            percentileRank: r.percentileRank || 0,
            timestamp: r.createdAt ? new Date(r.createdAt).toLocaleString('en-GB') : '',
            userId: student.uid,
            userEmail: student.email,
            answers: [],
            questions: [],
          });
        }
      });
    }

    return combined;
  }, [localStudentResults, dashboardData?.recentAttempts, student.uid, student.email]);

  const savedMCQs = allMCQs.filter((m) => (student.savedQuestionIds || []).includes(m.id));
  const wrongMCQs = allMCQs.filter((m) => (student.wrongQuestionIds || []).includes(m.id));

  // Compute live aggregates strictly from actual PostgreSQL records
  const totalQuizzesAttempted = studentResults.length;
  const totalQuestionsAnswered = studentResults.reduce(
    (acc, r) => acc + (r.answeredCount || r.totalQuestions || 0),
    0
  );
  const totalCorrectAnswers = studentResults.reduce((acc, r) => acc + (r.correctCount || 0), 0);
  const accuracyPercentage =
    totalQuestionsAnswered > 0
      ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
      : 0;

  // Compute real Subject Performance from actual results
  const subjectAggregates: Record<
    string,
    { tests: number; totalPct: number; correct: number; totalQ: number }
  > = {};

  studentResults.forEach((r) => {
    const subj = r.subject || 'General';
    if (!subjectAggregates[subj]) {
      subjectAggregates[subj] = { tests: 0, totalPct: 0, correct: 0, totalQ: 0 };
    }
    subjectAggregates[subj].tests += 1;
    subjectAggregates[subj].totalPct += r.percentage || 0;
    subjectAggregates[subj].correct += r.correctCount || 0;
    subjectAggregates[subj].totalQ += r.answeredCount || r.totalQuestions || 0;
  });

  const subjectStats = Object.entries(subjectAggregates).map(([subject, data]) => {
    const avg = Math.round(data.totalPct / data.tests);
    let status: 'Strong' | 'Average' | 'Needs Focus' = 'Average';
    if (avg >= 80) status = 'Strong';
    else if (avg < 60) status = 'Needs Focus';

    let color = 'from-indigo-600 to-blue-500';
    if (subject.toLowerCase().includes('chem')) color = 'from-blue-600 to-cyan-500';
    else if (subject.toLowerCase().includes('math')) color = 'from-indigo-600 to-blue-500';
    else if (subject.toLowerCase().includes('bio')) color = 'from-teal-600 to-emerald-500';
    else if (subject.toLowerCase().includes('phys')) color = 'from-amber-500 to-orange-500';
    else if (subject.toLowerCase().includes('comp')) color = 'from-emerald-600 to-teal-500';

    return {
      subject,
      percentage: avg,
      accuracy: `${avg}%`,
      tests: data.tests,
      status,
      color,
    };
  });

  // Achievements based strictly on real milestones
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
      unlocked: (student.streakDays || 0) >= 3,
      icon: '🔥',
      progress: Math.min(100, ((student.streakDays || 0) / 3) * 100),
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
      unlocked: studentResults.some((r) => r.percentage >= 85),
      icon: '🏆',
      progress: studentResults.some((r) => r.percentage >= 85) ? 100 : 0,
    },
    {
      id: 'science-whiz',
      title: 'Subject Veteran',
      description: 'Complete 5 assessments in any subject.',
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

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    if (!currentPassword) {
      setPasswordChangeError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await changeStudentPasswordApi(currentPassword, newPassword);
      if (res.success) {
        setPasswordChangeSuccess('Your password has been changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setPasswordChangeSuccess(null);
        }, 3000);
      } else {
        setPasswordChangeError(
          res.error || 'Failed to change password. Please check your current password.'
        );
      }
    } catch (err: any) {
      setPasswordChangeError(err.message || 'Error updating password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleGoal = (goalId: string) => {
    const updatedGoals = weeklyGoals.map((g) =>
      g.id === goalId ? { ...g, completed: !g.completed } : g
    );
    setWeeklyGoals(updatedGoals);
    if (onUpdateProfile) {
      onUpdateProfile({ weeklyGoals: updatedGoals });
    }
  };

  // Filtered available tests
  const filteredAvailableTests = availableTests.filter((t) => {
    const matchesSubject = selectedSubjectFilter === 'All' || t.subject === selectedSubjectFilter;
    const matchesClass = selectedClassFilter === 'All' || t.classLevel === selectedClassFilter;
    const matchesType = selectedTypeFilter === 'All' || t.testType === selectedTypeFilter;
    const matchesSearch =
      !testSearchQuery ||
      t.title.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(testSearchQuery.toLowerCase());
    return matchesSubject && matchesClass && matchesType && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* 0. Active Exam Banner (if candidate has an ongoing in-progress test) */}
      {activeExam && activeExam.timeRemainingSeconds > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border-2 border-amber-500/40 rounded-3xl p-5 text-slate-900 dark:text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold animate-pulse shrink-0 shadow-md shadow-amber-500/30">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-300/40">
                  Active Examination In Progress
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black mt-1 text-slate-900 dark:text-white">
                {activeExam.testTitle}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Time Remaining: {Math.floor(activeExam.timeRemainingSeconds / 60)}m{' '}
                {activeExam.timeRemainingSeconds % 60}s • {activeExam.totalQuestions} Total Questions
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (onStartTestConfig) {
                onStartTestConfig({
                  id: activeExam.testId,
                  title: activeExam.testTitle,
                  description: 'Active In-Progress Examination Session',
                  testType: 'Board Test',
                  durationMinutes: Math.ceil(activeExam.timeRemainingSeconds / 60),
                  totalQuestions: activeExam.totalQuestions,
                  totalMarks: activeExam.totalQuestions,
                  category: 'Active Exam',
                  subject: 'Examination',
                  negativeMarking: false,
                  passPercentage: 50,
                  questions: [],
                });
              }
            }}
            className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-98"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Continue Exam</span>
          </button>
        </div>
      )}

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
                {student.streakDays || 0} Day Streak
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
              onClick={() => setActiveTab('my-tests')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore Tests</span>
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
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {student.name}
              </h2>
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
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Completed Tests:{' '}
                {totalQuizzesAttempted}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Merit Stats & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-4 py-2.5 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-300 font-black text-xl">
              <Award className="w-5 h-5" />
              <span>{(student.points || 0).toLocaleString()}</span>
            </div>
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
              Merit Points
            </span>
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

      {/* 3. Core Four Metric Stat Cards (100% Calculated from Real Records) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card hoverLift className="p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tests Attempted
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5">
            {totalQuizzesAttempted}
          </div>
          <span className="text-[11px] text-blue-600 dark:text-cyan-400 font-semibold">
            {totalQuizzesAttempted > 0 ? 'Authoritative records' : 'No tests yet'}
          </span>
        </Card>

        <Card hoverLift className="p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Questions Answered
          </span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">
            {totalQuestionsAnswered}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            Across completed tests
          </span>
        </Card>

        <Card hoverLift className="p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Correct Answers
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            {totalCorrectAnswers}
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
            Verified correct MCQs
          </span>
        </Card>

        <Card hoverLift className="p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Average Accuracy
          </span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-cyan-400 mt-1.5">
            {totalQuizzesAttempted > 0 ? `${accuracyPercentage}%` : '0%'}
          </div>
          <span className="text-[11px] text-blue-700 dark:text-cyan-300 font-semibold">
            {totalQuizzesAttempted > 0 ? 'Live database score' : 'Take a test to calculate'}
          </span>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-bold pb-0 scrollbar-none">
        {[
          { id: 'overview', label: 'Dashboard Overview' },
          { id: 'my-tests', label: '📚 Available Tests' },
          { id: 'roadmap', label: '🗺️ Study Roadmap' },
          { id: 'tests', label: `Result History (${studentResults.length})` },
          { id: 'analytics', label: 'Performance Analytics' },
          { id: 'certificates', label: `Certificates (${dbCertificates.length})` },
          {
            id: 'achievements',
            label: `Achievements (${achievements.filter((a) => a.unlocked).length}/${achievements.length})`,
          },
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

      {/* 1. Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
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

          {/* Subject Progress from Real Database Records */}
          <Card className="p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Subject Progress & Accuracy
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calculated from your completed test sessions.
                </p>
              </div>
              {subjectStats.length > 0 && (
                <Badge variant="blue" size="sm">
                  {subjectStats.length} Subjects Evaluated
                </Badge>
              )}
            </div>

            {subjectStats.length > 0 ? (
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
                        {stat.percentage}% ({stat.tests} {stat.tests === 1 ? 'test' : 'tests'})
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
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No tests attempted yet. Start practicing to build your progress.
              </div>
            )}
          </Card>

          {/* Recent Quiz Attempts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Recent Quiz Attempts & Results
              </h3>
              {studentResults.length > 3 && (
                <button
                  onClick={() => setActiveTab('tests')}
                  className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  View Full History ({studentResults.length})
                </button>
              )}
            </div>

            {studentResults.slice(0, 3).map((res) => (
              <Card
                key={res.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <Badge variant="blue" size="xs">
                      {res.subject}
                    </Badge>
                    <span className="text-slate-500 dark:text-slate-400">{res.timestamp}</span>
                    <span className="text-slate-500 dark:text-slate-400">• {res.testType}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {res.testTitle}
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mt-1 flex-wrap">
                    <span>
                      Score:{' '}
                      <strong className="text-blue-600 dark:text-cyan-400">
                        {res.marksObtained} / {res.totalMarks}
                      </strong>{' '}
                      ({res.percentage}%)
                    </span>
                    <span>
                      Grade: <strong>{res.grade}</strong>
                    </span>
                    <span>
                      Time:{' '}
                      <strong>
                        {Math.floor(res.timeUsedSeconds / 60)}m {res.timeUsedSeconds % 60}s
                      </strong>
                    </span>
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
                title="No tests attempted yet"
                description="Start practicing to build your progress."
              />
            )}
          </div>
        </div>
      )}

      {/* 2. Available Tests Tab */}
      {activeTab === 'my-tests' && (
        <div className="space-y-6">
          {/* Test Search & Filters Toolbar */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Available Online Tests & Mocks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select and start assessments aligned with your board and class syllabus.
                </p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search test by title or subject..."
                  value={testSearchQuery}
                  onChange={(e) => setTestSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Subject</label>
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <option value="All">All Subjects</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="English">English</option>
                  <option value="Pakistan Studies">Pakistan Studies</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Class / Level</label>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <option value="All">All Classes</option>
                  <option value="Class 9 (Matric Pt 1)">Class 9</option>
                  <option value="Class 10 (Matric Pt 2)">Class 10</option>
                  <option value="Class 11 (FSc Pt 1 / ICS)">Class 11</option>
                  <option value="Class 12 (FSc Pt 2 / ICS)">Class 12</option>
                  <option value="MDCAT Entry Test">MDCAT</option>
                  <option value="ECAT Entry Test">ECAT</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Test Type</label>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <option value="All">All Types</option>
                  <option value="Chapter Test">Chapter Test</option>
                  <option value="Subject Test">Subject Test</option>
                  <option value="Full Book Test">Full Book Test</option>
                  <option value="Board Test">Board Test</option>
                  <option value="Mock Test">Mock Test</option>
                  <option value="Practice Test">Practice Test</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAvailableTests.map((t) => {
              const userAttemptsOnThisTest = studentResults.filter((r) => r.testId === t.id).length;
              return (
                <Card key={t.id} hoverLift className="p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <Badge variant="blue" size="xs">
                        {t.subject}
                      </Badge>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {t.testType}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                      {t.title}
                    </h4>
                    {t.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {t.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" /> {t.durationMinutes} mins
                      </span>
                      <span className="flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-500" /> {t.totalQuestions} MCQs
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-emerald-500" /> Pass: {t.passPercentage || 50}%
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Used:{' '}
                        {userAttemptsOnThisTest}
                      </span>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full justify-center"
                      leftIcon={<Play className="w-3.5 h-3.5 fill-white" />}
                      onClick={() => {
                        if (onStartTestConfig) {
                          onStartTestConfig(t);
                        } else if (onStartQuiz) {
                          onStartQuiz();
                        }
                      }}
                    >
                      Start Assessment
                    </Button>
                  </div>
                </Card>
              );
            })}

            {filteredAvailableTests.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  title="No Matching Tests Found"
                  description="Try adjusting your subject or class filters above, or explore the MCQ Question Bank."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Study Roadmap Tab Content */}
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

      {/* 4. Result History Tab */}
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
                    <Badge
                      variant={res.percentage >= 50 ? 'emerald' : 'rose'}
                      size="xs"
                    >
                      {res.percentage >= 50 ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                    {res.testTitle}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mt-1 flex-wrap">
                    <span>
                      Score:{' '}
                      <strong className="text-blue-600 dark:text-cyan-400">
                        {res.marksObtained} / {res.totalMarks}
                      </strong>{' '}
                      ({res.percentage}%)
                    </span>
                    <span>
                      Grade: <strong>{res.grade}</strong>
                    </span>
                    <span>
                      Time:{' '}
                      <strong>
                        {Math.floor(res.timeUsedSeconds / 60)}m {res.timeUsedSeconds % 60}s
                      </strong>
                    </span>
                    <span>
                      Correct: <strong className="text-emerald-600">{res.correctCount}</strong>
                    </span>
                    <span>
                      Wrong: <strong className="text-rose-600">{res.wrongCount}</strong>
                    </span>
                    <span>
                      Skipped: <strong>{res.skippedCount}</strong>
                    </span>
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
              title="No tests attempted yet"
              description="Start practicing to build your progress."
            />
          )}
        </div>
      )}

      {/* 5. Performance Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Student Performance & Score Analytics
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Authoritative analytics calculated strictly from PostgreSQL examination records.
                </p>
              </div>
              {performanceData?.hasData && (
                <Badge variant="emerald" size="sm">
                  Pass Rate: {performanceData.passRate}%
                </Badge>
              )}
            </div>

            {performanceData?.hasData ? (
              <div className="space-y-6">
                {/* Metric Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Average Score</span>
                    <div className="text-2xl font-black text-blue-600 dark:text-cyan-400 mt-1">
                      {performanceData.averagePercentage}%
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Highest Score</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {performanceData.highestScore}%
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Total Questions</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {performanceData.totalQuestionsAnswered}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Overall Accuracy</span>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                      {performanceData.overallAccuracy}%
                    </div>
                  </div>
                </div>

                {/* Subject Strengths & Focus Areas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-3">
                    <span className="text-xs font-bold uppercase text-blue-600 dark:text-cyan-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Subject Breakdown
                    </span>
                    <ul className="text-xs space-y-2.5 text-slate-700 dark:text-slate-300">
                      {(performanceData.subjectBreakdown || []).map((s: any) => (
                        <li key={s.subject} className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                s.status === 'Strong'
                                  ? 'bg-emerald-500'
                                  : s.status === 'Average'
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                              }`}
                            />{' '}
                            {s.subject} ({s.testsCount} tests)
                          </span>
                          <strong className="text-slate-900 dark:text-white font-bold">
                            {s.averagePercentage}%
                          </strong>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-6 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-3">
                    <span className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Focus Areas
                    </span>
                    <ul className="text-xs space-y-2.5 text-slate-700 dark:text-slate-300">
                      {(performanceData.subjectBreakdown || [])
                        .filter((s: any) => s.status !== 'Strong')
                        .map((s: any) => (
                          <li key={s.subject} className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500" /> {s.subject}
                            </span>
                            <strong className="text-amber-600 font-bold">
                              {s.averagePercentage}% Avg
                            </strong>
                          </li>
                        ))}
                      {(performanceData.subjectBreakdown || []).filter((s: any) => s.status !== 'Strong')
                        .length === 0 && (
                        <li className="text-slate-500 text-xs">
                          All tested subjects are in strong standing (80%+)!
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                No tests attempted yet. Start practicing to build your progress.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 6. Certificates Tab */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Earned Certificates & Verification
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verifiable certificates issued to {student.name}.
              </p>
            </div>
            <Badge variant="amber" size="sm">
              {dbCertificates.length} Certificates
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dbCertificates.map((cert) => (
              <Card key={cert.id} className="p-5 flex flex-col justify-between space-y-4 border-amber-500/20">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <Badge variant="emerald" size="xs">
                      {cert.status || 'VALID'}
                    </Badge>
                    <span className="text-slate-400 font-mono text-[11px]">{cert.id}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cert.testName}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-2">
                    <span>
                      Score: <strong>{cert.score} / {cert.totalMarks}</strong> ({cert.percentage}%)
                    </span>
                    <span>
                      Grade: <strong>{cert.grade}</strong>
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Issued: {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : 'N/A'}
                  </span>
                  <button
                    onClick={() =>
                      exportCertificateToPDF({
                        id: cert.id,
                        studentName: cert.studentName || student.name,
                        testName: cert.testName,
                        score: cert.score,
                        totalMarks: cert.totalMarks,
                        percentage: cert.percentage,
                        grade: cert.grade,
                        issueDate: cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : '',
                        certificateNumber: cert.id,
                        verificationUrl: cert.verificationUrl || `https://taleemguru.pk/verify/${cert.id}`,
                      })
                    }
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </Card>
            ))}

            {dbCertificates.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  title="No Certificates Earned Yet"
                  description={`Pass any assessment with 50%+ score to earn your verifiable ${siteName} Merit Certificate.`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {achievements.map((ach) => (
              <Card
                key={ach.id}
                className={`p-5 space-y-3 ${
                  ach.unlocked ? 'border-amber-300 dark:border-amber-800' : 'opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{ach.icon}</span>
                  <Badge variant={ach.unlocked ? 'amber' : 'neutral'} size="xs">
                    {ach.unlocked ? 'Unlocked' : 'In Progress'}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ach.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {ach.description}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Progress</span>
                    <span>{Math.round(ach.progress)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${ach.progress}%` }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 8. Mistake Notebook Tab */}
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

      {/* 9. Saved Bookmarks Tab */}
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

      {/* 10. Profile Edit & Security Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
                  {profileModalTab === 'profile' ? <Edit3 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {profileModalTab === 'profile' ? 'Edit Student Profile' : 'Account Security'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {profileModalTab === 'profile'
                      ? 'Update personal and academic preferences'
                      : 'Change student account password'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditProfileOpen(false);
                  setPasswordChangeError(null);
                  setPasswordChangeSuccess(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setProfileModalTab('profile')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  profileModalTab === 'profile'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-cyan-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Profile Info
              </button>
              <button
                type="button"
                onClick={() => setProfileModalTab('password')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  profileModalTab === 'password'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-cyan-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Change Password
              </button>
            </div>

            {profileModalTab === 'profile' ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Education Board
                  </label>
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class Level
                  </label>
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Exam Goal
                  </label>
                  <input
                    type="text"
                    value={editTargetExam}
                    onChange={(e) => setEditTargetExam(e.target.value)}
                    placeholder="e.g. MDCAT 2026 / 10th Board Position"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Choose Avatar
                  </label>
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

                <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditProfileOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveProfile}>
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 text-xs">
                {passwordChangeError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{passwordChangeError}</span>
                  </div>
                )}

                {passwordChangeSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{passwordChangeSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      required
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setIsEditProfileOpen(false);
                      setPasswordChangeError(null);
                      setPasswordChangeSuccess(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={
                      isChangingPassword || !currentPassword || !newPassword || !confirmPassword
                    }
                  >
                    {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

