import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Search,
  Flame,
  Award,
  ChevronDown,
  Menu,
  X,
  User,
  GraduationCap,
  FileText,
  HelpCircle,
  Clock,
  Trophy,
  ShieldCheck,
  Video,
  Globe,
  BrainCircuit,
  Sparkles,
  Settings,
  Briefcase,
  Layers,
  Crown,
  Moon,
  Sun,
  Bell,
  CheckCircle2,
  Landmark,
  School,
  ShieldAlert,
  LogIn,
  LogOut,
} from 'lucide-react';
import { ViewMode, StudentProfile, AdminUser } from '../types';

interface NavbarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode, subFilter?: string, adminTab?: string) => void;
  onOpenSearch: () => void;
  onOpenPremium: () => void;
  student: StudentProfile | null;
  adminUser?: AdminUser | null;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenSearch,
  onOpenPremium,
  student,
  adminUser,
  isDarkMode = false,
  onToggleDarkMode,
  onOpenAuth,
  onLogout,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Authoritative user resolution
  const activeUser = adminUser || student;
  const rawRole = (adminUser?.role || student?.role || 'Student') as string;
  const cleanRole = rawRole.trim().toLowerCase();
  const isAdmin =
    ['admin', 'superadmin', 'administrator', 'super_admin'].includes(cleanRole) ||
    (activeUser?.email && activeUser.email.toLowerCase().trim() === 'admin@taleemguru.pk');
  const isStaff =
    !isAdmin &&
    ['teacher', 'editor', 'contentmanager', 'content_manager', 'moderator'].includes(cleanRole);

  const rawName = adminUser?.name || student?.name || '';
  const isAvatarName = rawName === 'avatar-1' || !rawName || rawName === 'undefined';
  const displayName = isAdmin
    ? (isAvatarName ? 'Admin' : (rawName === 'Administrator' ? 'Admin' : rawName))
    : (isAvatarName ? (activeUser?.email ? activeUser.email.split('@')[0] : 'Learner') : rawName);

  const portalLabel = isAdmin
    ? 'Admin Portal'
    : isStaff
    ? `${rawRole} Portal`
    : 'Student Portal';

  const avatarDisplay = isAdmin
    ? (student?.avatar && student.avatar !== 'avatar-1' && student.avatar.length <= 4 ? student.avatar : '👨‍💼')
    : isStaff
    ? (student?.avatar && student.avatar !== 'avatar-1' && student.avatar.length <= 4 ? student.avatar : '👨‍🏫')
    : (student?.avatar && student.avatar !== 'avatar-1' ? student.avatar : '🎓');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnter = (dropdownKey: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setOpenDropdown(dropdownKey);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 200);
  };

  const boardsItems = [
    { label: 'Punjab Board', code: 'Punjab', desc: 'Lahore, Rawalpindi, Faisalabad, Multan' },
    { label: 'Federal Board', code: 'Federal', desc: 'FBISE Islamabad (National & Overseas)' },
    { label: 'Sindh Board', code: 'Sindh', desc: 'Karachi, Hyderabad, Sukkur, Larkana' },
    { label: 'KPK Board', code: 'KPK', desc: 'Peshawar, Mardan, Swat, Abbottabad' },
    { label: 'Balochistan Board', code: 'Balochistan', desc: 'BBISE Quetta & Divisional Boards' },
    { label: 'AJK Board', code: 'AJK', desc: 'BISE Mirpur Azad Jammu & Kashmir' },
    { label: 'All Boards', code: 'All', desc: 'Explore Pakistan Education Boards' },
  ];

  const classesItems = [
    { label: 'Class 9', value: 'Class 9', desc: 'Matriculation Part 1 Science & Arts' },
    { label: 'Class 10', value: 'Class 10', desc: 'Matriculation Part 2 Board Exams' },
    { label: 'Class 11', value: 'Class 11', desc: 'FSc Pre-Medical, Pre-Engg & ICS Pt 1' },
    { label: 'Class 12', value: 'Class 12', desc: 'FSc Pre-Medical, Pre-Engg & ICS Pt 2' },
  ];

  const subjectsItems = [
    { label: 'English', desc: 'Grammar, Comprehension, Essays & Vocabulary' },
    { label: 'Urdu', desc: 'Qawaid, Asbaaq, Nazmein & Ghazaliyat' },
    { label: 'Mathematics', desc: 'Algebra, Matrices, Trigonometry & Calculus' },
    { label: 'Physics', desc: 'Mechanics, Optics, Electricity & Modern Physics' },
    { label: 'Chemistry', desc: 'Organic, Inorganic & Physical Chemistry' },
    { label: 'Biology', desc: 'Cell Biology, Genetics, Physiology & Biotech' },
    { label: 'Computer Science', desc: 'Programming, Data Structures & Databases' },
    { label: 'Pakistan Studies', desc: 'History, Constitution & Geography' },
    { label: 'Islamiat', desc: 'Quranic Surahs, Ahadees & Seerat-un-Nabi' },
  ];

  const entryTestsItems = [
    { label: 'MDCAT', id: 'MDCAT', desc: 'Medical & Dental Admission Test (PM&DC)' },
    { label: 'ECAT', id: 'ECAT', desc: 'Engineering College Admission Test (UET, NUST)' },
    { label: 'CSS', id: 'CSS', desc: 'Central Superior Services MPT Screening' },
    { label: 'PMS', id: 'PMS', desc: 'Provincial Management Services' },
    { label: 'Armed Forces', id: 'Armed Forces', desc: 'Pak Army, Navy & PAF Initial Tests' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-200 ${
        isScrolled
          ? 'bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md shadow-lg border-b border-slate-800'
          : 'bg-slate-900 dark:bg-slate-950 border-b border-slate-800'
      }`}
    >
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 text-slate-300 text-xs py-1.5 px-4 flex items-center justify-between border-b border-slate-800/80 font-medium">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 font-bold uppercase tracking-wider">
            EXAM PREP
          </span>
          <span className="text-white font-bold tracking-tight">TALEEM GURU</span>
          <span className="text-cyan-300 hidden sm:inline">— Learn. Practice. Test. Improve.</span>
          <span className="hidden lg:inline text-slate-400">• Punjab, Federal, Sindh, KPK, Balochistan & AJK Boards</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px]">
          <button
            onClick={() => onNavigate('admin-panel')}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> ADMIN PANEL
          </button>
          <span className="text-slate-700">|</span>
          <button
            onClick={onOpenAuth || onOpenPremium}
            className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 font-bold transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" /> Login / Register
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Tagline */}
          <div
            id="nav-logo"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden group-hover:scale-105 transition-transform">
              <img src="/favicon.svg" alt="Taleem Guru Logo" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                  TALEEM <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">GURU</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide -mt-0.5">
                Learn. Practice. Test. Improve.
              </p>
            </div>
          </div>

          {/* Desktop Primary Menu matching exact Hierarchy */}
          <nav className="hidden xl:flex items-center gap-1 text-xs font-semibold">
            {/* Home */}
            <button
              onClick={() => onNavigate('home')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                currentView === 'home'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Home
            </button>

            {/* Boards Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('boards')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => onNavigate('boards')}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  currentView === 'boards'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>Boards</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {openDropdown === 'boards' && (
                <div className="absolute left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Pakistan Education Boards
                  </div>
                  <div className="py-1 divide-y divide-slate-800/40">
                    {boardsItems.map((b) => (
                      <button
                        key={b.code}
                        onClick={() => {
                          onNavigate('boards', b.code);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 hover:text-cyan-400 flex flex-col group transition-colors"
                      >
                        <span className="font-bold text-xs">{b.label}</span>
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-300">{b.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Classes Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('classes')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => onNavigate('classes')}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  currentView === 'classes'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>Classes</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {openDropdown === 'classes' && (
                <div className="absolute left-0 mt-1 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Matric & Intermediate
                  </div>
                  <div className="py-1">
                    {classesItems.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => {
                          onNavigate('classes', c.value);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 hover:text-cyan-400 flex flex-col group transition-colors"
                      >
                        <span className="font-bold text-xs">{c.label}</span>
                        <span className="text-[10px] text-slate-400">{c.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Subjects Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('subjects')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => onNavigate('subjects')}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  currentView === 'subjects'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>Subjects</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {openDropdown === 'subjects' && (
                <div className="absolute left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-80 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Academic Subjects
                  </div>
                  <div className="py-1">
                    {subjectsItems.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => {
                          onNavigate('subjects', s.label);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-800 text-slate-200 hover:text-cyan-400 flex flex-col group transition-colors"
                      >
                        <span className="font-bold text-xs">{s.label}</span>
                        <span className="text-[10px] text-slate-400 truncate">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* MCQs Bank */}
            <button
              onClick={() => onNavigate('mcqs')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                currentView === 'mcqs'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              MCQs Bank
            </button>

            {/* Online Tests */}
            <button
              onClick={() => onNavigate('tests')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                currentView === 'tests'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Online Tests
            </button>

            {/* Quizzes */}
            <button
              onClick={() => onNavigate('quizzes')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                currentView === 'quizzes'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Quizzes
            </button>

            {/* Past Papers */}
            <button
              onClick={() => onNavigate('past-papers')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                currentView === 'past-papers'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Past Papers
            </button>

            {/* Notes */}
            <button
              onClick={() => onNavigate('notes')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                currentView === 'notes' || currentView === 'study-material'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Notes
            </button>

            {/* Entry Tests Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('entry-tests')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => onNavigate('entry-tests')}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  currentView === 'entry-tests' || currentView === 'competitive-exams' || currentView === 'armed-forces'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>Entry Tests</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {openDropdown === 'entry-tests' && (
                <div className="absolute right-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    National Entry Tests & Exams
                  </div>
                  <div className="py-1">
                    {entryTestsItems.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          if (e.id === 'CSS' || e.id === 'PMS') {
                            onNavigate('competitive-exams', e.id);
                          } else if (e.id === 'Armed Forces') {
                            onNavigate('armed-forces');
                          } else {
                            onNavigate('entry-tests', e.id);
                          }
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 hover:text-cyan-400 flex flex-col group transition-colors"
                      >
                        <span className="font-bold text-xs">{e.label}</span>
                        <span className="text-[10px] text-slate-400">{e.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Panel Direct Link */}
            <button
              onClick={() => onNavigate('admin-panel')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                currentView === 'admin-panel'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ADMIN</span>
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Search Trigger */}
            <button
              id="global-search-trigger-btn"
              onClick={onOpenSearch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800/90 hover:bg-slate-700 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Search MCQs, tests, subjects (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline font-medium">Search...</span>
            </button>

            {/* Dark/Light Mode Toggle */}
            {onToggleDarkMode && (
              <button
                id="theme-toggle-btn"
                onClick={onToggleDarkMode}
                className="p-2 rounded-xl text-slate-300 bg-slate-800/90 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-cyan-300" />
                )}
              </button>
            )}

            {/* User Profile / Portal Selector / Sign In Button */}
            {activeUser ? (
              <div className="relative">
                <button
                  id="user-profile-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-2 p-1.5 pl-2.5 bg-slate-800/90 hover:bg-slate-700 border ${
                    isAdmin
                      ? 'border-emerald-700/60 shadow-sm shadow-emerald-950/40'
                      : isStaff
                      ? 'border-indigo-700/60'
                      : 'border-slate-700'
                  } rounded-xl transition-colors text-left cursor-pointer`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg text-white text-xs font-bold flex items-center justify-center shadow-md ${
                      isAdmin
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-700'
                        : isStaff
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-700'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    }`}
                  >
                    {avatarDisplay}
                  </div>
                  <div className="hidden lg:block text-left pr-1">
                    <div className="text-xs font-bold text-white leading-none">{displayName}</div>
                    <div
                      className={`text-[10px] font-bold leading-tight ${
                        isAdmin
                          ? 'text-emerald-400'
                          : isStaff
                          ? 'text-indigo-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      {portalLabel}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3.5 py-2.5 border-b border-slate-800">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>{displayName}</span>
                        {isAdmin && (
                          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{activeUser.email}</div>
                      {isAdmin ? (
                        <div className="text-[10px] mt-1.5 text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Administrator → Admin Portal
                        </div>
                      ) : isStaff ? (
                        <div className="text-[10px] mt-1.5 text-indigo-300 font-semibold bg-indigo-950/80 border border-indigo-800/50 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-indigo-400" /> {rawRole} • Staff Portal
                        </div>
                      ) : (
                        <div className="text-[10px] mt-1.5 text-cyan-300 font-semibold bg-cyan-950/80 border border-cyan-800/50 px-2 py-0.5 rounded-md inline-block">
                          {student?.board || 'BISE'} • {student?.classLevel || 'Student Portal'}
                        </div>
                      )}
                    </div>
                    <div className="py-1 text-xs">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => {
                              onNavigate('admin-panel', undefined, 'dashboard');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-emerald-300 font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Admin Portal & Dashboard
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('admin-panel', undefined, 'questions');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-cyan-400" /> Question & MCQ Bank
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('admin-panel', undefined, 'students');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                          >
                            <User className="w-4 h-4 text-blue-400" /> User Directory & Staff
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('home');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
                          >
                            <Globe className="w-4 h-4 text-amber-400" /> View Student Platform
                          </button>
                        </>
                      ) : isStaff ? (
                        <>
                          <button
                            onClick={() => {
                              onNavigate('admin-panel');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-indigo-300 font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <Briefcase className="w-4 h-4 text-indigo-400" /> {rawRole} Dashboard
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('home');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
                          >
                            <Globe className="w-4 h-4 text-amber-400" /> View Student Platform
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              onNavigate('student-dashboard');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                          >
                            <User className="w-4 h-4 text-cyan-400" /> Student Dashboard
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('results');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                          >
                            <Clock className="w-4 h-4 text-blue-400" /> Results & History
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('leaderboard');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                          >
                            <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
                          </button>
                        </>
                      )}
                      <div className="my-1 border-t border-slate-800" />
                      <button
                        onClick={() => {
                          if (onLogout) onLogout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-red-950/40 text-red-400 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-400" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="sign-in-nav-btn"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="xl:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                onNavigate('home');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              Home
            </button>
            <button
              onClick={() => {
                onNavigate('boards');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              Boards (Punjab, FBISE...)
            </button>
            <button
              onClick={() => {
                onNavigate('classes');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              Classes (9, 10, 11, 12)
            </button>
            <button
              onClick={() => {
                onNavigate('subjects');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              Subjects
            </button>
            <button
              onClick={() => {
                onNavigate('mcqs');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              MCQs Bank
            </button>
            <button
              onClick={() => {
                onNavigate('tests');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              Online Tests
            </button>
            <button
              onClick={() => {
                onNavigate('quizzes');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              Quizzes
            </button>
            <button
              onClick={() => {
                onNavigate('past-papers');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              Past Papers
            </button>
            <button
              onClick={() => {
                onNavigate('notes');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              Notes
            </button>
            <button
              onClick={() => {
                onNavigate('entry-tests');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              Entry Tests (MDCAT/ECAT)
            </button>
            <button
              onClick={() => {
                onNavigate('results');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              Results
            </button>
            <button
              onClick={() => {
                onNavigate('leaderboard');
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-left bg-slate-800 text-white"
            >
              Leaderboard
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            {activeUser ? (
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg text-white text-sm font-bold flex items-center justify-center shadow ${
                      isAdmin
                        ? 'bg-emerald-600'
                        : isStaff
                        ? 'bg-indigo-600'
                        : 'bg-blue-600'
                    }`}
                  >
                    {avatarDisplay}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                      <span>{displayName}</span>
                      {isAdmin && (
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1 rounded font-bold">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">{activeUser.email}</div>
                    <div
                      className={`text-[10px] font-semibold mt-0.5 ${
                        isAdmin
                          ? 'text-emerald-400'
                          : isStaff
                          ? 'text-indigo-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      {isAdmin ? 'Administrator • Admin Portal' : portalLabel}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (onLogout) onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold text-xs rounded-lg border border-red-800/60 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (onOpenAuth) onOpenAuth();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <LogIn className="w-4 h-4" />
                <span>Candidate Sign In / Register</span>
              </button>
            )}

            <button
              onClick={() => {
                onNavigate('admin-panel', undefined, 'dashboard');
                setIsMobileMenuOpen(false);
              }}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> {isAdmin ? 'ADMIN PORTAL & DASHBOARD' : 'ADMIN PANEL'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
