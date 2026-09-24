import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu,
  ShieldCheck,
  Search,
  Plus,
  LogOut,
  Sparkles,
  Layers,
  FileQuestion,
  Clock,
  ArrowLeft,
  Filter,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { AdminUser, StaffRole } from '../../types';
import {
  canEditMCQsForRoles,
  canCreateQuizzesForRoles,
  canViewReportsForRoles,
  ROLE_CAPABILITIES,
} from '../../utils/staffRolePermissions';

interface AdminHeaderProps {
  activeTabTitle: string;
  adminUser: AdminUser;
  onOpenMobileSidebar: () => void;
  onQuickAction: (action: 'add-question' | 'create-quiz' | 'add-note' | 'review-reports') => void;
  onLogout: () => void;
  onBackToHome?: () => void;
  activeRoleFilter?: StaffRole | 'All';
  onRoleFilterChange?: (role: StaffRole | 'All') => void;
  availableRoles?: StaffRole[];
  selectedRoles?: StaffRole[];
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTabTitle,
  adminUser,
  onOpenMobileSidebar,
  onQuickAction,
  onLogout,
  onBackToHome,
  activeRoleFilter = 'All',
  onRoleFilterChange,
  availableRoles = ['Admin', 'Teacher', 'Editor', 'ContentManager', 'Moderator'],
  selectedRoles = [],
}) => {
  const effectiveRoles = selectedRoles.length > 0 
    ? selectedRoles 
    : (adminUser.roles && adminUser.roles.length > 0 ? adminUser.roles : [adminUser.role as StaffRole || 'Teacher']);

  const canEditMCQs = canEditMCQsForRoles(effectiveRoles);
  const canCreateQuizzes = canCreateQuizzesForRoles(effectiveRoles);
  const canViewReports = canViewReportsForRoles(effectiveRoles);

  return (
    <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Control Panel
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize font-medium">
                {activeTabTitle === 'staff' ? 'Staff' : activeTabTitle}
              </span>
              {activeRoleFilter !== 'All' && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    <Filter className="w-3 h-3" /> View: {activeRoleFilter}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeTabTitle === 'staff'
                ? 'Staff & Role Management'
                : activeTabTitle === 'dashboard'
                ? 'Admin Dashboard'
                : activeTabTitle === 'audit-logs'
                ? 'Audit Trail & Security Logs'
                : activeTabTitle === 'past-papers'
                ? 'Past Papers Management'
                : activeTabTitle === 'students'
                ? 'Student Management'
                : activeTabTitle === 'questions'
                ? 'Curate MCQs'
                : activeTabTitle === 'question-bank'
                ? 'Manage Question Bank'
                : `${activeTabTitle.charAt(0).toUpperCase() + activeTabTitle.slice(1)} Management`}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Action Buttons - Dynamically filtered by role */}
          {canEditMCQs && (
            <button
              onClick={() => onQuickAction('add-question')}
              title="Add a new question with MCQ Editor"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Question</span>
            </button>
          )}

          {canCreateQuizzes && (
            <button
              onClick={() => onQuickAction('create-quiz')}
              title="Create a new timed quiz test"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Create Quiz</span>
            </button>
          )}

          {/* If user is only a Moderator (MCQ Editor & Quiz creation hidden), show Moderation quick action */}
          {!canEditMCQs && canViewReports && (
            <button
              onClick={() => onQuickAction('review-reports')}
              title="Review flagged student questions and error reports"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Review Reports</span>
            </button>
          )}

          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Student View</span>
            </button>
          )}

          {/* Admin profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {adminUser.name === 'avatar-1' || !adminUser.name || (adminUser.email?.toLowerCase().trim() === 'admin@taleemguru.pk')
                  ? 'Admin'
                  : adminUser.name}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" /> {adminUser.role === 'Admin' ? 'Administrator → Admin Portal' : (adminUser.role ? `${adminUser.role} Portal` : 'Taleem Guru Portal')}
              </span>
            </div>

            <button
              onClick={onLogout}
              title="Sign out of admin portal"
              className="p-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Role Filtering Toolbar */}
      {onRoleFilterChange && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Dashboard Role View:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onRoleFilterChange('All')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeRoleFilter === 'All'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Assigned Roles
            </button>

            {availableRoles.map((role) => {
              const isActive = activeRoleFilter === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => onRoleFilterChange(role)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{role === 'ContentManager' ? 'Content Manager' : role}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {activeRoleFilter === 'Moderator' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/60 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Moderator View: MCQ Editor & Quiz tools hidden</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </header>
  );
};

