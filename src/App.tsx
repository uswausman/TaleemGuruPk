import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ViewMode, TestConfig, TestResult, StudentProfile, AdminUser, MCQ, PastPaper, StudyNote, RouteAuthResult } from './types';
import {
  POPULAR_TESTS,
  PAST_PAPERS_DATA,
  STUDY_NOTES_DATA,
  SAMPLE_PAST_RESULTS,
  ENTRY_TESTS_DATA,
} from './data/mockData';

// Component imports
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Homepage } from './components/Homepage';
import { TestsExplorerView } from './components/TestsExplorerView';
import { QuizEngineView } from './components/QuizEngineView';
import { MCQBankView } from './components/MCQBankView';
import { BoardsView } from './components/BoardsView';
import { ClassesView } from './components/ClassesView';
import { EntryTestsView } from './components/EntryTestsView';
import { CompetitiveExamsView } from './components/CompetitiveExamsView';
import { ArmedForcesView } from './components/ArmedForcesView';
import { PastPapersView } from './components/PastPapersView';
import { StudentDashboard } from './components/StudentDashboard';
import { StudyMaterialView } from './components/StudyMaterialView';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminTeacherPanel } from './components/AdminTeacherPanel';
import { OnlineTestView } from './components/OnlineTestView';
import { ResultModal } from './components/ResultModal';
import { UniversalSearchModal } from './components/UniversalSearchModal';
import { PublicSearchView } from './components/PublicSearchView';
import { StudentAuthModal } from './components/StudentAuthModal';
import { AccessDeniedView } from './components/AccessDeniedView';
import { SubjectsView } from './components/SubjectsView';
import { SyllabusComparison } from './components/SyllabusComparison';
import { NotesView } from './components/NotesView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { TermsOfServiceView } from './components/TermsOfServiceView';
import { CertificateVerificationView } from './components/CertificateVerificationView';
import { AuthCallbackView } from './components/AuthCallbackView';
import { NotFoundView } from './components/NotFoundView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CANONICAL_PRODUCTION_DOMAIN, isVercelDeployment } from './lib/config';
import {
  saveTestResultToCloud,
  subscribeToAuthState,
  getUserProfile,
  logoutUser,
  isUserAdminInCloud,
  verifyUserRoleWithServer,
  updateUserProfileCloud,
} from './lib/supabaseService';
import {
  resolveRoute,
  evaluateAccess,
  getBrowserPath,
  updateBrowserUrl,
  viewToCanonicalPath,
} from './lib/routeGuards';
import { NavigationContext, buildNavContextString, matchesClassGrade } from './utils/navigationContext';

import { ToastProvider, useToast } from './components/ui/Toast';
import { SEOHead } from './components/SEOHead';
import { checkDuplicateMCQ } from './utils/duplicateDetector';
import {
  fetchMCQsApi,
  createMCQApi,
  updateMCQApi,
  deleteMCQApi,
  fetchTestsApi,
  createTestApi,
  updateTestApi,
  deleteTestApi,
  fetchPastPapersApi,
  createPastPaperApi,
  updatePastPaperApi,
  deletePastPaperApi,
  fetchStudyNotesApi,
  createStudyNoteApi,
  updateStudyNoteApi,
  deleteStudyNoteApi,
} from './lib/api';

export default function App() {
  const { showToast } = useToast();
  // Navigation & View State
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [activeSubFilter, setActiveSubFilter] = useState<string | undefined>(undefined);
  const [activeAdminTab, setActiveAdminTab] = useState<string>('dashboard');
  const [authAccessResult, setAuthAccessResult] = useState<RouteAuthResult | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('taleem_guru_theme') === 'dark';
    } catch (e) {
      return false;
    }
  });

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('taleem_guru_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('taleem_guru_theme', 'light');
    }
  }, [isDarkMode]);

  // Enforce canonical production domain: redirect apex domain to www in production
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'taleemguru.pk') {
      window.location.replace(`${CANONICAL_PRODUCTION_DOMAIN}${window.location.pathname}${window.location.search}${window.location.hash}`);
    }
  }, []);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Global Ctrl+K / Cmd+K listener to open Search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Student Profile State - Supabase Auth is the sole source of authentication truth
  const [student, setStudent] = useState<StudentProfile | null>(null);

  // Admin User State - Verified via /api/admin/verify
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // Initial Auth session hydration state
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Race-Safe Admin Verification State
  const [isAdminVerifying, setIsAdminVerifying] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('taleemguru_admin_token'));
  });
  const [adminVerifyError, setAdminVerifyError] = useState<string | null>(null);

  // Active verification sequence counter to discard stale in-flight responses
  const authSessionSeqRef = useRef<number>(0);

  // State refs to ensure checkAndApplyRoute is referentially stable across renders
  const studentRef = useRef<StudentProfile | null>(null);
  const adminUserRef = useRef<AdminUser | null>(null);
  const isAuthLoadingRef = useRef<boolean>(true);
  const isAdminVerifyingRef = useRef<boolean>(false);
  const currentViewRef = useRef<ViewMode>(currentView);
  const activeSubFilterRef = useRef<string | undefined>(activeSubFilter);
  const activeAdminTabRef = useRef<string | undefined>(activeAdminTab);

  studentRef.current = student;
  adminUserRef.current = adminUser;
  isAuthLoadingRef.current = isAuthLoading;
  isAdminVerifyingRef.current = isAdminVerifying;
  currentViewRef.current = currentView;
  activeSubFilterRef.current = activeSubFilter;
  activeAdminTabRef.current = activeAdminTab;

  // Central Route & Authorization Evaluator
  const checkAndApplyRoute = useCallback(
    (
      targetPath: string,
      userOverride?: { student?: StudentProfile | null; adminUser?: AdminUser | null; isInitializing?: boolean }
    ) => {
      const activeStudent = userOverride?.student !== undefined ? userOverride.student : studentRef.current;
      const activeAdmin = userOverride?.adminUser !== undefined ? userOverride.adminUser : adminUserRef.current;

      const currentUser = activeAdmin || activeStudent;
      const isAuthenticated = Boolean(currentUser);

      const route = resolveRoute(targetPath);
      console.log('[TALEEMGURU-ROUTING] RESOLVED ROUTE:', route);
      
      // If initial auth session is still hydrating or admin session is verifying, defer blocking protected views
      const initializing = userOverride?.isInitializing !== undefined 
        ? userOverride.isInitializing 
        : (isAuthLoadingRef.current || isAdminVerifyingRef.current);
      if (initializing && route.isProtected) {
        return;
      }
      
      console.log('[TALEEMGURU-ROUTING] ACTIVE VIEW:', route.view);
      console.log('[TALEEMGURU-ROUTING] ACTIVE FILTER:', route.subFilter);

      const authResult = evaluateAccess(targetPath, currentUser, isAuthenticated);

      if (!authResult.isAllowed) {
        setAuthAccessResult(authResult);
        if (currentViewRef.current !== 'access-denied') {
          setCurrentView('access-denied');
        }
        setActiveSubFilter(undefined);
        return;
      }

      setAuthAccessResult(null);
      if (currentViewRef.current !== route.view) {
        setCurrentView(route.view);
      }
      if (route.subFilter !== undefined) {
        if (activeSubFilterRef.current !== route.subFilter) {
          setActiveSubFilter(route.subFilter);
        }
      } else {
        if (activeSubFilterRef.current !== undefined) {
          setActiveSubFilter(undefined);
        }
      }
      if (route.adminTab !== undefined) {
        if (activeAdminTabRef.current !== route.adminTab) {
          setActiveAdminTab(route.adminTab);
        }
      } else {
        if (activeAdminTabRef.current !== undefined) {
          setActiveAdminTab(undefined);
        }
      }
    },
    []
  );

  const handleNavigateWithFilter = (view: ViewMode, subFilter?: string, adminTab?: string) => {
    setComparisonContext(null);
    const canonical = viewToCanonicalPath(view, subFilter, adminTab);
    updateBrowserUrl(canonical);
    checkAndApplyRoute(canonical);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Race-Safe Admin Verification Function
  const verifyAdminSession = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('taleemguru_admin_token') : null;
    if (!token) {
      setIsAdminVerifying(false);
      return;
    }

    const seqId = ++authSessionSeqRef.current;
    setIsAdminVerifying(true);
    setAdminVerifyError(null);

    try {
      const res = await fetch('/api/admin/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Post-Logout Race Defense: Discard response if session sequence has advanced
      if (authSessionSeqRef.current !== seqId) return;

      if (res.ok) {
        const data = await res.json();
        if (data.authorized) {
          const verifiedRoles = Array.isArray(data.roles) && data.roles.length > 0
            ? data.roles
            : (data.role ? [data.role] : ['Admin']);
          const verifiedAdmin: AdminUser = {
            id: data.uid || 'admin-root',
            name: (data.name && data.name !== 'avatar-1') ? data.name : 'Admin',
            email: (data.email || '').toLowerCase().trim(),
            roles: verifiedRoles,
            status: 'Active',
            testsCompleted: 0,
            points: 9999,
            joinedDate: new Date().toLocaleDateString('en-GB'),
          };
          setAdminUser(verifiedAdmin);
          setIsAdminVerifying(false);
          setAdminVerifyError(null);

          const currentPath = getBrowserPath();
          checkAndApplyRoute(currentPath, {
            adminUser: verifiedAdmin,
            isInitializing: false,
          });
          return;
        }
      }

      if (res.status === 401 || res.status === 403) {
        try {
          localStorage.removeItem('taleemguru_admin_token');
          localStorage.removeItem('taleemguru_admin_profile');
        } catch (e) {}
        setAdminUser(null);
        setIsAdminVerifying(false);
        setAdminVerifyError(null);
        const currentPath = getBrowserPath();
        if (currentPath.startsWith('/admin')) {
          checkAndApplyRoute(currentPath, { adminUser: null, isInitializing: false });
        }
        return;
      }

      setAdminVerifyError('Unable to verify administrative credentials due to server response. Please try again.');
      setIsAdminVerifying(false);
    } catch (err: any) {
      if (authSessionSeqRef.current !== seqId) return;
      console.error('Admin session verification network error:', err);
      // Area 2.3: Network failure: do NOT grant admin access. adminUser remains null.
      setIsAdminVerifying(false);
      setAdminVerifyError('Unable to verify administrative credentials. Please check your internet connection.');
    }
  }, [checkAndApplyRoute]);

  // Initial Admin Session Hydration on Mount
  useEffect(() => {
    const hasAdminToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('taleemguru_admin_token'));
    if (hasAdminToken) {
      verifyAdminSession();
    }
  }, [verifyAdminSession]);

  // Comparison Navigation Context State
  const [comparisonContext, setComparisonContext] = useState<NavigationContext | null>(null);

  // URL Change / Browser Popstate & Hashchange Listener
  useEffect(() => {
    const handleUrlChange = () => {
      const currentPath = getBrowserPath();
      checkAndApplyRoute(currentPath);
    };

    handleUrlChange();

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [checkAndApplyRoute]);

  // Active Test & Result State
  const [activeTest, setActiveTest] = useState<TestConfig | null>(null);
  const [activeResult, setActiveResult] = useState<TestResult | null>(null);

  // MCQ Question Database
  const [mcqBank, setMcqBank] = useState<MCQ[]>(() => {
    try {
      const saved = localStorage.getItem('taleem_guru_mcqs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  // Tests & Mocks Database
  const [allTests, setAllTests] = useState<TestConfig[]>(() => {
    try {
      const saved = localStorage.getItem('taleem_guru_tests');
      return saved ? JSON.parse(saved) : POPULAR_TESTS;
    } catch (e) {
      return POPULAR_TESTS;
    }
  });

  // Past Papers Database
  const [allPastPapers, setAllPastPapers] = useState<PastPaper[]>(() => {
    try {
      const saved = localStorage.getItem('taleem_guru_past_papers');
      return saved ? JSON.parse(saved) : PAST_PAPERS_DATA;
    } catch (e) {
      return PAST_PAPERS_DATA;
    }
  });

  // Study Notes Database
  const [allStudyNotes, setAllStudyNotes] = useState<StudyNote[]>(() => {
    try {
      const saved = localStorage.getItem('taleem_guru_study_notes');
      return saved ? JSON.parse(saved) : STUDY_NOTES_DATA;
    } catch (e) {
      return STUDY_NOTES_DATA;
    }
  });

  // Test Results History
  const [historyResults, setHistoryResults] = useState<TestResult[]>(() => {
    try {
      const saved = localStorage.getItem('taleem_guru_results');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Supabase Auth State Listener with DB Role Verification
  useEffect(() => {
    let unsubscribe: any;
    subscribeToAuthState(async (authUser, session, event) => {
      console.log('[DEBUG-AUTH] App.tsx authState change:', { event, hasAuthUser: !!authUser });
      if (authUser && event !== 'SIGNED_OUT') {
        const token = session?.access_token;
        const normalizedAuthEmail = (authUser.email || '').toLowerCase().trim();
        const serverAuth = await verifyUserRoleWithServer(authUser.uid, normalizedAuthEmail, token);
        const cloudProfile = await getUserProfile(authUser.uid);

        // Server authoritative decision:
        // If server verification says Admin, role is Admin.
        // Authoritative role resolution from backend database:
        const authoritativeRole: 'Admin' | 'Student' = serverAuth.isAdmin ? 'Admin' : 'Student';
        const isAuthAdmin = serverAuth.isAdmin;
        const rawResolvedName = (
          (serverAuth.serverUser?.name && serverAuth.serverUser.name !== 'avatar-1' ? serverAuth.serverUser.name : null) ||
          (cloudProfile?.name && cloudProfile.name !== 'avatar-1' ? cloudProfile.name : null) ||
          (authUser.displayName && authUser.displayName !== 'avatar-1' ? authUser.displayName : null) ||
          (isAuthAdmin ? 'Admin' : (normalizedAuthEmail ? normalizedAuthEmail.split('@')[0] : 'Student Candidate'))
        );
        const resolvedName = isAuthAdmin ? 'Admin' : rawResolvedName;

        const userAssignedRoles: string[] = (
          (serverAuth.serverUser?.roles && Array.isArray(serverAuth.serverUser.roles) && serverAuth.serverUser.roles.length > 0 ? serverAuth.serverUser.roles : null) ||
          (cloudProfile?.roles && Array.isArray(cloudProfile.roles) && cloudProfile.roles.length > 0 ? cloudProfile.roles : null) ||
          (authoritativeRole === 'Admin' ? ['Admin'] : ['Student'])
        );

        let activeStudentProfile: StudentProfile;

        if (cloudProfile) {
          activeStudentProfile = {
            ...cloudProfile,
            name: isAuthAdmin ? 'Admin' : (cloudProfile.name === 'avatar-1' ? (normalizedAuthEmail ? normalizedAuthEmail.split('@')[0] : 'Learner') : cloudProfile.name),
            email: (cloudProfile.email || normalizedAuthEmail).toLowerCase().trim(),
            avatar: cloudProfile.avatar && cloudProfile.avatar !== 'avatar-1' ? cloudProfile.avatar : (isAuthAdmin ? '👨‍💼' : '🎓'),
            roles: userAssignedRoles as any,
          };
        } else {
          activeStudentProfile = {
            uid: authUser.uid,
            name: resolvedName,
            email: normalizedAuthEmail,
            targetExam: 'MDCAT / BISE Board Exam',
            classLevel: 'Class 10 (Matric Pt 2)',
            board: 'BISE Lahore',
            points: isAuthAdmin ? 9999 : 0,
            streakDays: 0,
            testsTaken: 0,
            savedQuestionIds: [],
            wrongQuestionIds: [],
            certificates: [],
            avatar: isAuthAdmin ? '👨‍💼' : '👨‍🎓',
            roles: userAssignedRoles as any,
          };
        }

        setStudent((prev) => {
          if (
            prev &&
            prev.uid === activeStudentProfile.uid &&
            prev.roles.join(',') === activeStudentProfile.roles.join(',') &&
            prev.name === activeStudentProfile.name &&
            prev.points === activeStudentProfile.points &&
            prev.email === activeStudentProfile.email
          ) {
            return prev;
          }
          return activeStudentProfile;
        });

        // Administrative authority is strictly granted via server-side verification:
        let verifiedAdmin: AdminUser | null = null;
        if (serverAuth.isAdmin) {
          verifiedAdmin = {
            id: authUser.uid,
            name: resolvedName,
            email: normalizedAuthEmail || activeStudentProfile.email || '',
            roles: (serverAuth.serverUser?.roles || ['Admin']) as any,
            status: 'Active',
            testsCompleted: 0,
            points: 9999,
            joinedDate: new Date().toLocaleDateString('en-GB'),
          };
        } else if (serverAuth.isTransient) {
          // Transient failure (network/5xx/cold start): retain previous adminUser without logging out
          verifiedAdmin = adminUserRef.current;
        } else {
          verifiedAdmin = null;
        }

        setAdminUser((prev) => {
          if (!verifiedAdmin && !prev) return null;
          if (
            prev &&
            verifiedAdmin &&
            prev.id === verifiedAdmin.id &&
            prev.roles.join(',') === verifiedAdmin.roles.join(',') &&
            prev.name === verifiedAdmin.name &&
            prev.email === verifiedAdmin.email
          ) {
            return prev;
          }
          return verifiedAdmin;
        });

        setIsAuthLoading(false);

        // Re-evaluate current URL authorization upon session hydration
        const currentPath = getBrowserPath();
        checkAndApplyRoute(currentPath, {
          student: activeStudentProfile,
          adminUser: verifiedAdmin,
          isInitializing: false,
        });
      } else {
        // Supabase SIGNED_OUT or unauthenticated student state across tabs
        setStudent(null);
        setIsAuthLoading(false);

        // Crucial Decoupling: A Supabase student logout must NOT destroy a separately authenticated admin session
        const hasAdminToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('taleemguru_admin_token'));
        const activeAdmin = adminUserRef.current;

        if (!hasAdminToken && !activeAdmin) {
          // If no separate admin token exists, clear admin state as well
          try {
            localStorage.removeItem('taleemguru_admin_token');
            localStorage.removeItem('taleemguru_admin_profile');
          } catch (e) {}
          setAdminUser(null);

          const currentPath = getBrowserPath();
          const isStudentProtected =
            currentPath.startsWith('/dashboard') ||
            currentPath.startsWith('/student-dashboard') ||
            currentPath.startsWith('/profile') ||
            currentPath.startsWith('/results') ||
            currentPath.startsWith('/attempts') ||
            currentPath.startsWith('/certificates');

          if (isStudentProtected) {
            updateBrowserUrl('/home');
            setCurrentView('home');
            setAuthAccessResult(null);
          } else {
            checkAndApplyRoute(currentPath, {
              student: null,
              adminUser: null,
              isInitializing: false,
            });
          }
        } else {
          // Admin session is active or verifying: re-evaluate route keeping admin intact
          const currentPath = getBrowserPath();
          const isStudentProtected =
            currentPath.startsWith('/dashboard') ||
            currentPath.startsWith('/student-dashboard') ||
            currentPath.startsWith('/profile') ||
            currentPath.startsWith('/results') ||
            currentPath.startsWith('/attempts') ||
            currentPath.startsWith('/certificates');

          if (isStudentProtected) {
            updateBrowserUrl('/home');
            setCurrentView('home');
            setAuthAccessResult(null);
          } else {
            checkAndApplyRoute(currentPath, {
              student: null,
              adminUser: activeAdmin,
              isInitializing: isAdminVerifyingRef.current,
            });
          }
        }
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Purge any legacy localStorage authentication records on mount
  useEffect(() => {
    try {
      localStorage.removeItem('taleem_guru_student');
      localStorage.removeItem('taleem_guru_admin');
      localStorage.removeItem('taleem_candidate_user');
      localStorage.removeItem('taleem_active_user');
    } catch (e) {}
  }, []);

  // Save MCQs updates
  useEffect(() => {
    try {
      localStorage.setItem('taleem_guru_mcqs', JSON.stringify(mcqBank));
    } catch (e) {}
  }, [mcqBank]);

  // Save Tests updates
  useEffect(() => {
    try {
      localStorage.setItem('taleem_guru_tests', JSON.stringify(allTests));
    } catch (e) {}
  }, [allTests]);

  // Save Past Papers updates
  useEffect(() => {
    try {
      localStorage.setItem('taleem_guru_past_papers', JSON.stringify(allPastPapers));
    } catch (e) {}
  }, [allPastPapers]);

  // Save Study Notes updates
  useEffect(() => {
    try {
      localStorage.setItem('taleem_guru_study_notes', JSON.stringify(allStudyNotes));
    } catch (e) {}
  }, [allStudyNotes]);

  // Save Results updates
  useEffect(() => {
    try {
      localStorage.setItem('taleem_guru_results', JSON.stringify(historyResults));
    } catch (e) {}
  }, [historyResults]);

  // Fetch authoritative educational content from PostgreSQL database on load
  useEffect(() => {
    let isMounted = true;
    const loadContentFromDb = async () => {
      try {
        const [dbMcqs, dbTests, dbPapers, dbNotes] = await Promise.allSettled([
          fetchMCQsApi(),
          fetchTestsApi(),
          fetchPastPapersApi(),
          fetchStudyNotesApi(),
        ]);

        if (!isMounted) return;

        if (dbMcqs.status === 'fulfilled' && Array.isArray(dbMcqs.value) && dbMcqs.value.length > 0) {
          setMcqBank(dbMcqs.value);
        }
        if (dbTests.status === 'fulfilled' && Array.isArray(dbTests.value) && dbTests.value.length > 0) {
          setAllTests(dbTests.value);
        }
        if (dbPapers.status === 'fulfilled' && Array.isArray(dbPapers.value) && dbPapers.value.length > 0) {
          setAllPastPapers(dbPapers.value);
        }
        if (dbNotes.status === 'fulfilled' && Array.isArray(dbNotes.value) && dbNotes.value.length > 0) {
          setAllStudyNotes(dbNotes.value);
        }
      } catch (err: any) {
        console.error('Background database content sync error:', err.message, err);
      }
    };

    loadContentFromDb();
    return () => {
      isMounted = false;
    };
  }, []);

  // Single Central Logout Function
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const handleCentralLogout = useCallback(
    async (redirectPath: string = '/home') => {
      if (isLoggingOut) return;
      setIsLoggingOut(true);

      try {
        await logoutUser();
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        // Instantly invalidate all in-flight asynchronous admin verification requests
        authSessionSeqRef.current++;
        setIsAdminVerifying(false);
        setAdminVerifyError(null);

        // 1. Immediately purge both Student and Admin state (prevent cross-role leakage)
        setStudent(null);
        setAdminUser(null);

        // 2. Clear any residual legacy auth records
        try {
          localStorage.removeItem('taleem_guru_student');
          localStorage.removeItem('taleem_guru_admin');
          localStorage.removeItem('taleem_candidate_user');
          localStorage.removeItem('taleem_active_user');
          localStorage.removeItem('taleemguru_admin_token');
          localStorage.removeItem('taleemguru_admin_profile');
        } catch (e) {}

        // 3. Clear auth access denial state and redirect away from protected views
        const currentPath = getBrowserPath();
        const isCurrentlyProtected =
          currentPath.startsWith('/admin') ||
          currentPath.startsWith('/dashboard') ||
          currentPath.startsWith('/student-dashboard') ||
          currentPath.startsWith('/profile') ||
          currentPath.startsWith('/results') ||
          currentPath.startsWith('/attempts') ||
          currentPath.startsWith('/certificates');

        if (isCurrentlyProtected) {
          updateBrowserUrl(redirectPath);
          setCurrentView('home');
          setAuthAccessResult(null);
        } else {
          checkAndApplyRoute(currentPath, { student: null, adminUser: null, isInitializing: false });
        }

        setIsLoggingOut(false);
      }
    },
    [isLoggingOut, checkAndApplyRoute]
  );

  const handleStudentLogout = useCallback(async () => {
    await handleCentralLogout('/home');
  }, [handleCentralLogout]);

  const handleAdminLogout = useCallback(async () => {
    await handleCentralLogout('/admin');
  }, [handleCentralLogout]);

  // Bulk Import Handlers
  const handleBulkImportMCQs = async (imported: MCQ[], replace?: boolean) => {
    setMcqBank((prev) => (replace ? imported : [...imported, ...prev]));
    try {
      const headers = await fetch('/api/mcqs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcqs: imported }),
      });
    } catch (e) {
      console.warn('Notice: Background MCQ bulk import sync error:', e);
    }
  };

  const handleBulkImportTests = async (imported: TestConfig[], replace?: boolean) => {
    setAllTests((prev) => (replace ? imported : [...imported, ...prev]));
    try {
      await fetch('/api/tests/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tests: imported }),
      });
    } catch (e) {
      console.warn('Notice: Background test bulk import sync error:', e);
    }
  };

  const handleBulkImportPastPapers = async (imported: PastPaper[], replace?: boolean) => {
    setAllPastPapers((prev) => (replace ? imported : [...imported, ...prev]));
    try {
      await fetch('/api/past-papers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pastPapers: imported }),
      });
    } catch (e) {
      console.warn('Notice: Background past papers bulk import sync error:', e);
    }
  };

  const handleBulkImportStudyNotes = async (imported: StudyNote[], replace?: boolean) => {
    setAllStudyNotes((prev) => (replace ? imported : [...imported, ...prev]));
    try {
      await fetch('/api/study-notes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyNotes: imported }),
      });
    } catch (e) {
      console.warn('Notice: Background study notes bulk import sync error:', e);
    }
  };

  const handleBulkImportBundle = async (
    bundle: { mcqs?: MCQ[]; tests?: TestConfig[]; pastPapers?: PastPaper[]; studyNotes?: StudyNote[] },
    replace?: boolean
  ) => {
    if (bundle.mcqs && bundle.mcqs.length > 0) {
      await handleBulkImportMCQs(bundle.mcqs, replace);
    }
    if (bundle.tests && bundle.tests.length > 0) {
      await handleBulkImportTests(bundle.tests, replace);
    }
    if (bundle.pastPapers && bundle.pastPapers.length > 0) {
      await handleBulkImportPastPapers(bundle.pastPapers, replace);
    }
    if (bundle.studyNotes && bundle.studyNotes.length > 0) {
      await handleBulkImportStudyNotes(bundle.studyNotes, replace);
    }
  };

  // Handle Start Test
  const handleStartTest = (config: TestConfig) => {
    setActiveTest(config);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Finish Test
  const handleFinishTest = (result: TestResult) => {
    setActiveTest(null);
    const enrichedResult: TestResult = {
      ...result,
      userId: student?.uid,
      userEmail: student?.email,
    };
    setActiveResult(enrichedResult);
    setHistoryResults((prev) => [enrichedResult, ...prev]);

    // Save to Firestore Cloud Results Collection with candidate UID/Email
    saveTestResultToCloud(enrichedResult, student?.email || 'anonymous');

    // Automated Certificate Toast
    if (result.percentage >= 60) {
      showToast({
        type: 'success',
        title: 'Achievement Unlocked!',
        message: 'Congratulations! You have earned a Merit Certificate. Check the Admin panel or Student Dashboard to download.'
      });
    }

    // Update student stats if authenticated
    if (student) {
      setStudent((prev) => {
        if (!prev) return null;
        const newPoints = (prev.points || 0) + result.marksObtained * 10;
        const wrongIds = result.answers
          .filter((a) => {
            const q = result.questions.find((x) => x.id === a.questionId);
            return q && a.selectedOption !== q.correctAnswer;
          })
          .map((a) => a.questionId);

        const updatedWrong = Array.from(new Set([...(prev.wrongQuestionIds || []), ...wrongIds]));

        return {
          ...prev,
          points: newPoints,
          testsTaken: (prev.testsTaken || 0) + 1,
          wrongQuestionIds: updatedWrong,
        };
      });
    }
  };

  // Handle Retake Test
  const handleRetakeCurrentTest = () => {
    if (activeResult) {
      const matching = POPULAR_TESTS.find((t) => t.id === activeResult.testId);
      setActiveResult(null);
      if (matching) {
        setActiveTest(matching);
      } else {
        setActiveTest({
          id: `retest-${Date.now()}`,
          title: `Retake: ${activeResult.testTitle}`,
          description: 'Retake test attempt with full review',
          subject: activeResult.subject,
          category: activeResult.category || 'Practice',
          durationMinutes: Math.max(5, Math.ceil(activeResult.timeUsedSeconds / 60)),
          totalQuestions: activeResult.questions.length,
          totalMarks: activeResult.totalMarks,
          testType: activeResult.testType,
          negativeMarking: false,
          passPercentage: 50,
          questions: activeResult.questions,
        });
      }
    }
  };

  // Handle Start Custom Quiz from Quiz Engine
  const handleStartCustomQuiz = (mcqs: MCQ[], title: string, durationMinutes: number) => {
    const customTest: TestConfig = {
      id: `quiz-run-${Date.now()}`,
      title,
      description: 'Quick Custom Quiz',
      category: 'Quiz',
      subject: mcqs[0]?.subject || 'General',
      durationMinutes,
      totalQuestions: mcqs.length,
      totalMarks: mcqs.length,
      testType: 'Practice Test',
      negativeMarking: false,
      passPercentage: 50,
      questions: mcqs,
    };
    handleStartTest(customTest);
  };

  // Handle Start Class Test
  const handleStartClassTest = (className: string, subjectName: string) => {
    const testList = allTests && allTests.length > 0 ? allTests : POPULAR_TESTS;
    const normalizeClassStr = (val: string): string => (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchesClassLevel = (itemClass: string, targetClass: string): boolean => {
      if (!targetClass || targetClass === 'All') return true;
      const normTarget = normalizeClassStr(targetClass);
      const normItem = normalizeClassStr(itemClass);
      return normItem.includes(normTarget) || normTarget.includes(normItem);
    };

    // Find a test that matches both subject and class
    let test = testList.find(t => 
      t.subject.toLowerCase() === subjectName.toLowerCase() && 
      matchesClassLevel(t.classLevel || '', className)
    );

    // Fallback: match by subject if class-level test not explicitly constrained
    if (!test) {
      test = testList.find(t => t.subject.toLowerCase() === subjectName.toLowerCase());
    }
    
    if (test) {
      handleStartTest(test);
    } else {
      console.log('No test available for:', subjectName, className);
      showToast({
        type: 'info',
        title: 'No practice test available',
        message: `No practice test available for ${subjectName} in ${className} yet.`
      });
    }
  };

  // Handle Start Board Test
  const handleStartBoardTest = (boardName: string) => {
    const questions = mcqBank.slice(0, 10);
    const test: TestConfig = {
      id: `board-test-${Date.now()}`,
      title: `${boardName} Model Assessment`,
      description: `Official pattern examination for ${boardName}`,
      category: 'Board Examination',
      subject: 'Science & Core',
      board: boardName,
      durationMinutes: 20,
      totalQuestions: questions.length,
      totalMarks: questions.length,
      testType: 'Board Test',
      negativeMarking: false,
      passPercentage: 50,
      questions,
    };
    handleStartTest(test);
  };

  // Handle Solve Past Paper Online
  const handleSolvePastPaper = (paper: PastPaper) => {
    const questions = paper.questions && paper.questions.length > 0 ? paper.questions : mcqBank.slice(0, 10);
    const test: TestConfig = {
      id: `paper-solve-${paper.id}`,
      title: `Solved Online: ${paper.title}`,
      description: `Complete authentic online past paper simulation for ${paper.board} (${paper.year})`,
      category: 'Past Paper',
      subject: paper.subject,
      classLevel: paper.classLevel,
      board: paper.board,
      durationMinutes: 20,
      totalQuestions: questions.length,
      totalMarks: questions.length,
      testType: 'Board Test',
      negativeMarking: false,
      passPercentage: 50,
      questions,
    };
    handleStartTest(test);
  };

  // Handle Practice Wrong Questions
  const handlePracticeWrongQuestions = (wrongMCQs: MCQ[]) => {
    if (wrongMCQs.length === 0) return;
    const test: TestConfig = {
      id: `wrong-mcqs-${Date.now()}`,
      title: 'Mistake Revision & Targeted Practice Test',
      description: 'Review questions answered incorrectly in previous attempts',
      category: 'Revision',
      subject: 'Revision',
      durationMinutes: Math.max(5, wrongMCQs.length * 2),
      totalQuestions: wrongMCQs.length,
      totalMarks: wrongMCQs.length,
      testType: 'Practice Test',
      negativeMarking: false,
      passPercentage: 50,
      questions: wrongMCQs,
    };
    handleStartTest(test);
  };

  // Toggle Save Question
  const handleToggleSaveQuestion = (mcqId: string) => {
    if (!student) {
      setIsAuthModalOpen(true);
      return;
    }
    setStudent((prev) => {
      if (!prev) return null;
      const isSaved = (prev.savedQuestionIds || []).includes(mcqId);
      return {
        ...prev,
        savedQuestionIds: isSaved
          ? prev.savedQuestionIds.filter((id) => id !== mcqId)
          : [...(prev.savedQuestionIds || []), mcqId],
      };
    });
  };

  // Persist Profile Updates Authoritatively to PostgreSQL Database
  const handleUpdateProfile = async (updated: Partial<StudentProfile>) => {
    setStudent((prev) => (prev ? { ...prev, ...updated } : null));

    if (!student?.uid) return;

    try {
      await updateUserProfileCloud(student.uid, updated);
      const refreshed = await getUserProfile(student.uid);
      if (refreshed) {
        setStudent(refreshed);
      }
    } catch (err) {
      console.error('Failed to update student profile in database:', err);
    }
  };

  // Admin & Staff MCQ Management
  const handleAddMCQ = async (newMCQ: MCQ) => {
    const dup = checkDuplicateMCQ(
      newMCQ.question,
      newMCQ.subject,
      newMCQ.classLevel,
      newMCQ.board,
      undefined,
      mcqBank
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
    try {
      const res = await createMCQApi(newMCQ);
      if (res.success) {
        if (res.status === 'PENDING') {
          showToast({
            type: 'info',
            title: 'Submitted for Approval (202)',
            message: 'Your MCQ creation has been submitted for Admin approval. It is listed in "My Submissions" and will go live upon approval.',
            duration: 6000,
          });
        } else {
          const publishedMCQ = res.mcq || newMCQ;
          setMcqBank((prev) => [publishedMCQ, ...prev]);
          showToast({
            type: 'success',
            title: 'MCQ Published Live',
            message: 'MCQ was successfully created and published directly.',
          });
        }
      } else {
        showToast({
          type: 'error',
          title: 'Failed to create MCQ',
          message: res.error || 'Server error occurred',
        });
      }
    } catch (e) {
      console.warn('Notice: Background MCQ create sync error:', e);
    }
  };

  const handleUpdateMCQ = async (updatedMCQ: MCQ) => {
    try {
      const res = await updateMCQApi(updatedMCQ.id, updatedMCQ);
      if (res.success) {
        if (res.status === 'PENDING') {
          showToast({
            type: 'info',
            title: 'Changes Submitted for Approval',
            message: 'Your MCQ modifications have been submitted for Admin approval and recorded in "My Submissions". Live content remains unchanged until approved.',
            duration: 6000,
          });
        } else {
          setMcqBank((prev) => prev.map((m) => (m.id === updatedMCQ.id ? (res.mcq || updatedMCQ) : m)));
          showToast({
            type: 'success',
            title: 'MCQ Updated',
            message: 'Changes published live immediately.',
          });
        }
      }
    } catch (e) {
      console.warn('Notice: Background MCQ update sync error:', e);
    }
  };

  const handleDeleteMCQ = async (id: string) => {
    try {
      const res = await deleteMCQApi(id);
      if (res.success) {
        if (res.status === 'PENDING') {
          showToast({
            type: 'info',
            title: 'Deletion Submitted for Approval',
            message: 'Your deletion request has been submitted for Admin approval and recorded in "My Submissions". Content remains active until approved.',
            duration: 6000,
          });
        } else {
          setMcqBank((prev) => prev.filter((m) => m.id !== id));
          showToast({
            type: 'success',
            title: 'MCQ Deleted',
            message: 'Question removed from live bank.',
          });
        }
      }
    } catch (e) {
      console.warn('Notice: Background MCQ delete sync error:', e);
    }
  };

  const handleCreateTest = async (newTest: TestConfig) => {
    try {
      const res = await createTestApi(newTest);
      if (res.success) {
        if (res.status === 'PENDING') {
          showToast({
            type: 'info',
            title: 'Assessment Submitted for Approval',
            message: 'Your test configuration has been submitted for Admin approval and recorded in "My Submissions".',
            duration: 6000,
          });
        } else {
          const publishedTest = res.test || newTest;
          setAllTests((prev) => [publishedTest, ...prev]);
          showToast({
            type: 'success',
            title: 'Test Published Live',
            message: 'Assessment is now live for students.',
          });
        }
      }
    } catch (e) {
      console.warn('Notice: Background test create sync error:', e);
    }
  };

  const handleUpdateTest = async (updatedTest: TestConfig) => {
    try {
      const res = await updateTestApi(updatedTest.id, updatedTest);
      if (res.success) {
        if (res.status === 'PENDING') {
          showToast({
            type: 'info',
            title: 'Changes Submitted for Approval',
            message: 'Assessment updates have been submitted for Admin approval.',
            duration: 6000,
          });
        } else {
          setAllTests((prev) => prev.map((t) => (t.id === updatedTest.id ? (res.test || updatedTest) : t)));
        }
      }
    } catch (e) {
      console.warn('Notice: Background test update sync error:', e);
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      const res = await deleteTestApi(id);
      if (res.success) {
        if (res.status === 'PENDING') {
          showToast({
            type: 'info',
            title: 'Deletion Submitted for Approval',
            message: 'Test deletion request has been submitted for Admin approval.',
            duration: 6000,
          });
        } else {
          setAllTests((prev) => prev.filter((t) => t.id !== id));
        }
      }
    } catch (e) {
      console.warn('Notice: Background test delete sync error:', e);
    }
  };

  const currentStudentName = student?.name || 'Candidate';

  return (
    <ToastProvider>
      <SEOHead
        currentView={currentView}
        subFilter={activeSubFilter}
        contentStatus={activeTest?.status || null}
        isNotFound={currentView === 'not-found'}
        activeItem={
          activeTest
            ? {
                id: activeTest.id,
                title: activeTest.title,
                description: activeTest.description,
                status: activeTest.status,
                subject: activeTest.subject,
                classLevel: activeTest.classLevel,
                board: activeTest.board,
                durationMinutes: activeTest.durationMinutes,
                totalQuestions: activeTest.totalQuestions,
              }
            : null
        }
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-hidden"
      >
        Skip to main content
      </a>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
        {/* Session verification indicator for protected routes */}
        {isAuthLoading && resolveRoute(getBrowserPath()).isProtected ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <div className="w-10 h-10 rounded-full border-4 border-blue-500/30 border-t-blue-600 animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Verifying session credentials...
            </p>
          </div>
        ) : activeTest ? (
        <OnlineTestView
          test={activeTest}
          onFinishTest={handleFinishTest}
          onExitTest={() => setActiveTest(null)}
          studentName={currentStudentName}
        />
      ) : (
        <>
          {/* Main Website Navigation */}
          <Navbar
            currentView={currentView}
            onNavigate={handleNavigateWithFilter}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenPremium={() => setIsAuthModalOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onLogout={handleStudentLogout}
            student={student}
            adminUser={adminUser}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
          />

          {/* Main Content Render by Active View */}
          <main id="main-content" className="flex-1" tabIndex={-1}>
            <ErrorBoundary>
            {currentView === 'home' && (
              <Homepage
                onStartTest={handleStartTest}
                onNavigateTab={(tab) => {
                  handleNavigateWithFilter(tab as ViewMode);
                }}
                onOpenSearch={() => setIsSearchOpen(true)}
                allTests={allTests}
                historyResults={historyResults}
                allMCQs={mcqBank}
              />
            )}

            {currentView === 'tests' && (
              <TestsExplorerView
                onStartTest={handleStartTest}
                allMCQs={mcqBank}
                studentName={currentStudentName}
                tests={allTests}
              />
            )}

            {currentView === 'quizzes' && (
              <QuizEngineView
                allMCQs={mcqBank}
                onStartQuiz={handleStartCustomQuiz}
                studentName={currentStudentName}
              />
            )}

            {currentView === 'mcqs' && (
              <MCQBankView
                allMCQs={mcqBank}
                studentName={currentStudentName}
                initialSubject={activeSubFilter || 'All'}
                comparisonContext={comparisonContext}
              />
            )}

            {currentView === 'past-papers' && (
              <PastPapersView
                pastPapers={allPastPapers}
                papers={allPastPapers}
                allMCQs={mcqBank}
                onSolvePaper={handleSolvePastPaper}
                onSolveOnline={handleSolvePastPaper}
                studentName={currentStudentName}
                initialSubject={activeSubFilter || 'All'}
                subFilter={activeSubFilter}
                onNavigate={(view, filter) => handleNavigateWithFilter(view as ViewMode, filter)}
                comparisonContext={comparisonContext}
              />
            )}

            {currentView === 'boards' && (
              <BoardsView
                pastPapers={allPastPapers}
                papers={allPastPapers}
                onSelectBoardTest={handleStartBoardTest}
                onStartBoardTest={handleStartBoardTest}
                onSelectPaper={handleSolvePastPaper}
                onSolveOnline={handleSolvePastPaper}
                onNavigateMCQBank={(boardName) => handleNavigateWithFilter('mcqs', boardName)}
                onNavigatePastPapers={(boardName) => handleNavigateWithFilter('past-papers', boardName)}
                onNavigateSyllabus={(boardName) => handleNavigateWithFilter('syllabus', boardName)}
                allMCQs={mcqBank}
                studentName={currentStudentName}
                initialProvince={activeSubFilter || 'All'}
                subFilter={activeSubFilter}
              />
            )}

            {currentView === 'classes' && (
              <ClassesView
                onStartClassTest={handleStartClassTest}
                onNavigateMCQBank={(className) => handleNavigateWithFilter('mcqs', buildNavContextString('All', className))}
                onNavigatePastPapers={(className) => handleNavigateWithFilter('past-papers', buildNavContextString('All', className))}
                onNavigateNotes={(className) => handleNavigateWithFilter('notes', buildNavContextString('All', className))}
                allMCQs={mcqBank}
                allTests={allTests}
                studentName={currentStudentName}
                initialClass={activeSubFilter}
              />
            )}

            {currentView === 'subjects' && (
              <SubjectsView
                onStartSubjectTest={(subjectName, className) => {
                  const test = allTests.find(t => 
                    t.subject.toLowerCase() === subjectName.toLowerCase() && 
                    matchesClassGrade(t.classLevel || '', className)
                  );
                  
                  if (test) {
                    handleStartTest(test);
                  } else {
                    const subjectMCQs = mcqBank.filter(m =>
                      m.subject.toLowerCase() === subjectName.toLowerCase() &&
                      matchesClassGrade(m.classLevel || '', className)
                    );
                    if (subjectMCQs.length > 0) {
                      handleStartTest({
                        id: `subj-test-${subjectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
                        title: `${className !== 'All' ? className + ' ' : ''}${subjectName} Practice Test`,
                        description: `Official practice test for ${subjectName}`,
                        category: 'Practice Test',
                        testType: 'Subject Test',
                        subject: subjectName,
                        classLevel: className !== 'All' ? className : undefined,
                        durationMinutes: Math.max(10, Math.ceil(subjectMCQs.length * 1.5)),
                        totalQuestions: Math.min(20, subjectMCQs.length),
                        totalMarks: Math.min(20, subjectMCQs.length),
                        negativeMarking: false,
                        passPercentage: 50,
                        questions: subjectMCQs.slice(0, 20),
                      });
                    } else {
                      showToast({
                        type: 'info',
                        title: 'No practice test available',
                        message: `No practice test available for ${subjectName} in ${className} yet.`
                      });
                    }
                  }
                }}
                onStartChapterTest={(subjectName, className, chapterName) => {
                  const normChapterStr = (str: string) =>
                    (str || '')
                      .trim()
                      .toLowerCase()
                      .replace(/&/g, 'and')
                      .replace(/^(chapter|ch|unit)\s*\d*[:\.-]?\s*/i, '')
                      .replace(/[^a-z0-9]/g, '');

                  const matchesChapterStr = (c1?: string, c2?: string): boolean => {
                    if (!c1 || !c2) return false;
                    const n1 = normChapterStr(c1);
                    const n2 = normChapterStr(c2);
                    if (!n1 || !n2) return false;
                    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
                  };

                  // 1. Check allTests for exact chapter match or title match
                  const testMatch = allTests.find(t => 
                    t.subject.toLowerCase() === subjectName.toLowerCase() &&
                    matchesClassGrade(t.classLevel || '', className) &&
                    ((t.chapter && matchesChapterStr(t.chapter, chapterName)) ||
                     matchesChapterStr(t.title, chapterName))
                  );

                  if (testMatch) {
                    handleStartTest({
                      ...testMatch,
                      subject: subjectName,
                      chapter: chapterName,
                      classLevel: className !== 'All' ? className : testMatch.classLevel,
                    });
                    return;
                  }

                  // 2. Check mcqBank for real MCQs belonging to this chapter
                  const chapterMCQs = mcqBank.filter(m =>
                    m.subject.toLowerCase() === subjectName.toLowerCase() &&
                    matchesClassGrade(m.classLevel || '', className) &&
                    m.chapter && matchesChapterStr(m.chapter, chapterName)
                  );

                  if (chapterMCQs.length > 0) {
                    handleStartTest({
                      id: `chap-test-${subjectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${chapterName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                      title: `${className !== 'All' ? className + ' ' : ''}${subjectName} - Chapter: ${chapterName} Test`,
                      description: `Official chapter practice test for ${chapterName} (${subjectName})`,
                      category: 'Practice Test',
                      testType: 'Chapter Test',
                      subject: subjectName,
                      chapter: chapterName,
                      classLevel: className !== 'All' ? className : undefined,
                      durationMinutes: Math.max(10, Math.ceil(chapterMCQs.length * 1.5)),
                      totalQuestions: chapterMCQs.length,
                      totalMarks: chapterMCQs.length,
                      negativeMarking: false,
                      passPercentage: 50,
                      questions: chapterMCQs,
                    });
                    return;
                  }

                  // 3. No test exists for this chapter
                  showToast({
                    type: 'info',
                    title: 'No practice test available',
                    message: 'No practice test available for this chapter.',
                  });
                }}
                isTestAvailable={(subjectName, className) => 
                  allTests.some(t => 
                    t.subject.toLowerCase() === subjectName.toLowerCase() && 
                    matchesClassGrade(t.classLevel || '', className)
                  ) ||
                  mcqBank.some(m =>
                    m.subject.toLowerCase() === subjectName.toLowerCase() &&
                    matchesClassGrade(m.classLevel || '', className)
                  )
                }
                onNavigateMCQBank={(subjectName, className) => {
                  const filter = buildNavContextString(subjectName, className);
                  handleNavigateWithFilter('mcqs', filter);
                }}
                onNavigatePastPapers={(subjectName, className) => {
                  const filter = buildNavContextString(subjectName, className);
                  handleNavigateWithFilter('past-papers', filter);
                }}
                onNavigateNotes={(subjectName, className) => {
                  const filter = buildNavContextString(subjectName, className);
                  handleNavigateWithFilter('notes', filter);
                }}
                allMCQs={mcqBank}
                allTests={allTests}
                allPastPapers={allPastPapers}
                allNotes={allStudyNotes}
                studentName={currentStudentName}
                initialSubject={activeSubFilter}
                comparisonContext={comparisonContext}
              />
            )}

            {(currentView === 'notes' || currentView === 'study-material') && (
              <NotesView
                notes={allStudyNotes}
                onSelectNote={(n) => {}}
                studentName={currentStudentName}
                initialSubject={activeSubFilter || 'All'}
                subFilter={activeSubFilter}
                comparisonContext={comparisonContext}
              />
            )}

            {currentView === 'syllabus' && (
              <SyllabusComparison
                initialBoard={activeSubFilter}
                onNavigateSubject={(ctx) => {
                  setComparisonContext(ctx);
                  setCurrentView('subjects');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNavigateMCQBank={(ctx) => {
                  setComparisonContext(ctx);
                  setCurrentView('mcqs');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNavigatePastPapers={(ctx) => {
                  setComparisonContext(ctx);
                  setCurrentView('past-papers');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNavigateNotes={(ctx) => {
                  setComparisonContext(ctx);
                  setCurrentView('notes');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNavigateBoards={() => handleNavigateWithFilter('boards')}
              />
            )}
            
            {currentView === 'entry-tests' && (
              <EntryTestsView
                onStartEntryTest={(testId) => {
                  const normId = (testId || '').toLowerCase();
                  let qPool = mcqBank;
                  let defaultCategory = 'Entry Test';
                  let defaultSubject = 'Entry Test Core';
                  let defaultMarks = 15;
                  let isNegative = true;
                  let testTitle = `Official Mock: ${testId.toUpperCase()}`;

                  if (normId.includes('mdcat') || normId.includes('nums')) {
                    qPool = mcqBank.filter((m) => m.exam === 'MDCAT' || m.subject === 'Biology' || m.subject === 'Chemistry' || m.subject === 'Physics');
                    defaultCategory = 'Medical Entry Test';
                    defaultSubject = 'Biology & Natural Sciences';
                    testTitle = normId.includes('nums') ? 'NUMS Official Medical Mock' : 'MDCAT High-Yield Mock Series';
                    isNegative = true;
                  } else if (normId.includes('ecat') || normId.includes('nust') || normId.includes('giki') || normId.includes('fast') || normId.includes('pieas')) {
                    qPool = mcqBank.filter((m) => m.exam === 'ECAT' || m.subject === 'Mathematics' || m.subject === 'Physics' || m.subject === 'Computer Science');
                    defaultCategory = 'Engineering Entry Test';
                    defaultSubject = 'Mathematics & Physical Sciences';
                    testTitle = 'ECAT / Engineering College Admission Test Drill';
                    isNegative = true;
                  } else if (normId.includes('css')) {
                    qPool = mcqBank.filter((m) => m.exam === 'CSS' || m.subject === 'Pakistan Studies' || m.subject === 'Current Affairs' || m.subject === 'General Knowledge' || m.subject === 'English');
                    defaultCategory = 'Civil Services & CSS';
                    defaultSubject = 'Pakistan Affairs & General Ability';
                    testTitle = 'CSS MPT Screening Exam Mock';
                    isNegative = false;
                  } else if (normId.includes('pms')) {
                    qPool = mcqBank.filter((m) => m.exam === 'PMS' || m.subject === 'Pakistan Studies' || m.subject === 'Current Affairs' || m.subject === 'General Knowledge' || m.subject === 'Urdu');
                    defaultCategory = 'Civil Services & PMS';
                    defaultSubject = 'General Knowledge & Provincial Studies';
                    testTitle = 'PMS Screening Exam Practice Test';
                    isNegative = false;
                  } else if (normId.includes('army') || normId.includes('navy') || normId.includes('airforce') || normId.includes('paf') || normId.includes('forces')) {
                    qPool = mcqBank.filter((m) => m.subject === 'IQ & Intelligence' || m.subject === 'Physics' || m.subject === 'Mathematics' || m.subject === 'General Knowledge');
                    defaultCategory = 'Armed Forces Test';
                    defaultSubject = 'Verbal & Non-Verbal Intelligence';
                    testTitle = normId.includes('navy') ? 'Pakistan Navy Initial Test' : normId.includes('airforce') || normId.includes('paf') ? 'PAF Initial E-Testing Simulation' : 'Pakistan Army Initial Test (PMA Long Course)';
                    isNegative = false;
                  }

                  const matchedTest = ENTRY_TESTS_DATA.find((t) => t.id === testId);
                  if (matchedTest) {
                    testTitle = matchedTest.name;
                    defaultCategory = matchedTest.type;
                    defaultMarks = matchedTest.totalMarks || 15;
                  }

                  handleStartTest({
                    id: `entry-mock-${testId}`,
                    title: testTitle,
                    description: matchedTest?.description || 'Full syllabus mock examination with timer and score calculation',
                    category: defaultCategory,
                    subject: defaultSubject,
                    durationMinutes: 30,
                    totalQuestions: Math.min(15, qPool.length >= 10 ? qPool.length : 15),
                    totalMarks: defaultMarks,
                    testType: 'Entry Test',
                    negativeMarking: isNegative,
                    passPercentage: 60,
                    questions: qPool.length >= 10 ? qPool.slice(0, 15) : mcqBank.slice(0, 15),
                  });
                }}
                allMCQs={mcqBank}
                studentName={currentStudentName}
                initialCategory={activeSubFilter || 'All'}
                onCategoryChange={(cat) => {
                  const canonical = cat === 'All' ? '/entry-tests' : `/entry-tests?category=${cat.toLowerCase().replace(/ /g, '-')}`;
                  updateBrowserUrl(canonical, true);
                  setActiveSubFilter(cat === 'All' ? undefined : cat);
                }}
              />
            )}

            {currentView === 'competitive-exams' && (
              <CompetitiveExamsView
                onStartExamTest={(examId) => {
                  const qPool = mcqBank.filter((m) => m.exam === 'CSS' || m.subject === 'Pakistan Studies');
                  handleStartTest({
                    id: `comp-mock-${examId}`,
                    title: `${examId.toUpperCase()} Screening Mock Examination`,
                    description: 'FPSC / PPSC competitive recruitment screening practice test',
                    category: 'Competitive Exam',
                    subject: 'General Knowledge & Pakistan Affairs',
                    durationMinutes: 30,
                    totalQuestions: 15,
                    totalMarks: 15,
                    testType: 'Competitive Exam Test',
                    negativeMarking: true,
                    passPercentage: 50,
                    questions: qPool.length >= 10 ? qPool.slice(0, 15) : mcqBank.slice(0, 15),
                  });
                }}
                allMCQs={mcqBank}
                studentName={currentStudentName}
              />
            )}

            {currentView === 'armed-forces' && (
              <ArmedForcesView
                onStartForceTest={(force, testType) => {
                  const qPool = mcqBank.filter((m) => m.subject === 'IQ & Intelligence' || m.subject === 'Physics');
                  handleStartTest({
                    id: `force-test-${Date.now()}`,
                    title: `${force} Computer Initial E-Test (${testType})`,
                    description: `Automated testing console simulating computerized armed forces screening`,
                    category: 'Armed Forces',
                    subject: 'Intelligence & Academic',
                    durationMinutes: 20,
                    totalQuestions: 12,
                    totalMarks: 12,
                    testType: 'Practice Test',
                    negativeMarking: false,
                    passPercentage: 60,
                    questions: qPool.length >= 5 ? qPool.slice(0, 12) : mcqBank.slice(0, 12),
                  });
                }}
                allMCQs={mcqBank}
                studentName={currentStudentName}
              />
            )}

            {/* Access Denied / Unauthorized Security Interceptor */}
            {authAccessResult && !authAccessResult.isAllowed && (
              <AccessDeniedView
                authResult={authAccessResult}
                currentUser={adminUser || student}
                onNavigateHome={() => handleNavigateWithFilter('home')}
                onNavigateDashboard={() => handleNavigateWithFilter('student-dashboard')}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onOpenAdminLogin={() => handleNavigateWithFilter('admin-panel')}
                onOpenLogin={() => {
                  if (authAccessResult.path.startsWith('/admin')) {
                    handleNavigateWithFilter('admin-panel');
                  } else {
                    setIsAuthModalOpen(true);
                  }
                }}
                onSwitchAccount={async () => {
                  await handleCentralLogout();
                  setIsAuthModalOpen(true);
                }}
              />
            )}

            {(!authAccessResult || authAccessResult.isAllowed) && (currentView === 'results' || currentView === 'student-dashboard') && (
              <StudentDashboard
                student={student}
                historyResults={historyResults}
                allMCQs={mcqBank}
                onReviewResult={(res) => setActiveResult(res)}
                onPracticeWrongQuestions={handlePracticeWrongQuestions}
                onRemoveSavedQuestion={handleToggleSaveQuestion}
                onStartQuiz={() => handleNavigateWithFilter('quizzes')}
                onStartTestConfig={(cfg) => handleStartTest(cfg)}
                onNavigateNotes={() => handleNavigateWithFilter('notes')}
                onNavigatePastPapers={() => handleNavigateWithFilter('past-papers')}
                onUpdateProfile={handleUpdateProfile}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onLogout={handleStudentLogout}
              />
            )}

            {(!authAccessResult || authAccessResult.isAllowed) && currentView === 'leaderboard' && (
              <LeaderboardView
                currentStudentPoints={student?.points || 0}
                currentStudentName={currentStudentName}
              />
            )}

            {(!authAccessResult || authAccessResult.isAllowed) && (currentView === 'admin-panel' || currentView === 'teacher-panel') && (
              isAdminVerifying ? (
                <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Verifying administrator session...</h2>
                  <p className="text-slate-400 text-sm max-w-md">Cryptographically validating your administrative credentials with the server. Please wait...</p>
                </div>
              ) : adminVerifyError ? (
                <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
                  <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-2xl font-bold mb-4">⚠️</div>
                  <h2 className="text-xl font-semibold mb-2">Verification Notice</h2>
                  <p className="text-slate-300 text-sm max-w-md mb-6">{adminVerifyError}</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => verifyAdminSession()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Retry Verification
                    </button>
                    <button
                      onClick={() => handleAdminLogout()}
                      className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Return to Login
                    </button>
                  </div>
                </div>
              ) : (
                <AdminTeacherPanel
                  allMCQs={mcqBank}
                  allTests={allTests}
                  allPastPapers={allPastPapers}
                  allStudyNotes={allStudyNotes}
                  historyResults={historyResults}
                  adminUser={adminUser}
                  initialTab={activeAdminTab as any}
                  onAdminLogin={(admin) => {
                    const safeAdmin: AdminUser = {
                      ...admin,
                      name: (admin.email?.toLowerCase().trim() === 'admin@taleemguru.pk' || admin.name === 'avatar-1' || !admin.name)
                        ? 'Admin'
                        : admin.name,
                    };
                    setAdminUser(safeAdmin);
                    const currentPath = getBrowserPath();
                    if (currentPath.startsWith('/admin')) {
                      checkAndApplyRoute(currentPath, { adminUser: safeAdmin });
                    } else {
                      handleNavigateWithFilter('admin-panel', undefined, 'dashboard');
                    }
                  }}
                  onAdminLogout={handleAdminLogout}
                  onBackToHome={() => handleNavigateWithFilter('home')}
                  onAddMCQ={handleAddMCQ}
                  onUpdateMCQ={handleUpdateMCQ}
                  onDeleteMCQ={handleDeleteMCQ}
                  onCreateCustomTest={handleCreateTest}
                  onUpdateCustomTest={handleUpdateTest}
                  onDeleteCustomTest={handleDeleteTest}
                  onStartTest={handleStartTest}
                  onBulkImportMCQs={handleBulkImportMCQs}
                  onBulkImportTests={handleBulkImportTests}
                  onBulkImportPastPapers={handleBulkImportPastPapers}
                  onBulkImportStudyNotes={handleBulkImportStudyNotes}
                  onBulkImportBundle={handleBulkImportBundle}
                  onNavigateTab={(tab) => {
                    handleNavigateWithFilter('admin-panel', undefined, tab);
                  }}
                />
              )
            )}

            {currentView === 'privacy-policy' && (
              <PrivacyPolicyView
                onNavigateHome={() => handleNavigateWithFilter('home')}
                onNavigateTerms={() => handleNavigateWithFilter('terms-of-service')}
              />
            )}

            {currentView === 'verify-certificate' && (
              <CertificateVerificationView />
            )}

            {currentView === 'terms-of-service' && (
              <TermsOfServiceView
                onNavigateHome={() => handleNavigateWithFilter('home')}
                onNavigatePrivacy={() => handleNavigateWithFilter('privacy-policy')}
              />
            )}

            {currentView === 'auth-callback' && (
              <AuthCallbackView
                onAuthSuccess={(profile, admin) => {
                  setStudent(profile);
                  setAdminUser(admin);
                  setIsAuthLoading(false);
                }}
                onNavigate={(view, subFilter, adminTab) => {
                  handleNavigateWithFilter(view, subFilter, adminTab);
                }}
              />
            )}

            {currentView === 'search' && (
              <PublicSearchView
                initialQuery={activeSubFilter || ''}
                onSelectTest={(t) => handleStartTest(t)}
                onSelectMCQ={() => {
                  setCurrentView('mcqs');
                }}
                onSelectPastPaper={(p) => {
                  handleSolvePastPaper(p);
                }}
                onSelectNote={() => {
                  setCurrentView('study-material');
                }}
                onNavigate={(v, sub) => {
                  handleNavigateWithFilter(v, sub);
                }}
              />
            )}

            {currentView === 'not-found' && (
              <NotFoundView
                onNavigate={(v) => handleNavigateWithFilter(v)}
                onOpenSearch={() => setIsSearchOpen(true)}
              />
            )}
            </ErrorBoundary>
          </main>

          {/* Footer Component */}
          <Footer onNavigate={(view) => {
            handleNavigateWithFilter(view);
          }} />
        </>
      )}

      {/* Result & Scorecard Modal with Watermarked PDF Download */}
      {activeResult && (
        <ResultModal
          result={activeResult}
          studentName={currentStudentName}
          onRetake={handleRetakeCurrentTest}
          onClose={() => setActiveResult(null)}
          onNextQuiz={() => {
            setActiveResult(null);
            handleNavigateWithFilter('quizzes');
          }}
          onGoDashboard={() => {
            setActiveResult(null);
            handleNavigateWithFilter('student-dashboard');
          }}
          onSaveQuestion={handleToggleSaveQuestion}
          savedQuestionIds={student?.savedQuestionIds || []}
        />
      )}

      {/* Universal Search Modal */}
      <UniversalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        mcqs={mcqBank}
        tests={POPULAR_TESTS}
        pastPapers={PAST_PAPERS_DATA}
        notes={STUDY_NOTES_DATA}
        videos={[]}
        onSelectTest={(t) => {
          setIsSearchOpen(false);
          handleStartTest(t);
        }}
        onSelectMCQ={(m) => {
          setIsSearchOpen(false);
          setCurrentView('mcqs');
        }}
        onSelectPastPaper={(p) => {
          setIsSearchOpen(false);
          handleSolvePastPaper(p);
        }}
        onSelectNote={() => {
          setIsSearchOpen(false);
          setCurrentView('study-material');
        }}
        onNavigate={(v, sub) => {
          setIsSearchOpen(false);
          handleNavigateWithFilter(v, sub);
        }}
      />

      {/* Student Account & Profile Modal */}
      <StudentAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentStudent={student}
        onUpdateStudent={(updated) => {
          const rawRoles: string[] = (updated.roles && updated.roles.length > 0)
            ? updated.roles
            : ((updated as any).role ? [(updated as any).role] : ['Student']);
          const isUserAdmin =
            rawRoles.includes('Admin') ||
            updated.email?.toLowerCase().trim() === 'admin@taleemguru.pk';
          const isUserStaff = rawRoles.some((r: string) =>
            ['Teacher', 'Editor', 'ContentManager', 'Moderator'].includes(r)
          );
          const effectiveRoles: any[] = isUserAdmin && !rawRoles.includes('Admin')
            ? [...rawRoles, 'Admin']
            : rawRoles;

          const safeName = isUserAdmin && !updated.name
            ? 'Admin'
            : (updated.name === 'avatar-1' || !updated.name ? (updated.email ? updated.email.split('@')[0] : 'Learner') : updated.name);

          const safeStudent: StudentProfile = {
            ...updated,
            name: safeName,
            roles: effectiveRoles,
            avatar: updated.avatar && updated.avatar !== 'avatar-1' ? updated.avatar : (isUserAdmin ? '👨‍💼' : '🎓'),
          };

          setStudent(safeStudent);

          let currentAdmin: AdminUser | null = adminUser;
          if (!isUserAdmin && !isUserStaff) {
            setAdminUser(null);
            currentAdmin = null;
          } else {
            currentAdmin = {
              id: updated.uid || '',
              name: safeName,
              email: updated.email || '',
              roles: effectiveRoles,
              status: 'Active',
              testsCompleted: 0,
              points: isUserAdmin ? 9999 : (updated.points || 0),
              joinedDate: new Date().toLocaleDateString('en-GB'),
            };
            setAdminUser(currentAdmin);
          }

          const currentPath = getBrowserPath();
          if (isUserAdmin) {
            handleNavigateWithFilter('admin-panel', undefined, 'dashboard');
          } else if (isUserStaff) {
            handleNavigateWithFilter('admin-panel');
          } else {
            // After successful student login, navigate cleanly to student-dashboard
            handleNavigateWithFilter('student-dashboard');
          }
        }}
      />
      </div>
    </ToastProvider>
  );
}
