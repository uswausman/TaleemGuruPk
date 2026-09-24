import { StaffRole } from '../types';
import { AdminSection } from '../components/admin/AdminSidebar';

export const ALL_STAFF_ROLES: StaffRole[] = [
  'Admin',
  'Teacher',
  'Editor',
  'ContentManager',
  'Moderator',
  'Student',
];

export interface RoleCapability {
  title: string;
  shortDescription: string;
  color: string;
  bgLight: string;
  borderLight: string;
  allowedSections: AdminSection[];
  canEditMCQs: boolean;
  canCreateQuizzes: boolean;
  canManageStaff: boolean;
  canManageCurriculum: boolean;
  canViewReports: boolean;
  canViewAuditLogs: boolean;
  canManageSettings: boolean;
  canBulkImport: boolean;
}

export const ROLE_CAPABILITIES: Record<StaffRole, RoleCapability> = {
  Admin: {
    title: 'Administrator',
    shortDescription: 'Unrestricted access to all tools, settings, users, and question editors',
    color: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-50 dark:bg-rose-950/40',
    borderLight: 'border-rose-200 dark:border-rose-900/50',
    allowedSections: [
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
      'documents',
      'results',
      'leaderboard',
      'certificates',
      'reports',
      'audit-logs',
      'settings',
      'bulk-import',
    ],
    canEditMCQs: true,
    canCreateQuizzes: true,
    canManageStaff: true,
    canManageCurriculum: true,
    canViewReports: true,
    canViewAuditLogs: true,
    canManageSettings: true,
    canBulkImport: true,
  },
  SuperAdmin: {
    title: 'Super Administrator',
    shortDescription: 'Full system sovereignty and security management',
    color: 'text-purple-600 dark:text-purple-400',
    bgLight: 'bg-purple-50 dark:bg-purple-950/40',
    borderLight: 'border-purple-200 dark:border-purple-900/50',
    allowedSections: [
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
      'documents',
      'results',
      'leaderboard',
      'certificates',
      'reports',
      'audit-logs',
      'settings',
      'bulk-import',
    ],
    canEditMCQs: true,
    canCreateQuizzes: true,
    canManageStaff: true,
    canManageCurriculum: true,
    canViewReports: true,
    canViewAuditLogs: true,
    canManageSettings: true,
    canBulkImport: true,
  },
  Staff: {
    title: 'Staff Member',
    shortDescription: 'General administrative support and student monitoring',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderLight: 'border-indigo-200 dark:border-indigo-900/50',
    allowedSections: [
      'dashboard',
      'students',
      'questions',
      'question-bank',
      'quizzes',
      'notes',
      'past-papers',
      'documents',
      'results',
      'reports',
    ],
    canEditMCQs: true,
    canCreateQuizzes: true,
    canManageStaff: false,
    canManageCurriculum: false,
    canViewReports: true,
    canViewAuditLogs: false,
    canManageSettings: false,
    canBulkImport: false,
  },
  Teacher: {
    title: 'Teacher',
    shortDescription: 'Create quizzes, assess candidate scores, and contribute MCQs',
    color: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    borderLight: 'border-blue-200 dark:border-blue-900/50',
    allowedSections: [
      'dashboard',
      'quizzes',
      'questions',
      'question-bank',
      'notes',
      'past-papers',
      'documents',
      'results',
      'leaderboard',
      'certificates',
      'reports',
    ],
    canEditMCQs: true,
    canCreateQuizzes: true,
    canManageStaff: false,
    canManageCurriculum: false,
    canViewReports: true,
    canViewAuditLogs: false,
    canManageSettings: false,
    canBulkImport: false,
  },
  Editor: {
    title: 'MCQ & Content Editor',
    shortDescription: 'Curate MCQs, question explanations, syllabi, notes, and past papers',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderLight: 'border-emerald-200 dark:border-emerald-900/50',
    allowedSections: [
      'dashboard',
      'questions',
      'question-bank',
      'notes',
      'past-papers',
      'documents',
      'boards',
      'classes',
      'subjects',
      'chapters',
      'reports',
    ],
    canEditMCQs: true,
    canCreateQuizzes: false,
    canManageStaff: false,
    canManageCurriculum: true,
    canViewReports: true,
    canViewAuditLogs: false,
    canManageSettings: false,
    canBulkImport: false,
  },
  ContentManager: {
    title: 'Curriculum & Content Manager',
    shortDescription: 'Manage questions, academic suites, question bank, and bulk imports',
    color: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    borderLight: 'border-amber-200 dark:border-amber-900/50',
    allowedSections: [
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
      'documents',
      'reports',
      'bulk-import',
    ],
    canEditMCQs: true,
    canCreateQuizzes: true,
    canManageStaff: false,
    canManageCurriculum: true,
    canViewReports: true,
    canViewAuditLogs: false,
    canManageSettings: false,
    canBulkImport: true,
  },
  Moderator: {
    title: 'Content & Community Moderator',
    shortDescription: 'Audit error reports, monitor student feedback, and audit security logs. MCQ Editor tools hidden.',
    color: 'text-teal-600 dark:text-teal-400',
    bgLight: 'bg-teal-50 dark:bg-teal-950/40',
    borderLight: 'border-teal-200 dark:border-teal-900/50',
    allowedSections: [
      'dashboard',
      'reports',
      'audit-logs',
      'students',
      'results',
      'leaderboard',
    ],
    canEditMCQs: false, // Explicitly false! Hides MCQ Editor tools!
    canCreateQuizzes: false,
    canManageStaff: false,
    canManageCurriculum: false,
    canViewReports: true,
    canViewAuditLogs: true,
    canManageSettings: false,
    canBulkImport: false,
  },
  Student: {
    title: 'Student Learner',
    shortDescription: 'Candidate view only',
    color: 'text-slate-600 dark:text-slate-400',
    bgLight: 'bg-slate-50 dark:bg-slate-800',
    borderLight: 'border-slate-200 dark:border-slate-700',
    allowedSections: [
      'dashboard',
      'results',
      'certificates',
      'leaderboard',
    ],
    canEditMCQs: false,
    canCreateQuizzes: false,
    canManageStaff: false,
    canManageCurriculum: false,
    canViewReports: false,
    canViewAuditLogs: false,
    canManageSettings: false,
    canBulkImport: false,
  },
};

/**
 * Checks if a specific section is allowed for the given active roles
 */
export function isSectionAllowedForRoles(section: AdminSection, roles: StaffRole[]): boolean {
  if (!roles || roles.length === 0) return section === 'dashboard';
  // If any role allows this section, grant access
  return roles.some((r) => {
    const cap = ROLE_CAPABILITIES[r] || ROLE_CAPABILITIES.Student;
    return cap.allowedSections.includes(section);
  });
}

/**
 * Checks if MCQ Editor tools should be visible/active
 * Specifically returns false for Moderator (unless accompanied by Editor/Admin/Teacher)
 */
export function canEditMCQsForRoles(roles: StaffRole[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => {
    const cap = ROLE_CAPABILITIES[r];
    return cap ? cap.canEditMCQs : false;
  });
}

/**
 * Checks if Quiz creation tools should be visible
 */
export function canCreateQuizzesForRoles(roles: StaffRole[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => {
    const cap = ROLE_CAPABILITIES[r];
    return cap ? cap.canCreateQuizzes : false;
  });
}

/**
 * Checks if Staff user management is allowed
 */
export function canManageStaffForRoles(roles: StaffRole[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => {
    const cap = ROLE_CAPABILITIES[r];
    return cap ? cap.canManageStaff : false;
  });
}

/**
 * Checks if Audit Logs are accessible
 */
export function canViewAuditLogsForRoles(roles: StaffRole[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => {
    const cap = ROLE_CAPABILITIES[r];
    return cap ? cap.canViewAuditLogs : false;
  });
}

/**
 * Checks if Error Reports can be viewed/reviewed
 */
export function canViewReportsForRoles(roles: StaffRole[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => {
    const cap = ROLE_CAPABILITIES[r];
    return cap ? cap.canViewReports : false;
  });
}

/**
 * Checks if Academic Curriculum (Boards, Classes, Subjects, Chapters) can be managed
 */
export function canManageCurriculumForRoles(roles: StaffRole[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => {
    const cap = ROLE_CAPABILITIES[r];
    return cap ? cap.canManageCurriculum : false;
  });
}

/**
 * Computes all allowed sections for a set of roles
 */
export function getAllowedSectionsForRoles(roles: StaffRole[]): AdminSection[] {
  if (!roles || roles.length === 0) return ['dashboard'];
  const sections = new Set<AdminSection>();
  roles.forEach((r) => {
    const cap = ROLE_CAPABILITIES[r];
    if (cap) {
      cap.allowedSections.forEach((s) => sections.add(s));
    }
  });
  return Array.from(sections);
}
