import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MCQ, TestConfig, PastPaper, StudyNote, AdminUser, TestResult, StaffRole } from '../types';
import { AdminLoginPortal } from './AdminLoginPortal';
import { AdminSidebar, AdminTabType } from './admin/AdminSidebar';
import { AdminHeader } from './admin/AdminHeader';
import { AdminDashboardTab } from './admin/AdminDashboardTab';
import { AdminQuestionsTab } from './admin/AdminQuestionsTab';
import { AdminQuizzesTab } from './admin/AdminQuizzesTab';
import { AdminStudentsTab } from './admin/AdminStudentsTab';
import { AdminStaffTab } from './admin/AdminStaffTab';
import { AdminAcademicTabs } from './admin/AdminAcademicTabs';
import { AdminContentTabs } from './admin/AdminContentTabs';
import { AdminResultsAndReportsTabs } from './admin/AdminResultsAndReportsTabs';
import { AdminReportsTab } from './admin/AdminReportsTab';
import { AdminAuditLogsTab } from './admin/AdminAuditLogsTab';
import { AdminCertificatesTab } from './AdminCertificatesTab';
import { AdminSettingsTab } from './admin/AdminSettingsTab';
import { BulkImportSection } from './BulkImportSection';
import { exportMCQsToWatermarkedPDF } from '../utils/watermark';
import {
  fetchAdminUsersApi,
  fetchAdminTestResultsApi,
  recordAdminAuditLogApi,
} from '../lib/api';
import { useToast } from './ui/Toast';
import { checkDuplicateMCQ, checkDuplicateTest } from '../utils/duplicateDetector';
import {
  isSectionAllowedForRoles,
  getAllowedSectionsForRoles,
  canEditMCQsForRoles,
  canCreateQuizzesForRoles,
  canManageStaffForRoles,
  canManageCurriculumForRoles,
  canViewReportsForRoles,
  canViewAuditLogsForRoles,
} from '../utils/staffRolePermissions';

export type AdminTab = AdminTabType;

/**
 * Defined permission mapping for dashboard tabs, tools, and capabilities per StaffRole.
 * E.g., 'Moderator' can access logs & moderation tools, 'Editor' can access MCQ management & curriculum tools.
 */
export interface RoleDashboardPermission {
  allowedTabs: AdminTabType[];
  accessibleTools: string[];
  canCurateMCQs: boolean;
  canManageQuestionBank: boolean;
  canCreateQuizzes: boolean;
  canManageStaff: boolean;
  canManageCurriculum: boolean;
  canViewReports: boolean;
  canViewAuditLogs: boolean;
  canBulkImport: boolean;
}

export const DASHBOARD_ROLE_PERMISSION_MAPPING: Record<StaffRole, RoleDashboardPermission> = {
  Admin: {
    allowedTabs: [
      'dashboard', 'staff', 'students', 'boards', 'classes', 'subjects', 'chapters',
      'questions', 'question-bank', 'quizzes', 'notes', 'past-papers', 'results',
      'leaderboard', 'certificates', 'reports', 'audit-logs', 'settings', 'bulk-import'
    ],
    accessibleTools: [
      'MCQ Management',
      'Question Bank Management',
      'Quiz Creator',
      'Staff Management',
      'Curriculum Management',
      'System Audit Logs',
      'Error & Performance Reports',
      'Bulk Data Import',
      'System Settings'
    ],
    canCurateMCQs: true,
    canManageQuestionBank: true,
    canCreateQuizzes: true,
    canManageStaff: true,
    canManageCurriculum: true,
    canViewReports: true,
    canViewAuditLogs: true,
    canBulkImport: true,
  },
  SuperAdmin: {
    allowedTabs: [
      'dashboard', 'staff', 'students', 'boards', 'classes', 'subjects', 'chapters',
      'questions', 'question-bank', 'quizzes', 'notes', 'past-papers', 'results',
      'leaderboard', 'certificates', 'reports', 'audit-logs', 'settings', 'bulk-import'
    ],
    accessibleTools: [
      'MCQ Management',
      'Question Bank Management',
      'Quiz Creator',
      'Staff Management',
      'Curriculum Management',
      'System Audit Logs',
      'Error & Performance Reports',
      'Bulk Data Import',
      'System Settings'
    ],
    canCurateMCQs: true,
    canManageQuestionBank: true,
    canCreateQuizzes: true,
    canManageStaff: true,
    canManageCurriculum: true,
    canViewReports: true,
    canViewAuditLogs: true,
    canBulkImport: true,
  },
  Editor: {
    allowedTabs: [
      'dashboard',
      'questions',
      'question-bank',
      'notes',
      'past-papers',
      'boards',
      'classes',
      'subjects',
      'chapters',
      'reports',
    ],
    accessibleTools: [
      'MCQ Management',
      'Question Bank Management',
      'Curriculum Management',
      'Study Notes & Past Papers',
      'Content Reports'
    ],
    canCurateMCQs: true,
    canManageQuestionBank: true,
    canCreateQuizzes: false,
    canManageStaff: false,
    canManageCurriculum: true,
    canViewReports: true,
    canViewAuditLogs: false,
    canBulkImport: false,
  },
  Moderator: {
    allowedTabs: [
      'dashboard',
      'reports',
      'audit-logs',
      'students',
      'results',
      'leaderboard',
    ],
    accessibleTools: [
      'Audit Logs & Security Monitoring',
      'Student Feedback & Reports Moderation',
      'Student Results Auditing',
      'Review Reported Content'
    ],
    canCurateMCQs: false, // Moderator without Editor cannot access MCQ management
    canManageQuestionBank: false,
    canCreateQuizzes: false,
    canManageStaff: false,
    canManageCurriculum: false,
    canViewReports: true,
    canViewAuditLogs: true, // Moderator can access logs!
    canBulkImport: false,
  },
  Teacher: {
    allowedTabs: [
      'dashboard',
      'quizzes',
      'questions',
      'question-bank',
      'notes',
      'past-papers',
      'results',
      'leaderboard',
      'certificates',
      'reports',
    ],
    accessibleTools: [
      'MCQ Management',
      'Question Bank Management',
      'Quiz Creator',
      'Exam Results Evaluation',
      'Student Performance Reports'
    ],
    canCurateMCQs: true,
    canManageQuestionBank: true,
    canCreateQuizzes: true,
    canManageStaff: false,
    canManageCurriculum: false,
    canViewReports: true,
    canViewAuditLogs: false,
    canBulkImport: false,
  },
  ContentManager: {
    allowedTabs: [
      'dashboard',
      'boards',
      'classes',
      'subjects',
      'chapters',
      'questions',
      'question-bank',
      'quizzes',
      'notes',
      'past-papers',
      'reports',
      'bulk-import',
    ],
    accessibleTools: [
      'MCQ Management',
      'Question Bank Management',
      'Curriculum Management',
      'Bulk Data Import',
      'Quiz Creator',
      'Content Reports'
    ],
    canCurateMCQs: true,
    canManageQuestionBank: true,
    canCreateQuizzes: true,
    canManageStaff: false,
    canManageCurriculum: true,
    canViewReports: true,
    canViewAuditLogs: false,
    canBulkImport: true,
  },
  Staff: {
    allowedTabs: [
      'dashboard',
      'students',
      'questions',
      'question-bank',
      'quizzes',
      'notes',
      'past-papers',
      'results',
      'reports',
    ],
    accessibleTools: [
      'MCQ Management',
      'Question Bank Management',
      'Quiz Creator',
      'Reports'
    ],
    canCurateMCQs: true,
    canManageQuestionBank: true,
    canCreateQuizzes: true,
    canManageStaff: false,
    canManageCurriculum: false,
    canViewReports: true,
    canViewAuditLogs: false,
    canBulkImport: false,
  },
  Student: {
    allowedTabs: ['dashboard', 'results', 'leaderboard', 'certificates'],
    accessibleTools: ['View Progress', 'Leaderboard & Badges'],
    canCurateMCQs: false,
    canManageQuestionBank: false,
    canCreateQuizzes: false,
    canManageStaff: false,
    canManageCurriculum: false,
    canViewReports: false,
    canViewAuditLogs: false,
    canBulkImport: false,
  },
};

export interface FilterDashboardByRoleResult {
  /** Filtered list of accessible dashboard tabs based on the permission mapping */
  tabs: AdminTabType[];
  /** Alias for tabs */
  visibleTabs: AdminTabType[];
  /** Tabs that are hidden for the provided roles */
  hiddenTabs: AdminTabType[];
  /** Filtered list of accessible tool names based on the permission mapping */
  accessibleTools: string[];
  /** Filtered tools list with capability booleans attached */
  tools: string[] & {
    canCurateMCQs: boolean;
    canManageQuestionBank: boolean;
    canCreateQuizzes: boolean;
    canManageStaff: boolean;
    canManageCurriculum: boolean;
    canViewReports: boolean;
    canViewAuditLogs: boolean;
    canBulkImport: boolean;
  };
  /** Granular boolean capability flags */
  capabilities: {
    canCurateMCQs: boolean;
    canManageQuestionBank: boolean;
    canCreateQuizzes: boolean;
    canManageStaff: boolean;
    canManageCurriculum: boolean;
    canViewReports: boolean;
    canViewAuditLogs: boolean;
    canBulkImport: boolean;
  };
  /** Helper function to check if a specific tab is visible */
  isTabVisible: (tabId: AdminTabType) => boolean;
  /** Helper function to check if a specific tool is accessible */
  isToolAccessible: (toolName: string) => boolean;
  /** UI element display flags */
  uiElements: {
    showCurateMCQsTab: boolean;
    showManageQuestionBankTab: boolean;
    showNewQuestionButton: boolean;
    showQuestionBankBreakdown: boolean;
    showEditDeleteActions: boolean;
    showModerationQueue: boolean;
    showStaffManagement: boolean;
    showAuditLogs: boolean;
  };
}

/**
 * Filters the accessible dashboard tabs and tools based on an array of user roles
 * and the defined permission mapping (e.g., 'Moderator' can access logs, 'Editor' can access MCQ management).
 *
 * @param roles Array of user roles (e.g. adminUser.roles)
 * @returns Filtered list of accessible dashboard tabs and tools
 */
export const filterDashboardByRole = (roles: StaffRole[] = []): FilterDashboardByRoleResult => {
  const activeRoles: StaffRole[] = roles.length > 0 ? roles : ['Student'];

  const hasAdmin = activeRoles.includes('Admin') || activeRoles.includes('SuperAdmin');
  const hasEditor = activeRoles.includes('Editor');
  const hasTeacher = activeRoles.includes('Teacher');
  const hasContentManager = activeRoles.includes('ContentManager');
  const hasModerator = activeRoles.includes('Moderator');

  // Permission mapping resolution: collect allowed tabs and accessible tools across all active roles
  const aggregatedTabsSet = new Set<AdminTabType>();
  const aggregatedToolsSet = new Set<string>();

  activeRoles.forEach((role) => {
    const mapping = DASHBOARD_ROLE_PERMISSION_MAPPING[role];
    if (mapping) {
      mapping.allowedTabs.forEach((tab) => aggregatedTabsSet.add(tab));
      mapping.accessibleTools.forEach((tool) => aggregatedToolsSet.add(tool));
    }
  });

  // Rule: If a user has 'Moderator' but lacks 'Editor' (and not Admin/Teacher/ContentManager),
  // hide 'Curate MCQs' ('questions') and 'Manage Question Bank' ('question-bank') tabs and MCQ tools.
  const canCurateMCQs =
    (hasAdmin || hasEditor || hasTeacher || hasContentManager) &&
    !(hasModerator && !hasEditor && !hasAdmin && !hasTeacher && !hasContentManager);
  const canManageQuestionBank = canCurateMCQs;

  if (!canCurateMCQs) {
    aggregatedTabsSet.delete('questions');
    aggregatedTabsSet.delete('question-bank');
    aggregatedToolsSet.delete('MCQ Management');
    aggregatedToolsSet.delete('Question Bank Management');
  }

  // Moderator can access logs: ensure 'audit-logs' is accessible if Moderator or Admin has it
  const canViewAuditLogs = hasAdmin || hasModerator;
  if (!canViewAuditLogs) {
    aggregatedTabsSet.delete('audit-logs');
    aggregatedToolsSet.delete('System Audit Logs');
    aggregatedToolsSet.delete('Audit Logs & Security Monitoring');
  }

  const canCreateQuizzes = hasAdmin || hasTeacher || hasContentManager;
  const canManageStaff = hasAdmin;
  const canManageCurriculum = hasAdmin || hasEditor || hasContentManager;
  const canViewReports =
    hasAdmin ||
    hasTeacher ||
    hasEditor ||
    hasModerator ||
    hasContentManager ||
    activeRoles.includes('Staff');
  const canBulkImport = hasAdmin || hasContentManager;

  const tabs: AdminTabType[] = Array.from(aggregatedTabsSet);
  const accessibleTools: string[] = Array.from(aggregatedToolsSet);

  const isTabVisible = (tabId: AdminTabType): boolean => {
    if (tabId === 'questions' || tabId === 'question-bank') {
      return canCurateMCQs;
    }
    if (tabId === 'audit-logs') {
      return canViewAuditLogs;
    }
    return tabs.includes(tabId);
  };

  const isToolAccessible = (toolName: string): boolean => {
    return accessibleTools.some((t) => t.toLowerCase().includes(toolName.toLowerCase()));
  };

  const allPossibleTabs: AdminTabType[] = [
    'dashboard',
    'staff',
    'students',
    'boards',
    'classes',
    'subjects',
    'chapters',
    'questions',
    'question-bank',
    'quizzes',
    'notes',
    'past-papers',
    'results',
    'leaderboard',
    'certificates',
    'reports',
    'audit-logs',
    'settings',
    'bulk-import',
  ];

  const hiddenTabs: AdminTabType[] = allPossibleTabs.filter((tab) => !isTabVisible(tab));

  const capabilities = {
    canCurateMCQs,
    canManageQuestionBank,
    canCreateQuizzes,
    canManageStaff,
    canManageCurriculum,
    canViewReports,
    canViewAuditLogs,
    canBulkImport,
  };

  const tools = Object.assign([...accessibleTools], capabilities);

  const uiElements = {
    showCurateMCQsTab: canCurateMCQs,
    showManageQuestionBankTab: canManageQuestionBank,
    showNewQuestionButton: canCurateMCQs,
    showQuestionBankBreakdown: canCurateMCQs,
    showEditDeleteActions: canCurateMCQs,
    showModerationQueue: canViewReports || hasModerator,
    showStaffManagement: canManageStaff,
    showAuditLogs: canViewAuditLogs,
  };

  return {
    tabs,
    visibleTabs: tabs,
    hiddenTabs,
    accessibleTools,
    tools,
    capabilities,
    isTabVisible,
    isToolAccessible,
    uiElements,
  };
};

interface AdminTeacherPanelProps {
  allMCQs: MCQ[];
  allTests?: TestConfig[];
  allPastPapers?: PastPaper[];
  allStudyNotes?: StudyNote[];
  historyResults?: TestResult[];
  adminUser?: AdminUser | null;
  onAdminLogin?: (admin: AdminUser) => void;
  onAdminLogout?: () => void;
  onBackToHome?: () => void;
  onAddMCQ: (newMCQ: MCQ) => void;
  onUpdateMCQ?: (updatedMCQ: MCQ) => void;
  onDeleteMCQ: (id: string) => void;
  onCreateCustomTest: (test: TestConfig) => void;
  onUpdateCustomTest?: (test: TestConfig) => void;
  onDeleteCustomTest?: (id: string) => void;
  onStartTest?: (test: TestConfig) => void;
  onBulkImportMCQs?: (mcqs: MCQ[], replace?: boolean) => void;
  onBulkImportTests?: (tests: TestConfig[], replace?: boolean) => void;
  onBulkImportPastPapers?: (papers: PastPaper[], replace?: boolean) => void;
  onBulkImportStudyNotes?: (notes: StudyNote[], replace?: boolean) => void;
  onBulkImportBundle?: (
    bundle: { mcqs?: MCQ[]; tests?: TestConfig[]; pastPapers?: PastPaper[]; studyNotes?: StudyNote[] },
    replace?: boolean
  ) => void;
  onNavigateTab?: (tab: string) => void;
  initialTab?: AdminTab;
}

export const AdminTeacherPanel: React.FC<AdminTeacherPanelProps> = ({
  allMCQs,
  allTests = [],
  allPastPapers = [],
  allStudyNotes = [],
  historyResults: propHistoryResults = [],
  adminUser = null,
  onAdminLogin = () => {},
  onAdminLogout = () => {},
  onBackToHome,
  onAddMCQ,
  onUpdateMCQ,
  onDeleteMCQ,
  onCreateCustomTest,
  onUpdateCustomTest,
  onDeleteCustomTest,
  onStartTest,
  onBulkImportMCQs = (_mcqs: MCQ[], _replace?: boolean) => {},
  onBulkImportTests = (_tests: TestConfig[], _replace?: boolean) => {},
  onBulkImportPastPapers = (_papers: PastPaper[], _replace?: boolean) => {},
  onBulkImportStudyNotes = (_notes: StudyNote[], _replace?: boolean) => {},
  onBulkImportBundle = (_bundle: any, _replace?: boolean) => {},
  onNavigateTab,
  initialTab = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabType>(initialTab || 'dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { showToast } = useToast();

  // Role-Based Filtering State
  const userRoles: StaffRole[] =
    adminUser?.roles && adminUser.roles.length > 0
      ? adminUser.roles
      : adminUser?.role
      ? [adminUser.role as StaffRole]
      : ['Admin'];

  const [activeRoleFilter, setActiveRoleFilter] = useState<StaffRole | 'All'>('All');

  /**
   * Filters the available dashboard tabs, tools, and UI elements based on the current user's roles array.
   * Leverages the defined permission mapping:
   * - 'Moderator' can access logs ('audit-logs') and moderation tools, but not MCQ management without 'Editor'
   * - 'Editor' can access MCQ management ('questions', 'question-bank') and curriculum tools, but not logs
   */
  const filterDashboardTabsAndTools = (roles: StaffRole[] = []) => filterDashboardByRole(roles);

  const effectiveRoles: StaffRole[] =
    activeRoleFilter === 'All' ? userRoles : [activeRoleFilter];

  // Derive visible tabs, visibility checker, and tool access flags for the active view
  const { tabs, visibleTabs, hiddenTabs, isTabVisible, tools, accessibleTools, capabilities, uiElements } =
    filterDashboardByRole(effectiveRoles);
  const canEditMCQs = tools.canCurateMCQs;
  const canCreateQuizzes = tools.canCreateQuizzes;
  const canManageStaff = tools.canManageStaff;

  // State for registered students & users loaded authoritatively from database (No mock users)
  const [studentsList, setStudentsList] = useState<AdminUser[]>([]);
  const [submissionsList, setSubmissionsList] = useState<TestResult[]>(propHistoryResults);

  // Authoritatively load registered users & test submissions from Cloud SQL backend
  const loadDatabaseUsersAndResults = () => {
    if (!adminUser) return;
    fetchAdminUsersApi()
      .then((dbUsers) => {
        if (Array.isArray(dbUsers)) {
          const mappedUsers: AdminUser[] = dbUsers.map((u: any) => ({
            id: u.uid || String(u.id),
            name: u.name || 'Learner',
            email: u.email,
            roles: (u.roles || []).length > 0 ? u.roles : ['Student'],
            classLevel: u.classLevel || 'Class 10',
            board: u.board || 'BISE Lahore',
            status: 'Active',
            testsCompleted: u.testsTaken || 0,
            points: u.points || 0,
            joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : 'Recent',
          }));
          setStudentsList(mappedUsers);
        }
      })
      .catch((err) => {
        console.warn('Notice: Unable to load registered database users:', err);
      });

    fetchAdminTestResultsApi()
      .then((dbResults) => {
        if (Array.isArray(dbResults) && dbResults.length > 0) {
          const mappedResults: TestResult[] = dbResults.map((r: any) => ({
            id: r.submissionId || String(r.id),
            testId: r.testId || 'test-1',
            testTitle: r.testTitle || 'Board Practice Exam',
            testType: 'Practice Test',
            category: 'Board Practice',
            subject: r.subject || 'General Science',
            totalQuestions: r.totalQuestions || 10,
            answeredCount: (r.correctAnswers || 0) + (r.wrongAnswers || 0),
            marksObtained: r.score || 0,
            totalMarks: r.totalMarks || 10,
            percentage: r.percentage || 0,
            correctCount: r.correctAnswers || 0,
            wrongCount: r.wrongAnswers || 0,
            skippedCount: 0,
            timeUsedSeconds: r.timeSpentSeconds || 600,
            totalDurationSeconds: 900,
            percentileRank: 85,
            answers: [],
            questions: [],
            timestamp: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
            userEmail: r.userEmail || 'Anonymous Student',
            grade: r.percentage >= 80 ? 'A+' : r.percentage >= 70 ? 'A' : r.percentage >= 60 ? 'B' : r.percentage >= 50 ? 'C' : 'F',
          }));
          setSubmissionsList(mappedResults);
        }
      })
      .catch((err) => {
        console.warn('Notice: Unable to load database test submissions:', err);
      });
  };

  useEffect(() => {
    loadDatabaseUsersAndResults();
  }, [adminUser?.id, adminUser?.role]);

  const [quizzesList, setQuizzesList] = useState<TestConfig[]>(allTests);
  const [questionsList, setQuestionsList] = useState<MCQ[]>(allMCQs);
  const [pastPapersList, setPastPapersList] = useState<PastPaper[]>(allPastPapers);
  const [studyNotesList, setStudyNotesList] = useState<StudyNote[]>(allStudyNotes);

  // Sync with prop updates
  useEffect(() => {
    setQuestionsList(allMCQs);
  }, [allMCQs]);

  useEffect(() => {
    setQuizzesList(allTests);
  }, [allTests]);

  useEffect(() => {
    setPastPapersList(allPastPapers);
  }, [allPastPapers]);

  useEffect(() => {
    setStudyNotesList(allStudyNotes);
  }, [allStudyNotes]);

  useEffect(() => {
    if (propHistoryResults.length > 0 && submissionsList.length === 0) {
      setSubmissionsList(propHistoryResults);
    }
  }, [propHistoryResults, submissionsList.length]);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, activeTab]);

  // Tab navigation handler
  const handleTabChange = (tab: AdminTabType) => {
    setActiveTab(tab);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Questions Handlers
  const handleAddQuestion = (newQ: MCQ) => {
    const dup = checkDuplicateMCQ(
      newQ.question,
      newQ.subject,
      newQ.classLevel,
      newQ.board,
      undefined,
      questionsList
    );
    if (dup.isDuplicate) {
      showToast({
        type: 'error',
        title: 'Submission Blocked: Duplicate MCQ',
        message: dup.reason,
        duration: 5000,
      });
      return;
    }

    setQuestionsList((prev) => [newQ, ...prev]);
    onAddMCQ(newQ);
    recordAdminAuditLogApi({
      action: 'CREATE_MCQ',
      targetType: 'mcq',
      targetId: newQ.id,
      details: `${newQ.subject} (${newQ.classLevel}): ${newQ.question.slice(0, 80)}`,
    }).catch(() => {});
  };

  const handleUpdateQuestion = (updatedQ: MCQ) => {
    setQuestionsList((prev) =>
      prev.map((q) => (q.id === updatedQ.id ? updatedQ : q))
    );
    if (onUpdateMCQ) {
      onUpdateMCQ(updatedQ);
    }
    recordAdminAuditLogApi({
      action: 'UPDATE_MCQ',
      targetType: 'mcq',
      targetId: updatedQ.id,
      details: `Updated MCQ in ${updatedQ.subject}`,
    }).catch(() => {});
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestionsList((prev) => prev.filter((q) => q.id !== id));
    onDeleteMCQ(id);
    recordAdminAuditLogApi({
      action: 'DELETE_MCQ',
      targetType: 'mcq',
      targetId: id,
      details: 'Deleted question from question bank',
    }).catch(() => {});
  };

  // Quizzes Handlers
  const handleCreateQuiz = (newQuiz: TestConfig) => {
    const dup = checkDuplicateTest(
      newQuiz.title,
      newQuiz.subject,
      newQuiz.classLevel,
      newQuiz.board,
      undefined,
      quizzesList
    );
    if (dup.isDuplicate) {
      showToast({
        type: 'error',
        title: 'Submission Blocked: Duplicate Quiz Title',
        message: dup.reason,
        duration: 5000,
      });
      return;
    }

    setQuizzesList((prev) => [newQuiz, ...prev]);
    onCreateCustomTest(newQuiz);
    recordAdminAuditLogApi({
      action: 'CREATE_QUIZ',
      targetType: 'quiz',
      targetId: newQuiz.id,
      details: `Created assessment: ${newQuiz.title} (${newQuiz.subject})`,
    }).catch(() => {});
  };

  const handleUpdateQuiz = (updatedQuiz: TestConfig) => {
    setQuizzesList((prev) =>
      prev.map((q) => (q.id === updatedQuiz.id ? updatedQuiz : q))
    );
    if (onUpdateCustomTest) {
      onUpdateCustomTest(updatedQuiz);
    }
    recordAdminAuditLogApi({
      action: 'UPDATE_QUIZ',
      targetType: 'quiz',
      targetId: updatedQuiz.id,
      details: `Updated quiz: ${updatedQuiz.title}`,
    }).catch(() => {});
  };

  const handleDeleteQuiz = (id: string) => {
    setQuizzesList((prev) => prev.filter((q) => q.id !== id));
    if (onDeleteCustomTest) {
      onDeleteCustomTest(id);
    }
    recordAdminAuditLogApi({
      action: 'DELETE_QUIZ',
      targetType: 'quiz',
      targetId: id,
      details: 'Deleted test configuration',
    }).catch(() => {});
  };

  // Students Handlers
  const handleUpdateStudent = (updatedStudent: AdminUser) => {
    setStudentsList((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
    recordAdminAuditLogApi({
      action: 'UPDATE_USER_STATUS',
      targetType: 'user',
      targetId: updatedStudent.id,
      details: `Set status to ${updatedStudent.status} for ${updatedStudent.email}`,
    }).catch(() => {});
  };

  // Past Papers Handlers
  const handleAddPastPaper = (paper: PastPaper) => {
    setPastPapersList((prev) => [paper, ...prev]);
    if (onBulkImportPastPapers) {
      onBulkImportPastPapers([paper]);
    }
    recordAdminAuditLogApi({
      action: 'CREATE_PAST_PAPER',
      targetType: 'past_paper',
      targetId: paper.id,
      details: `Added past paper: ${paper.title} (${paper.board} ${paper.year})`,
    }).catch(() => {});
  };

  const handleUpdatePastPaper = (updatedPaper: PastPaper) => {
    setPastPapersList((prev) =>
      prev.map((p) => (p.id === updatedPaper.id ? updatedPaper : p))
    );
  };

  const handleDeletePastPaper = (id: string) => {
    setPastPapersList((prev) => prev.filter((p) => p.id !== id));
    recordAdminAuditLogApi({
      action: 'DELETE_PAST_PAPER',
      targetType: 'past_paper',
      targetId: id,
      details: 'Deleted past paper record',
    }).catch(() => {});
  };

  // Study Notes Handlers
  const handleAddNote = (note: StudyNote) => {
    setStudyNotesList((prev) => [note, ...prev]);
    if (onBulkImportStudyNotes) {
      onBulkImportStudyNotes([note]);
    }
    recordAdminAuditLogApi({
      action: 'CREATE_NOTE',
      targetType: 'note',
      targetId: note.id,
      details: `Added revision note: ${note.title} (${note.subject})`,
    }).catch(() => {});
  };

  const handleUpdateNote = (updatedNote: StudyNote) => {
    setStudyNotesList((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
  };

  const handleDeleteNote = (id: string) => {
    setStudyNotesList((prev) => prev.filter((n) => n.id !== id));
    recordAdminAuditLogApi({
      action: 'DELETE_NOTE',
      targetType: 'note',
      targetId: id,
      details: 'Deleted study note record',
    }).catch(() => {});
  };

  // Bulk Import Handlers (Wrapped)
  const handleBulkImportMCQsAction = (imported: MCQ[], replace?: boolean) => {
    setQuestionsList((prev) => (replace ? imported : [...imported, ...prev]));
    onBulkImportMCQs?.(imported, replace);
  };
  const handleBulkImportTestsAction = (imported: TestConfig[], replace?: boolean) => {
    setQuizzesList((prev) => (replace ? imported : [...imported, ...prev]));
    onBulkImportTests?.(imported, replace);
  };
  const handleBulkImportPastPapersAction = (imported: PastPaper[], replace?: boolean) => {
    setPastPapersList((prev) => (replace ? imported : [...imported, ...prev]));
    onBulkImportPastPapers?.(imported, replace);
  };
  const handleBulkImportStudyNotesAction = (imported: StudyNote[], replace?: boolean) => {
    setStudyNotesList((prev) => (replace ? imported : [...imported, ...prev]));
    onBulkImportStudyNotes?.(imported, replace);
  };
  const handleBulkImportBundleAction = (bundle: any, replace?: boolean) => {
    if (bundle.mcqs) setQuestionsList((prev) => (replace ? bundle.mcqs : [...bundle.mcqs, ...prev]));
    if (bundle.tests) setQuizzesList((prev) => (replace ? bundle.tests : [...bundle.tests, ...prev]));
    if (bundle.pastPapers) setPastPapersList((prev) => (replace ? bundle.pastPapers : [...bundle.pastPapers, ...prev]));
    if (bundle.studyNotes) setStudyNotesList((prev) => (replace ? bundle.studyNotes : [...bundle.studyNotes, ...prev]));
    onBulkImportBundle?.(bundle, replace);
  };

  // Watermark PDF Export
  const handleExportPDF = (filteredQuestions?: MCQ[]) => {
    const listToExport = filteredQuestions && filteredQuestions.length > 0 ? filteredQuestions : questionsList;
    exportMCQsToWatermarkedPDF(
      'Taleem Guru - Question Bank Export',
      'Class 9-12 / MDCAT / ECAT Board Exam Material',
      listToExport
    );
  };

  // Counts for sidebar badges
  const staffMembersCount = studentsList.filter((u) =>
    ['Admin', 'Teacher', 'Editor', 'ContentManager', 'Moderator', 'SuperAdmin'].includes(u.role)
  ).length;

  const counts = {
    staff: staffMembersCount,
    students: studentsList.length,
    boards: 30,
    classes: 6,
    subjects: 12,
    chapters: 54,
    questions: questionsList.length,
    quizzes: quizzesList.length,
    notes: studyNotesList.length,
    pastPapers: pastPapersList.length,
    results: submissionsList.length,
    leaderboard: 50,
    reports: 0,
  };

  // If not logged in as Admin, show login portal
  if (!adminUser) {
    return (
      <AdminLoginPortal
        onLoginSuccess={onAdminLogin}
        onBackToHome={onBackToHome}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 flex flex-col">
      {/* Top Header */}
      <AdminHeader
        activeTabTitle={activeTab}
        adminUser={adminUser}
        selectedRoles={userRoles}
        activeRoleFilter={activeRoleFilter}
        onRoleFilterChange={(role) => setActiveRoleFilter(role)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onQuickAction={(action) => {
          if (action === 'add-question') handleTabChange('questions');
          else if (action === 'create-quiz') handleTabChange('quizzes');
          else if (action === 'add-note') handleTabChange('notes');
        }}
        onLogout={onAdminLogout}
        onBackToHome={onBackToHome}
      />

      {/* Main Admin Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Responsive Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          counts={counts}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          selectedRoles={userRoles}
          activeRoleFilter={activeRoleFilter}
          onRoleFilterChange={(role) => setActiveRoleFilter(role)}
          allowedTabs={visibleTabs}
        />

        {/* Content View Container */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            {/* If the active section is forbidden for the active role filter, show an informative role guard */}
            {!isTabVisible(activeTab) ? (
              <motion.div
                key={`guarded-${activeTab}-${activeRoleFilter}`}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-xs text-center max-w-lg mx-auto my-12 space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Section Hidden for {activeRoleFilter}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    The &ldquo;{activeTab === 'questions' ? 'Curate MCQs' : activeTab === 'question-bank' ? 'Manage Question Bank' : activeTab}&rdquo; module is not accessible under your current <strong>{activeRoleFilter}</strong> view filter. Switch back to full permissions or select a role with access to view this section.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <button
                    onClick={() => setActiveRoleFilter('All')}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Reset Filter to All
                  </button>
                  <button
                    onClick={() => handleTabChange('dashboard')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`tab-${activeTab}-${activeRoleFilter}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                className="w-full"
              >
                {activeTab === 'dashboard' && (
                  <AdminDashboardTab
                    adminUser={adminUser}
                    allQuestions={questionsList}
                    allQuizzes={quizzesList}
                    allStudents={studentsList}
                    allPastPapers={pastPapersList}
                    allStudyNotes={studyNotesList}
                    historyResults={submissionsList}
                    onNavigateTab={handleTabChange}
                    selectedRoles={userRoles}
                    activeRoleFilter={activeRoleFilter}
                    allowedTabs={visibleTabs}
                    canEditMCQs={tools.canCurateMCQs}
                  />
                )}

                {(activeTab === 'questions' || activeTab === 'question-bank') && (
                  <AdminQuestionsTab
                    questions={questionsList}
                    onAddQuestion={handleAddQuestion}
                    onUpdateQuestion={handleUpdateQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                    onExportPDF={handleExportPDF}
                    canEdit={canEditMCQs}
                    activeRoleFilter={activeRoleFilter}
                  />
                )}

          {activeTab === 'quizzes' && (
            <AdminQuizzesTab
              quizzes={quizzesList}
              allQuestions={questionsList}
              onCreateQuiz={handleCreateQuiz}
              onUpdateQuiz={handleUpdateQuiz}
              onDeleteQuiz={handleDeleteQuiz}
              onPreviewQuiz={(q) => {
                if (onStartTest) {
                  onStartTest(q);
                }
              }}
            />
          )}

          {activeTab === 'staff' && (
            <AdminStaffTab
              students={studentsList}
              adminUser={adminUser}
              onUpdateStudent={handleUpdateStudent}
              onAddStudent={(newStaff) => setStudentsList((prev) => [newStaff, ...prev])}
              onRefresh={loadDatabaseUsersAndResults}
            />
          )}

          {activeTab === 'students' && (
            <AdminStudentsTab
              students={studentsList}
              historyResults={submissionsList}
              onUpdateStudent={handleUpdateStudent}
              onRefresh={loadDatabaseUsersAndResults}
            />
          )}

          {activeTab === 'boards' && (
            <AdminAcademicTabs
              type="boards"
              allMCQs={questionsList}
              allTests={quizzesList}
            />
          )}

          {activeTab === 'classes' && (
            <AdminAcademicTabs
              type="classes"
              allMCQs={questionsList}
              allTests={quizzesList}
            />
          )}

          {activeTab === 'subjects' && (
            <AdminAcademicTabs
              type="subjects"
              allMCQs={questionsList}
              allTests={quizzesList}
            />
          )}

          {activeTab === 'chapters' && (
            <AdminAcademicTabs
              type="chapters"
              allMCQs={questionsList}
              allTests={quizzesList}
            />
          )}

          {activeTab === 'notes' && (
            <AdminContentTabs
              type="notes"
              notes={studyNotesList}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {activeTab === 'past-papers' && (
            <AdminContentTabs
              type="past-papers"
              pastPapers={pastPapersList}
              onAddPastPaper={handleAddPastPaper}
              onUpdatePastPaper={handleUpdatePastPaper}
              onDeletePastPaper={handleDeletePastPaper}
            />
          )}

          {activeTab === 'results' && (
            <AdminResultsAndReportsTabs
              type="results"
              results={submissionsList}
              allQuestions={questionsList}
            />
          )}

          {activeTab === 'leaderboard' && (
            <AdminResultsAndReportsTabs
              type="leaderboard"
              results={submissionsList}
              allQuestions={questionsList}
            />
          )}

          {activeTab === 'reports' && (
            <AdminReportsTab
              onNavigateToQuestion={() => handleTabChange('questions')}
              onNavigateToTest={() => handleTabChange('quizzes')}
            />
          )}
          
          {activeTab === 'certificates' && <AdminCertificatesTab />}

          {activeTab === 'bulk-import' && (
            <BulkImportSection
              allMCQs={questionsList}
              allTests={quizzesList}
              allPastPapers={pastPapersList}
              allStudyNotes={studyNotesList}
              onBulkImportMCQs={handleBulkImportMCQsAction}
              onBulkImportTests={handleBulkImportTestsAction}
              onBulkImportPastPapers={handleBulkImportPastPapersAction}
              onBulkImportStudyNotes={handleBulkImportStudyNotesAction}
              onBulkImportBundle={handleBulkImportBundleAction}
              onNavigateTab={handleTabChange}
            />
          )}

          {activeTab === 'audit-logs' && (
            <AdminAuditLogsTab />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsTab
              allMCQs={questionsList}
              allTests={quizzesList}
              adminUser={adminUser}
            />
          )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
