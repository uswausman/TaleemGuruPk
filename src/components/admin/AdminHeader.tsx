import React from 'react';
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
} from 'lucide-react';
import { AdminUser } from '../../types';

interface AdminHeaderProps {
  activeTabTitle: string;
  adminUser: AdminUser;
  onOpenMobileSidebar: () => void;
  onQuickAction: (action: 'add-question' | 'create-quiz' | 'add-note') => void;
  onLogout: () => void;
  onBackToHome?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTabTitle,
  adminUser,
  onOpenMobileSidebar,
  onQuickAction,
  onLogout,
  onBackToHome,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              : `${activeTabTitle.charAt(0).toUpperCase() + activeTabTitle.slice(1)} Management`}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Quick Action Buttons */}
        <button
          onClick={() => onQuickAction('add-question')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Question</span>
        </button>

        <button
          onClick={() => onQuickAction('create-quiz')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Create Quiz</span>
        </button>

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
    </header>
  );
};
