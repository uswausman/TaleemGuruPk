import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  Landmark,
  School,
  BookOpen,
  Layers,
  FileQuestion,
  Database,
  Clock,
  FileText,
  Award,
  TrendingUp,
  BarChart3,
  Settings,
  UploadCloud,
  ChevronRight,
  Shield,
  ShieldCheck,
  AlertTriangle,
  X,
  Filter,
} from 'lucide-react';
import { StaffRole } from '../../types';
import { isSectionAllowedForRoles } from '../../utils/staffRolePermissions';

export type AdminSection =
  | 'dashboard'
  | 'staff'
  | 'students'
  | 'boards'
  | 'classes'
  | 'subjects'
  | 'chapters'
  | 'questions'
  | 'question-bank'
  | 'quizzes'
  | 'notes'
  | 'past-papers'
  | 'results'
  | 'leaderboard'
  | 'certificates'
  | 'reports'
  | 'audit-logs'
  | 'settings'
  | 'bulk-import';

export type AdminTabType = AdminSection;

interface AdminSidebarProps {
  activeTab: AdminSection;
  onSelectTab: (tab: AdminSection) => void;
  counts: {
    staff?: number;
    students: number;
    boards: number;
    classes: number;
    subjects: number;
    chapters: number;
    questions: number;
    quizzes: number;
    notes: number;
    pastPapers: number;
    results: number;
  };
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  selectedRoles?: StaffRole[];
  activeRoleFilter?: StaffRole | 'All';
  onRoleFilterChange?: (role: StaffRole | 'All') => void;
  allowedTabs?: AdminSection[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  counts,
  isMobileOpen,
  onCloseMobile,
  selectedRoles,
  activeRoleFilter = 'All',
  onRoleFilterChange,
  allowedTabs,
}) => {
  const allNavGroups: {
    groupTitle: string;
    items: {
      id: AdminSection;
      label: string;
      icon: React.ReactNode;
      count?: number;
      badge?: string;
    }[];
  }[] = [
    {
      groupTitle: 'Overview',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },
    {
      groupTitle: 'Academic Structure',
      items: [
        {
          id: 'boards',
          label: 'Boards',
          icon: <Landmark className="w-4 h-4" />,
          count: counts.boards,
        },
        {
          id: 'classes',
          label: 'Classes',
          icon: <School className="w-4 h-4" />,
          count: counts.classes,
        },
        {
          id: 'subjects',
          label: 'Subjects',
          icon: <BookOpen className="w-4 h-4" />,
          count: counts.subjects,
        },
        {
          id: 'chapters',
          label: 'Chapters',
          icon: <Layers className="w-4 h-4" />,
          count: counts.chapters,
        },
      ],
    },
    {
      groupTitle: 'Assessment Bank',
      items: [
        {
          id: 'questions',
          label: 'Curate MCQs',
          icon: <FileQuestion className="w-4 h-4" />,
          count: counts.questions,
        },
        {
          id: 'question-bank',
          label: 'Manage Question Bank',
          icon: <Database className="w-4 h-4" />,
          count: counts.questions,
        },
        {
          id: 'quizzes',
          label: 'Quizzes',
          icon: <Clock className="w-4 h-4" />,
          count: counts.quizzes,
        },
        {
          id: 'notes',
          label: 'Notes',
          icon: <FileText className="w-4 h-4" />,
          count: counts.notes,
        },
        {
          id: 'past-papers',
          label: 'Past Papers',
          icon: <BookOpen className="w-4 h-4" />,
          count: counts.pastPapers,
        },
      ],
    },
    {
      groupTitle: 'Users & Performance',
      items: [
        {
          id: 'staff',
          label: 'Staff Management',
          icon: <Shield className="w-4 h-4" />,
          count: counts.staff,
        },
        {
          id: 'students',
          label: 'Students',
          icon: <Users className="w-4 h-4" />,
          count: counts.students,
        },
        {
          id: 'results',
          label: 'Results',
          icon: <Award className="w-4 h-4" />,
          count: counts.results,
        },
        {
          id: 'certificates',
          label: 'Certificates',
          icon: <ShieldCheck className="w-4 h-4" />,
        },
        {
          id: 'leaderboard',
          label: 'Leaderboard',
          icon: <TrendingUp className="w-4 h-4" />,
        },
        {
          id: 'reports',
          label: 'Error Reports',
          icon: <AlertTriangle className="w-4 h-4" />,
        },
      ],
    },
    {
      groupTitle: 'System & Security',
      items: [
        {
          id: 'audit-logs',
          label: 'Audit Trail',
          icon: <ShieldCheck className="w-4 h-4" />,
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <Settings className="w-4 h-4" />,
        },
        {
          id: 'bulk-import',
          label: 'Bulk Import',
          icon: <UploadCloud className="w-4 h-4" />,
          badge: 'JSON/CSV',
        },
      ],
    },
  ];

  // Determine effective roles based on active filter or assigned user roles
  const effectiveRoles: StaffRole[] =
    activeRoleFilter && activeRoleFilter !== 'All'
      ? [activeRoleFilter]
      : selectedRoles && selectedRoles.length > 0
      ? selectedRoles
      : [];

  // Dynamically filter navigation groups based on allowed tabs or selected user roles
  const navGroups = allNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (allowedTabs && allowedTabs.length > 0) {
          return allowedTabs.includes(item.id);
        }
        if (effectiveRoles.length === 0) return true;
        return isSectionAllowedForRoles(item.id, effectiveRoles);
      }),
    }))
    .filter((group) => group.items.length > 0);

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between py-5 px-3 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
      <div className="space-y-6 overflow-y-auto pr-1">
        {/* Logo / Admin Header */}
        <div className="px-2 pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 overflow-hidden shrink-0">
              <img 
                src="/assets/taleemguru-logo-original.png" 
                alt="Taleem Guru Official Logo" 
                className="w-7 h-7 object-contain" 
              />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                TALEEM <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400">GURU</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  ADMIN
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                Learn. Practice. Test. Improve.
              </div>
            </div>
          </div>
          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {activeRoleFilter && activeRoleFilter !== 'All' && (
          <div className="mx-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between text-[10px]">
            <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter: {activeRoleFilter}
            </span>
            <div className="flex items-center gap-1.5">
              {activeRoleFilter === 'Moderator' && (
                <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                  MCQ Editor Hidden
                </span>
              )}
              {onRoleFilterChange && (
                <button
                  onClick={() => onRoleFilterChange('All')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 p-0.5 rounded cursor-pointer"
                  title="Reset filter to All"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Groups */}
        <div className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.groupTitle}
              </div>
              <div className="space-y-0.5">
                <AnimatePresence initial={false}>
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6, height: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                      >
                        <button
                          onClick={() => {
                            onSelectTab(item.id);
                            if (isMobileOpen) onCloseMobile();
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`${
                                isActive
                                  ? 'text-white'
                                  : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                              }`}
                            >
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {item.count !== undefined && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                                }`}
                              >
                                {item.count}
                              </span>
                            )}
                            {item.badge && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security footer stamp */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 px-2">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span className="truncate">RBAC Protected • Admin Tier</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] rounded-2xl overflow-hidden shadow-xs">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
