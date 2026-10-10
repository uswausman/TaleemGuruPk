import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Search,
  Flame,
  Award,
  ChevronDown,
  ChevronRight,
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
  Atom,
  FlaskConical,
  Dna,
  Calculator,
  Compass,
  Code2,
  Languages,
  BookMarked,
  Target,
  FileCheck,
} from 'lucide-react';
import { ViewMode, StudentProfile, AdminUser } from '../types';
import { useSiteSettings, BrandLogoText } from '../context/SiteSettingsContext';

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
  const { getSetting, siteNamePrimaryColor, siteNameSecondaryColor } = useSiteSettings();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);

  const siteLogo = getSetting('branding.logoLight', '/assets/taleemguru-logo-original.png');
  const siteLogoAlt = getSetting('branding.logoAlt', 'TaleemGuru Official Logo');
  const siteName = getSetting('branding.siteName', 'TaleemGuru');
  const tagline = getSetting('branding.tagline', 'Learn. Practice. Test. Improve.');

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

  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  // Scroll listener for sticky navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
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
    }, 180);
  };

  const toggleDropdownClick = (dropdownKey: string) => {
    setOpenDropdown(prev => prev === dropdownKey ? null : dropdownKey);
  };

  const toggleMobileSection = (section: string) => {
    setMobileExpandedSection(prev => prev === section ? null : section);
  };

  const boardsItems = [
    { label: 'Punjab Board', code: 'Punjab', desc: 'Lahore, Rawalpindi, Faisalabad, Multan, Gujranwala', icon: Landmark },
    { label: 'Federal Board', code: 'Federal', desc: 'FBISE Islamabad (National & Overseas)', icon: School },
    { label: 'Sindh Board', code: 'Sindh', desc: 'Karachi, Hyderabad, Sukkur, Larkana, Mirpurkhas', icon: Landmark },
    { label: 'KPK Board', code: 'KPK', desc: 'Peshawar, Mardan, Swat, Abbottabad, Kohat', icon: School },
    { label: 'Balochistan Board', code: 'Balochistan', desc: 'BBISE Quetta & Divisional Boards', icon: Landmark },
    { label: 'AJK Board', code: 'AJK', desc: 'BISE Mirpur Azad Jammu & Kashmir', icon: School },
    { label: 'All Boards', code: 'All', desc: 'Explore all Pakistani Educational Boards', icon: Globe },
  ];

  const classesItems = [
    { label: 'Class 9', value: 'Class 9', desc: 'Matriculation Part 1 Science & Arts Syllabi', icon: '09' },
    { label: 'Class 10', value: 'Class 10', desc: 'Matriculation Part 2 Board Examinations', icon: '10' },
    { label: 'Class 11', value: 'Class 11', desc: 'FSc Pre-Medical, Pre-Engg & ICS Part 1', icon: '11' },
    { label: 'Class 12', value: 'Class 12', desc: 'FSc Pre-Medical, Pre-Engg & ICS Part 2', icon: '12' },
  ];

  const subjectsItems = [
    { label: 'English', desc: 'Grammar, Comprehension, Essays & Vocabulary', icon: Languages },
    { label: 'Urdu', desc: 'Qawaid, Asbaaq, Nazmein & Ghazaliyat', icon: BookMarked },
    { label: 'Mathematics', desc: 'Algebra, Matrices, Trigonometry & Calculus', icon: Calculator },
    { label: 'Physics', desc: 'Mechanics, Optics, Electricity & Modern Physics', icon: Atom },
    { label: 'Chemistry', desc: 'Organic, Inorganic & Physical Chemistry', icon: FlaskConical },
    { label: 'Biology', desc: 'Cell Biology, Genetics, Physiology & Biotech', icon: Dna },
    { label: 'Computer Science', desc: 'Programming, Data Structures & Databases', icon: Code2 },
    { label: 'Pakistan Studies', desc: 'History, Constitution & Geography of Pakistan', icon: Compass },
    { label: 'Islamiat', desc: 'Quranic Surahs, Ahadees & Seerat-un-Nabi', icon: BookOpen },
  ];

  const entryTestsItems = [
    { label: 'MDCAT', id: 'MDCAT', desc: 'Medical & Dental Admission Test (PM&DC Standard)', tag: 'Medical', badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800' },
    { label: 'ECAT', id: 'ECAT', desc: 'Engineering College Admission Test (UET, NUST, GIKI)', tag: 'Engg', badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-800' },
    { label: 'CSS', id: 'CSS', desc: 'Central Superior Services MPT Screening Examination', tag: 'Civil Service', badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800' },
    { label: 'PMS', id: 'PMS', desc: 'Provincial Management Services Screening Tests', tag: 'Provincial', badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' },
    { label: 'Armed Forces', id: 'Armed Forces', desc: 'Pak Army, Navy & PAF Initial Intelligence Tests', tag: 'Defense', badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800' },
  ];

  return (
    <header
      ref={navRef}
      className={`sticky top-0 z-40 transition-all duration-200 ${
        isScrolled
          ? 'bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md shadow-xl shadow-slate-950/20 border-b border-slate-800/90'
          : 'bg-slate-900 dark:bg-slate-950 border-b border-slate-800/80'
      }`}
    >
      {/* 1. Top Announcement / Quick Access Strip */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 text-slate-300 text-xs py-1.5 px-4 flex items-center justify-between border-b border-slate-800/80 font-medium">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-blue-500/20 text-cyan-300 border border-blue-400/30 font-bold uppercase tracking-wider">
            EXAM PREP
          </span>
          <span className="text-white font-bold tracking-tight">TALEEM GURU</span>
          <span className="text-cyan-300 hidden sm:inline">— Learn. Practice. Test. Improve.</span>
          <span className="hidden lg:inline text-slate-400">• Punjab, Federal, Sindh, KPK, Balochistan & AJK Boards</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px]">
          <button
            onClick={() => onNavigate('admin-panel')}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">ADMIN PANEL</span>
          </button>
          <span className="text-slate-700">|</span>
          <button
            onClick={onOpenAuth || onOpenPremium}
            className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 font-bold transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login / Register</span>
          </button>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Tagline */}
          <div
            id="nav-logo"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0 group py-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25 overflow-hidden group-hover:scale-105 transition-transform shrink-0 border border-white/10">
              <img 
                src={siteLogo} 
                alt={siteLogoAlt} 
                className="w-8 h-8 object-contain" 
                loading="eager"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <BrandLogoText className="font-black text-xl tracking-tight transition-colors" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide -mt-0.5 hidden xs:block sm:block">
                {tagline}
              </p>
            </div>
          </div>

          {/* Desktop Primary Menu */}
          <nav className="hidden xl:flex items-center gap-1 text-xs font-semibold" aria-label="Main Navigation">
            {/* Home */}
            <button
              onClick={() => onNavigate('home')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                currentView === 'home'
                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
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
                onClick={() => {
                  toggleDropdownClick('boards');
                  onNavigate('boards');
                }}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'boards' || openDropdown === 'boards'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'boards'}
              >
                <span>Boards</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === 'boards' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
              </button>

              {openDropdown === 'boards' && (
                <div className="absolute left-0 mt-2 w-72 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-white/5">
                  <div className="px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                    <span>Pakistan Education Boards</span>
                    <span className="text-[9px] text-cyan-400 font-mono">BISE</span>
                  </div>
                  <div className="py-1 max-h-80 overflow-y-auto">
                    {boardsItems.map((b) => {
                      const Icon = b.icon;
                      return (
                        <a
                          key={b.code}
                          href={`/boards/${b.code.toLowerCase().replace(/ /g, '-')}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate('boards', b.code);
                            setOpenDropdown(null);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-800/90 text-slate-200 hover:text-cyan-300 flex items-center gap-2.5 group transition-colors cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-blue-600/20 text-slate-400 group-hover:text-cyan-300 flex items-center justify-center shrink-0 transition-colors">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs group-hover:text-white flex items-center justify-between">
                              <span>{b.label}</span>
                              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                            </div>
                            <div className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate">{b.desc}</div>
                          </div>
                        </a>
                      );
                    })}
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
                onClick={() => {
                  toggleDropdownClick('classes');
                  onNavigate('classes');
                }}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'classes' || openDropdown === 'classes'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'classes'}
              >
                <span>Classes</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === 'classes' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
              </button>

              {openDropdown === 'classes' && (
                <div className="absolute left-0 mt-2 w-64 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-white/5">
                  <div className="px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                    <span>Matric & Intermediate</span>
                    <span className="text-[9px] text-blue-400 font-mono">9-12</span>
                  </div>
                  <div className="py-1">
                    {classesItems.map((c) => (
                      <a
                        key={c.value}
                        href={`/classes/${c.value.toLowerCase().replace(/ /g, '-')}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate('classes', c.value);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-800/90 text-slate-200 hover:text-cyan-300 flex items-center gap-2.5 group transition-colors cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 font-mono font-bold text-[10px] transition-colors">
                          {c.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs group-hover:text-white flex items-center justify-between">
                            <span>{c.label}</span>
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                          </div>
                          <div className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate">{c.desc}</div>
                        </div>
                      </a>
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
                onClick={() => {
                  toggleDropdownClick('subjects');
                  onNavigate('subjects');
                }}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'subjects' || openDropdown === 'subjects'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'subjects'}
              >
                <span>Subjects</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === 'subjects' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
              </button>

              {openDropdown === 'subjects' && (
                <div className="absolute left-0 mt-2 w-72 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-white/5 max-h-88 overflow-y-auto">
                  <div className="px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                    <span>Academic Subjects</span>
                    <span className="text-[9px] text-indigo-400 font-mono">Curricula</span>
                  </div>
                  <div className="py-1">
                    {subjectsItems.map((s) => {
                      const Icon = s.icon;
                      return (
                        <a
                          key={s.label}
                          href={`/subjects/${s.label.toLowerCase().replace(/ /g, '-')}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate('subjects', s.label);
                            setOpenDropdown(null);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-800/90 text-slate-200 hover:text-cyan-300 flex items-center gap-2.5 group transition-colors cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-300 flex items-center justify-center shrink-0 transition-colors">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs group-hover:text-white flex items-center justify-between">
                              <span>{s.label}</span>
                              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                            </div>
                            <div className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate">{s.desc}</div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* MCQs Bank */}
            <button
              onClick={() => onNavigate('mcqs')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                currentView === 'mcqs'
                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              MCQs Bank
            </button>

            {/* Online Tests */}
            <button
              onClick={() => onNavigate('tests')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                currentView === 'tests'
                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              Online Tests
            </button>

            {/* Quizzes */}
            <button
              onClick={() => onNavigate('quizzes')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                currentView === 'quizzes'
                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              Quizzes
            </button>

            {/* Past Papers */}
            <button
              onClick={() => onNavigate('past-papers')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                currentView === 'past-papers'
                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              Past Papers
            </button>

            {/* Notes */}
            <button
              onClick={() => onNavigate('notes')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                currentView === 'notes' || currentView === 'study-material'
                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
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
                onClick={() => {
                  toggleDropdownClick('entry-tests');
                  onNavigate('entry-tests');
                }}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'entry-tests' || currentView === 'competitive-exams' || currentView === 'armed-forces' || openDropdown === 'entry-tests'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'entry-tests'}
              >
                <span>Entry Tests</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === 'entry-tests' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
              </button>

              {openDropdown === 'entry-tests' && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-white/5">
                  <div className="px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                    <span>National Entry Tests</span>
                    <span className="text-[9px] text-amber-400 font-mono">PM&DC / UET / FPSC</span>
                  </div>
                  <div className="py-1">
                    {entryTestsItems.map((e) => (
                      <a
                        key={e.id}
                        href={e.id === 'Armed Forces' ? '/armed-forces' : `/entry-tests/${e.id.toLowerCase().replace(/ /g, '-')}`}
                        onClick={(e_event) => {
                          e_event.preventDefault();
                          if (e.id === 'Armed Forces') {
                            onNavigate('armed-forces');
                          } else {
                            onNavigate('entry-tests', e.id);
                          }
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-slate-800/90 text-slate-200 hover:text-cyan-300 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-xs group-hover:text-white flex items-center gap-1.5">
                            <span>{e.label}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate">{e.desc}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${e.badgeColor}`}>
                          {e.tag}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Panel Direct Link */}
            <button
              onClick={() => onNavigate('admin-panel')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'admin-panel'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/30'
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
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 bg-slate-800/90 hover:bg-slate-700 hover:text-white rounded-xl border border-slate-700/80 transition-all cursor-pointer shadow-sm"
              title="Search MCQs, tests, subjects (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline font-medium">Search...</span>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-900 rounded border border-slate-700">
                ⌘K
              </kbd>
            </button>

            {/* Dark/Light Mode Toggle */}
            {onToggleDarkMode && (
              <button
                id="theme-toggle-btn"
                onClick={onToggleDarkMode}
                className="p-2 rounded-xl text-slate-300 bg-slate-800/90 hover:bg-slate-700 hover:text-white border border-slate-700/80 transition-colors cursor-pointer"
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
                  aria-expanded={isUserMenuOpen}
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
                      className={`text-[10px] font-bold leading-tight mt-0.5 ${
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
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden lg:block transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-white/5">
                    <div className="px-4 py-3 border-b border-slate-800">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>{displayName}</span>
                        {isAdmin && (
                          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{activeUser.email}</div>
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
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-emerald-300 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Admin Portal & Dashboard
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('admin-panel', undefined, 'approvals');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-indigo-300 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4 text-indigo-400" /> Content Approvals
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('admin-panel', undefined, 'questions');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <FileText className="w-4 h-4 text-cyan-400" /> Question & MCQ Bank
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('admin-panel', undefined, 'students');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <User className="w-4 h-4 text-blue-400" /> User Directory & Staff
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('home');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
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
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-indigo-300 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Briefcase className="w-4 h-4 text-indigo-400" /> {rawRole} Dashboard
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('admin-panel', undefined, 'my-submissions');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-blue-300 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <FileText className="w-4 h-4 text-blue-400" /> My Submissions
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('home');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
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
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <User className="w-4 h-4 text-cyan-400" /> Student Dashboard
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('results');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Clock className="w-4 h-4 text-blue-400" /> Results & History
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('leaderboard');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
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
                        className="w-full text-left px-4 py-2 hover:bg-red-950/40 text-red-400 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
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
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-md shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="xl:hidden bg-slate-900/98 backdrop-blur-2xl border-b border-slate-800 px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-4 duration-200 max-h-[85vh] overflow-y-auto">
          {/* Quick Primary Grid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onNavigate('home');
                setIsMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 transition-colors ${
                currentView === 'home' ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                onNavigate('tests');
                setIsMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 transition-colors ${
                currentView === 'tests' ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCheck className="w-4 h-4 text-blue-400" />
              <span>Online Tests</span>
            </button>

            <button
              onClick={() => {
                onNavigate('mcqs');
                setIsMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 transition-colors ${
                currentView === 'mcqs' ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>MCQs Bank</span>
            </button>

            <button
              onClick={() => {
                onNavigate('quizzes');
                setIsMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 transition-colors ${
                currentView === 'quizzes' ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Quizzes</span>
            </button>

            <button
              onClick={() => {
                onNavigate('past-papers');
                setIsMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 transition-colors ${
                currentView === 'past-papers' ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4 text-rose-400" />
              <span>Past Papers</span>
            </button>

            <button
              onClick={() => {
                onNavigate('notes');
                setIsMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 transition-colors ${
                currentView === 'notes' || currentView === 'study-material' ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Notes</span>
            </button>

            <button
              onClick={() => {
                onNavigate('results');
                setIsMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 transition-colors ${
                currentView === 'results' ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4 text-cyan-400" />
              <span>Results</span>
            </button>

            <button
              onClick={() => {
                onNavigate('leaderboard');
                setIsMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 transition-colors ${
                currentView === 'leaderboard' ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Leaderboard</span>
            </button>
          </div>

          {/* Expandable Accordion Subsections */}
          <div className="space-y-1.5 pt-1">
            {/* Boards Accordion */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-800/40">
              <button
                onClick={() => toggleMobileSection('boards')}
                className="w-full p-3 text-left font-bold text-xs text-white flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-cyan-400" />
                  <span>Educational Boards (Punjab, FBISE, Sindh, KPK...)</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${mobileExpandedSection === 'boards' ? 'rotate-180' : ''}`} />
              </button>
              {mobileExpandedSection === 'boards' && (
                <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-1.5 border-t border-slate-800/60 bg-slate-900/60">
                  {boardsItems.map((b) => (
                    <button
                      key={b.code}
                      onClick={() => {
                        onNavigate('boards', b.code);
                        setIsMobileMenuOpen(false);
                      }}
                      className="p-2 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Classes Accordion */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-800/40">
              <button
                onClick={() => toggleMobileSection('classes')}
                className="w-full p-3 text-left font-bold text-xs text-white flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-400" />
                  <span>Classes (Class 9, 10, 11, 12)</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${mobileExpandedSection === 'classes' ? 'rotate-180' : ''}`} />
              </button>
              {mobileExpandedSection === 'classes' && (
                <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-1.5 border-t border-slate-800/60 bg-slate-900/60">
                  {classesItems.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        onNavigate('classes', c.value);
                        setIsMobileMenuOpen(false);
                      }}
                      className="p-2 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Entry Tests Accordion */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-800/40">
              <button
                onClick={() => toggleMobileSection('entry-tests')}
                className="w-full p-3 text-left font-bold text-xs text-white flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>Entry Tests (MDCAT, ECAT, CSS, Forces)</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${mobileExpandedSection === 'entry-tests' ? 'rotate-180' : ''}`} />
              </button>
              {mobileExpandedSection === 'entry-tests' && (
                <div className="px-3 pb-3 pt-1 space-y-1 border-t border-slate-800/60 bg-slate-900/60">
                  {entryTestsItems.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        if (e.id === 'Armed Forces') {
                          onNavigate('armed-forces');
                        } else {
                          onNavigate('entry-tests', e.id);
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full p-2 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-between"
                    >
                      <span>{e.label} — {e.desc}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${e.badgeColor}`}>
                        {e.tag}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Footer with User & Admin Portal */}
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
                    <div className="text-[10px] text-slate-400 leading-tight truncate max-w-[180px]">{activeUser.email}</div>
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
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
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
              <ShieldCheck className="w-4 h-4" />
              <span>{isAdmin ? 'ADMIN PORTAL & DASHBOARD' : 'ADMIN PANEL'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
