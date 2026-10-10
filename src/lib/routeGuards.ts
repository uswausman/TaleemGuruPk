import { ViewMode, UserRole, RouteAuthResult, StudentProfile, AdminUser } from '../types';
import { parseNavContext, buildNavContextString, normalizeClassLevel, normalizeSubjectName } from '../utils/navigationContext';

export interface RouteDefinition {
  path: string;
  view: ViewMode;
  subFilter?: string;
  adminTab?: string;
  isProtected: boolean;
  allowedRoles: UserRole[];
  title: string;
  isNotFound?: boolean;
}

// Normalize any user role string safely
export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'student';
  const clean = role.trim().toLowerCase();
  if (['admin', 'administrator', 'superadmin', 'super-admin'].includes(clean)) {
    return 'admin';
  }
  if (['teacher', 'instructor', 'faculty'].includes(clean)) {
    return 'teacher';
  }
  if (['editor', 'papersetter', 'paper_setter', 'author'].includes(clean)) {
    return 'editor';
  }
  return 'student';
}

// Master Route Directory
export const ROUTE_DEFINITIONS: Record<string, RouteDefinition> = {
  // Public Routes
  '/': {
    path: '/',
    view: 'home',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Home',
  },
  '/home': {
    path: '/home',
    view: 'home',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Home',
  },
  '/search': {
    path: '/search',
    view: 'search',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Search & Discovery',
  },
  '/404': {
    path: '/404',
    view: 'not-found',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Page Not Found (404)',
    isNotFound: true,
  },
  '/boards': {
    path: '/boards',
    view: 'boards',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Educational Boards',
  },
  '/board': {
    path: '/board',
    view: 'boards',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Educational Boards',
  },
  '/education-boards': {
    path: '/education-boards',
    view: 'boards',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Educational Boards',
  },
  '/pakistan-boards': {
    path: '/pakistan-boards',
    view: 'boards',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Educational Boards',
  },
  '/classes': {
    path: '/classes',
    view: 'classes',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Classes & Grades',
  },
  '/subjects': {
    path: '/subjects',
    view: 'subjects',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Subject Directory',
  },
  '/mcqs': {
    path: '/mcqs',
    view: 'mcqs',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'MCQ Bank',
  },
  '/tests': {
    path: '/tests',
    view: 'tests',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Tests & Mock Exams',
  },
  '/quizzes': {
    path: '/quizzes',
    view: 'quizzes',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Quick Quiz Engine',
  },
  '/past-papers': {
    path: '/past-papers',
    view: 'past-papers',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Past Papers',
  },
  '/pastpapers': {
    path: '/pastpapers',
    view: 'past-papers',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Past Papers',
  },
  '/pastpaper': {
    path: '/pastpaper',
    view: 'past-papers',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Past Papers',
  },
  '/past-paper': {
    path: '/past-paper',
    view: 'past-papers',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Past Papers',
  },
  '/notes': {
    path: '/notes',
    view: 'notes',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Study Notes',
  },
  '/study-material': {
    path: '/study-material',
    view: 'notes',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Study Material',
  },
  '/entry-tests': {
    path: '/entry-tests',
    view: 'entry-tests',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Entry Tests (MDCAT & ECAT)',
  },
  '/competitive-exams': {
    path: '/competitive-exams',
    view: 'competitive-exams',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Competitive Exams (CSS & PMS)',
  },
  '/armed-forces': {
    path: '/armed-forces',
    view: 'armed-forces',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Armed Forces Initial E-Tests',
  },
  '/leaderboard': {
    path: '/leaderboard',
    view: 'leaderboard',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'National Leaderboard',
  },
  '/daily-challenge': {
    path: '/daily-challenge',
    view: 'daily-challenge',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Daily Challenge',
  },
  '/video-learning': {
    path: '/video-learning',
    view: 'video-learning',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Video Lectures',
  },
  '/current-affairs': {
    path: '/current-affairs',
    view: 'current-affairs',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Current Affairs',
  },
  '/english-learning': {
    path: '/english-learning',
    view: 'english-learning',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'English Learning',
  },
  '/iq-intelligence': {
    path: '/iq-intelligence',
    view: 'iq-intelligence',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'IQ & Intelligence',
  },
  '/privacy': {
    path: '/privacy',
    view: 'privacy-policy',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Privacy Policy',
  },
  '/privacy-policy': {
    path: '/privacy-policy',
    view: 'privacy-policy',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Privacy Policy',
  },
  '/terms': {
    path: '/terms',
    view: 'terms-of-service',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Terms of Service',
  },
  '/terms-of-service': {
    path: '/terms-of-service',
    view: 'terms-of-service',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Terms of Service',
  },
  '/terms-and-conditions': {
    path: '/terms-and-conditions',
    view: 'terms-of-service',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Terms of Service',
  },
  '/auth/callback': {
    path: '/auth/callback',
    view: 'auth-callback',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Authenticating...',
  },

  // Student Protected Routes (Accessible to authenticated Students, Teachers, Admins)
  '/dashboard': {
    path: '/dashboard',
    view: 'student-dashboard',
    isProtected: true,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Student Dashboard',
  },
  '/student-dashboard': {
    path: '/student-dashboard',
    view: 'student-dashboard',
    isProtected: true,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Student Dashboard',
  },
  '/profile': {
    path: '/profile',
    view: 'student-dashboard',
    subFilter: 'profile',
    isProtected: true,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Student Profile',
  },
  '/results': {
    path: '/results',
    view: 'results',
    subFilter: 'results',
    isProtected: true,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Test Results & Analytics',
  },
  '/attempts': {
    path: '/attempts',
    view: 'results',
    subFilter: 'attempts',
    isProtected: true,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Test Attempt History',
  },
  '/certificates': {
    path: '/certificates',
    view: 'student-dashboard',
    subFilter: 'certificates',
    isProtected: true,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Merit Certificates',
  },
  '/student-login': {
    path: '/student-login',
    view: 'student-dashboard',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Candidate Sign In',
  },
  '/login': {
    path: '/login',
    view: 'student-dashboard',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Candidate Sign In',
  },

  // Admin Entry & Login Routes (Renders AdminLoginPortal when unauthenticated; dashboard when admin)
  '/admin/login': {
    path: '/admin/login',
    view: 'admin-panel',
    adminTab: 'dashboard',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Admin Sign In',
  },
  '/admin-login': {
    path: '/admin-login',
    view: 'admin-panel',
    adminTab: 'dashboard',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Admin Sign In',
  },
  '/admin': {
    path: '/admin',
    view: 'admin-panel',
    adminTab: 'dashboard',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Admin Console',
  },
  '/admin-panel': {
    path: '/admin-panel',
    view: 'admin-panel',
    adminTab: 'dashboard',
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Admin Control Center',
  },
  '/admin/dashboard': {
    path: '/admin/dashboard',
    view: 'admin-panel',
    adminTab: 'dashboard',
    isProtected: true,
    allowedRoles: ['admin'],
    title: 'Admin Dashboard',
  },
  '/admin/users': {
    path: '/admin/users',
    view: 'admin-panel',
    adminTab: 'users',
    isProtected: true,
    allowedRoles: ['admin'],
    title: 'User Management',
  },
  '/admin/questions': {
    path: '/admin/questions',
    view: 'admin-panel',
    adminTab: 'questions',
    isProtected: true,
    allowedRoles: ['admin', 'teacher', 'editor'],
    title: 'Question Bank Management',
  },
  '/admin/mcqs': {
    path: '/admin/mcqs',
    view: 'admin-panel',
    adminTab: 'questions',
    isProtected: true,
    allowedRoles: ['admin', 'teacher', 'editor'],
    title: 'MCQ Bank Manager',
  },
  '/admin/quizzes': {
    path: '/admin/quizzes',
    view: 'admin-panel',
    adminTab: 'quizzes',
    isProtected: true,
    allowedRoles: ['admin', 'teacher', 'editor'],
    title: 'Quiz & Test Builder',
  },
  '/admin/tests': {
    path: '/admin/tests',
    view: 'admin-panel',
    adminTab: 'quizzes',
    isProtected: true,
    allowedRoles: ['admin', 'teacher', 'editor'],
    title: 'Test Management',
  },
  '/admin/notes': {
    path: '/admin/notes',
    view: 'admin-panel',
    adminTab: 'notes',
    isProtected: true,
    allowedRoles: ['admin', 'teacher', 'editor'],
    title: 'Study Notes Manager',
  },
  '/admin/past-papers': {
    path: '/admin/past-papers',
    view: 'admin-panel',
    adminTab: 'past-papers',
    isProtected: true,
    allowedRoles: ['admin', 'teacher', 'editor'],
    title: 'Past Papers Management',
  },
  '/admin/website-command-center': {
    path: '/admin/website-command-center',
    view: 'admin-panel',
    adminTab: 'website-command-center',
    isProtected: true,
    allowedRoles: ['admin'],
    title: 'Website Command Center',
  },
  '/admin/command-center': {
    path: '/admin/command-center',
    view: 'admin-panel',
    adminTab: 'website-command-center',
    isProtected: true,
    allowedRoles: ['admin'],
    title: 'Website Command Center',
  },
  '/admin/settings': {
    path: '/admin/settings',
    view: 'admin-panel',
    adminTab: 'settings',
    isProtected: true,
    allowedRoles: ['admin'],
    title: 'Platform Settings',
  },
  '/admin/site-settings': {
    path: '/admin/site-settings',
    view: 'admin-panel',
    adminTab: 'settings',
    isProtected: true,
    allowedRoles: ['admin'],
    title: 'Platform Settings',
  },
  '/admin/boards': {
    path: '/admin/boards',
    view: 'admin-panel',
    adminTab: 'boards',
    isProtected: true,
    allowedRoles: ['admin'],
    title: 'Board Settings',
  },
  '/admin/classes': {
    path: '/admin/classes',
    view: 'admin-panel',
    adminTab: 'classes',
    isProtected: true,
    allowedRoles: ['admin'],
    title: 'Class Curriculum Manager',
  },
  '/admin/subjects': {
    path: '/admin/subjects',
    view: 'admin-panel',
    adminTab: 'subjects',
    isProtected: true,
    allowedRoles: ['admin'],
    title: 'Subject Manager',
  },
  '/admin/results': {
    path: '/admin/results',
    view: 'admin-panel',
    adminTab: 'results',
    isProtected: true,
    allowedRoles: ['admin'],
    title: 'Global Results Audit',
  },
  '/admin/bulk-import': {
    path: '/admin/bulk-import',
    view: 'admin-panel',
    adminTab: 'bulk-import',
    isProtected: true,
    allowedRoles: ['admin', 'teacher'],
    title: 'Bulk Data Importer',
  },
  '/teacher-panel': {
    path: '/teacher-panel',
    view: 'teacher-panel',
    adminTab: 'questions',
    isProtected: true,
    allowedRoles: ['admin', 'teacher'],
    title: 'Teacher & Setter Portal',
  },
};

// Normalize raw URL path or hash string
export function normalizePath(rawPath: string): string {
  if (!rawPath) return '/';
  let clean = rawPath.trim();
  // Strip leading hash
  if (clean.startsWith('#')) {
    clean = clean.substring(1);
  }
  // Convert query parameters if present (e.g., ?class=10&subject=physics or ?category=css or ?category=armed-forces) into path segments
  const queryIndex = clean.indexOf('?');
  if (queryIndex !== -1) {
    const queryStr = clean.substring(queryIndex + 1);
    clean = clean.substring(0, queryIndex);
    try {
      const searchParams = new URLSearchParams(queryStr);
      const qClass = searchParams.get('class') || searchParams.get('classLevel') || searchParams.get('grade');
      const qSubject = searchParams.get('subject');
      const qCategory = searchParams.get('category') || searchParams.get('tab') || searchParams.get('type') || searchParams.get('exam');

      if (clean === '/entry-tests' && qCategory && qCategory !== 'All' && qCategory !== 'all') {
        clean = `/entry-tests/${qCategory.toLowerCase().replace(/ /g, '-')}`;
      } else if (clean === '/competitive-exams' && qCategory && qCategory !== 'All' && qCategory !== 'all') {
        clean = `/competitive-exams/${qCategory.toLowerCase().replace(/ /g, '-')}`;
      } else {
        const normC = qClass && qClass !== 'All' ? normalizeClassLevel(qClass) : null;
        const normS = qSubject && qSubject !== 'All' ? normalizeSubjectName(qSubject) : null;
        if (normC && normC !== 'All' && normS && normS !== 'All') {
          clean = `${clean}/${normC.toLowerCase().replace(/ /g, '-')}/${normS.toLowerCase().replace(/ /g, '-')}`;
        } else if (normC && normC !== 'All') {
          clean = `${clean}/${normC.toLowerCase().replace(/ /g, '-')}`;
        } else if (normS && normS !== 'All') {
          clean = `${clean}/${normS.toLowerCase().replace(/ /g, '-')}`;
        }
      }
    } catch (e) {}
  }
  // Ensure leading slash
  if (!clean.startsWith('/')) {
    clean = '/' + clean;
  }
  // Strip trailing slash unless root
  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.substring(0, clean.length - 1);
  }
  return clean.toLowerCase();
}

// Resolve route config from path
export function resolveRoute(rawPath: string): RouteDefinition {
  const normalized = normalizePath(rawPath);
  
  if (ROUTE_DEFINITIONS[normalized]) {
    return ROUTE_DEFINITIONS[normalized];
  }

  // Check prefix matches for nested admin routes
  if (normalized.startsWith('/admin')) {
    const rawTab = normalized.replace('/admin/', '').replace('/admin', '') || 'dashboard';
    const adminTab = rawTab === 'site-settings' ? 'settings' : rawTab;
    return {
      path: normalized,
      view: 'admin-panel' as ViewMode,
      adminTab,
      isProtected: true,
      allowedRoles: ['admin'],
      title: 'Admin Console',
    };
  }

  // Dynamic Boards sub-routes
  if (normalized.startsWith('/boards/') || normalized.startsWith('/board/')) {
    const rawFilter = normalized.replace(/^\/(boards|board)\//, '').trim();
    const upper = rawFilter.toUpperCase();
    const subFilter = upper === 'KPK' ? 'KPK' :
                      upper === 'AJK' ? 'AJK' :
                      upper === 'FBISE' ? 'Federal' :
                      rawFilter.charAt(0).toUpperCase() + rawFilter.slice(1);
    return {
      path: normalized,
      view: 'boards' as ViewMode,
      subFilter: subFilter || undefined,
      isProtected: false,
      allowedRoles: ['student', 'admin', 'teacher', 'editor'],
      title: `${subFilter ? subFilter + ' ' : ''}Educational Boards`,
    };
  }

  // Dynamic Past Papers sub-routes (supports /past-papers/class-10/physics, /past-papers/physics, /past-papers/class-10, JSON payloads)
  if (normalized.startsWith('/past-papers/') || normalized.startsWith('/pastpapers/')) {
    const rawFilter = decodeURIComponent(normalized.replace(/^\/(past-papers|pastpapers)\//, '').trim());
    const parsedCtx = parseNavContext(rawFilter);
    const subFilter = buildNavContextString(parsedCtx.subject, parsedCtx.classLevel, parsedCtx.board);

    let title = 'Past Papers';
    if (parsedCtx.classLevel !== 'All' && parsedCtx.subject !== 'All') {
      title = `${parsedCtx.classLevel} ${parsedCtx.subject} Past Papers`;
    } else if (parsedCtx.subject !== 'All') {
      title = `${parsedCtx.subject} Past Papers`;
    } else if (parsedCtx.classLevel !== 'All') {
      title = `${parsedCtx.classLevel} Past Papers`;
    } else if (parsedCtx.board !== 'All') {
      title = `${parsedCtx.board} Past Papers`;
    }

    return {
      path: normalized,
      view: 'past-papers' as ViewMode,
      subFilter: subFilter !== 'All' ? subFilter : undefined,
      isProtected: false,
      allowedRoles: ['student', 'admin', 'teacher', 'editor'],
      title,
    };
  }

  // Dynamic Entry tests sub-routes
  if (normalized.startsWith('/entry-tests/')) {
    const rawFilter = decodeURIComponent(normalized.replace('/entry-tests/', '').trim());
    const cleanLower = rawFilter.toLowerCase().replace(/[-_]/g, ' ');
    let subFilter = rawFilter;
    if (cleanLower === 'mdcat' || cleanLower === 'nums' || cleanLower.includes('medical')) subFilter = 'MDCAT';
    else if (cleanLower === 'ecat' || cleanLower.includes('engineering')) subFilter = 'ECAT';
    else if (cleanLower === 'css' || cleanLower.includes('civil')) subFilter = 'CSS';
    else if (cleanLower === 'pms') subFilter = 'PMS';
    else if (cleanLower === 'armed forces' || cleanLower.includes('armed') || cleanLower.includes('defense') || cleanLower.includes('army') || cleanLower.includes('navy') || cleanLower.includes('paf')) subFilter = 'Armed Forces';
    else subFilter = rawFilter.charAt(0).toUpperCase() + rawFilter.slice(1);

    return {
      path: normalized,
      view: 'entry-tests' as ViewMode,
      subFilter,
      isProtected: false,
      allowedRoles: ['student', 'admin', 'teacher', 'editor'],
      title: `${subFilter} Entry Test Preparation`,
    };
  }

  // Dynamic Classes sub-routes
  if (normalized.startsWith('/classes/')) {
    const rawFilter = normalized.replace('/classes/', '').trim();
    const formattedClass = rawFilter.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
    return {
      path: normalized,
      view: 'classes' as ViewMode,
      subFilter: formattedClass,
      isProtected: false,
      allowedRoles: ['student', 'admin', 'teacher', 'editor'],
      title: `${formattedClass} Syllabus`,
    };
  }

  // Dynamic Notes sub-routes (supports /notes/class-10/physics, /notes/physics, /notes/class-10, JSON payloads)
  if (normalized.startsWith('/notes/') || normalized.startsWith('/study-material/')) {
    const rawFilter = decodeURIComponent(normalized.replace(/^\/(notes|study-material)\//, '').trim());
    const parsedCtx = parseNavContext(rawFilter);
    const subFilter = buildNavContextString(parsedCtx.subject, parsedCtx.classLevel, parsedCtx.board);

    let title = 'Study Notes';
    if (parsedCtx.classLevel !== 'All' && parsedCtx.subject !== 'All') {
      title = `${parsedCtx.classLevel} ${parsedCtx.subject} Study Notes`;
    } else if (parsedCtx.subject !== 'All') {
      title = `${parsedCtx.subject} Study Notes`;
    } else if (parsedCtx.classLevel !== 'All') {
      title = `${parsedCtx.classLevel} Study Notes`;
    }

    return {
      path: normalized,
      view: 'notes' as ViewMode,
      subFilter: subFilter !== 'All' ? subFilter : undefined,
      isProtected: false,
      allowedRoles: ['student', 'admin', 'teacher', 'editor'],
      title,
    };
  }

  // Dynamic MCQs sub-routes
  if (normalized.startsWith('/mcqs/')) {
    const rawFilter = decodeURIComponent(normalized.replace('/mcqs/', '').trim());
    const parsedCtx = parseNavContext(rawFilter);
    const subFilter = buildNavContextString(parsedCtx.subject, parsedCtx.classLevel, parsedCtx.board);

    let title = 'MCQ Bank';
    if (parsedCtx.classLevel !== 'All' && parsedCtx.subject !== 'All') {
      title = `${parsedCtx.classLevel} ${parsedCtx.subject} MCQs`;
    } else if (parsedCtx.subject !== 'All') {
      title = `${parsedCtx.subject} MCQs`;
    } else if (parsedCtx.classLevel !== 'All') {
      title = `${parsedCtx.classLevel} MCQs`;
    }

    return {
      path: normalized,
      view: 'mcqs' as ViewMode,
      subFilter: subFilter !== 'All' ? subFilter : undefined,
      isProtected: false,
      allowedRoles: ['student', 'admin', 'teacher', 'editor'],
      title,
    };
  }

  // Dynamic Subjects sub-routes
  if (normalized.startsWith('/subjects/')) {
    const rawFilter = decodeURIComponent(normalized.replace('/subjects/', '').trim());
    const parsedCtx = parseNavContext(rawFilter);
    const subFilter = buildNavContextString(parsedCtx.subject, parsedCtx.classLevel, parsedCtx.board);

    let title = 'Subjects Directory';
    if (parsedCtx.classLevel !== 'All' && parsedCtx.subject !== 'All') {
      title = `${parsedCtx.classLevel} ${parsedCtx.subject} Resources`;
    } else if (parsedCtx.subject !== 'All') {
      title = `${parsedCtx.subject} Study Resources`;
    } else if (parsedCtx.classLevel !== 'All') {
      title = `${parsedCtx.classLevel} Subjects`;
    }

    return {
      path: normalized,
      view: 'subjects' as ViewMode,
      subFilter: subFilter !== 'All' ? subFilter : undefined,
      isProtected: false,
      allowedRoles: ['student', 'admin', 'teacher', 'editor'],
      title,
    };
  }

  // Dynamic Syllabus sub-routes
  if (normalized.startsWith('/syllabus/')) {
    const rawFilter = decodeURIComponent(normalized.replace('/syllabus/', '').trim());
    const formattedSub = rawFilter.startsWith('{') ? rawFilter : (rawFilter.charAt(0).toUpperCase() + rawFilter.slice(1));
    return {
      path: normalized,
      view: 'syllabus' as ViewMode,
      subFilter: formattedSub,
      isProtected: false,
      allowedRoles: ['student', 'admin', 'teacher', 'editor'],
      title: `${formattedSub} Syllabus`,
    };
  }

  // Fallback to 404 Not Found
  return {
    path: normalized,
    view: 'not-found' as ViewMode,
    isProtected: false,
    allowedRoles: ['student', 'admin', 'teacher', 'editor'],
    title: 'Page Not Found (404)',
    isNotFound: true,
  };
}

// Convert a ViewMode and optional subFilter/adminTab to a canonical URL path
export function viewToCanonicalPath(view: ViewMode, subFilter?: string, adminTab?: string): string {
  if (view === 'home') return '/';
  if (view === 'not-found') return '/404';
  if (view === 'admin-panel' || view === 'teacher-panel') {
    if (adminTab && adminTab !== 'dashboard') {
      return `/admin/${adminTab}`;
    }
    return '/admin';
  }
  if (view === 'student-dashboard') {
    if (subFilter === 'profile') return '/profile';
    if (subFilter === 'certificates') return '/certificates';
    return '/dashboard';
  }
  if (view === 'results') {
    if (subFilter === 'attempts') return '/attempts';
    return '/results';
  }
  if (view === 'privacy-policy') return '/privacy-policy';
  if (view === 'terms-of-service') return '/terms-of-service';
  if (view === 'auth-callback') return '/auth/callback';
  if (view === 'search') {
    if (subFilter) return `/search?q=${encodeURIComponent(subFilter)}`;
    return '/search';
  }
  
  // Dynamic routes with subFilter
  if (subFilter) {
    const parsed = parseNavContext(subFilter);
    const cSlug = parsed.classLevel !== 'All' ? parsed.classLevel.toLowerCase().replace(/ /g, '-') : null;
    const sSlug = parsed.subject !== 'All' ? parsed.subject.toLowerCase().replace(/ /g, '-') : null;
    const bSlug = parsed.board !== 'All' ? parsed.board.toLowerCase().replace(/ /g, '-') : null;

    if (view === 'past-papers') {
      if (cSlug && sSlug) return `/past-papers/${cSlug}/${sSlug}`;
      if (sSlug) return `/past-papers/${sSlug}`;
      if (cSlug) return `/past-papers/${cSlug}`;
      if (bSlug) return `/past-papers/${bSlug}`;
    }

    if (view === 'notes') {
      if (cSlug && sSlug) return `/notes/${cSlug}/${sSlug}`;
      if (sSlug) return `/notes/${sSlug}`;
      if (cSlug) return `/notes/${cSlug}`;
      if (bSlug) return `/notes/${bSlug}`;
    }

    if (view === 'subjects') {
      if (cSlug && sSlug) return `/subjects/${cSlug}/${sSlug}`;
      if (sSlug) return `/subjects/${sSlug}`;
      if (cSlug) return `/subjects/${cSlug}`;
    }

    if (view === 'mcqs') {
      if (cSlug && sSlug) return `/mcqs/${cSlug}/${sSlug}`;
      if (sSlug) return `/mcqs/${sSlug}`;
      if (cSlug) return `/mcqs/${cSlug}`;
    }

    if (subFilter.startsWith('{') && subFilter.endsWith('}')) {
      const encoded = encodeURIComponent(subFilter);
      if (view === 'boards') return `/boards/${encoded}`;
      if (view === 'classes') return `/classes/${encoded}`;
      if (view === 'syllabus') return `/syllabus/${encoded}`;
      if (view === 'entry-tests') return `/entry-tests/${encoded}`;
      if (view === 'competitive-exams') return `/competitive-exams/${encoded}`;
    }
    const formattedSub = subFilter.toLowerCase().replace(/ /g, '-');
    if (view === 'boards') return `/boards/${formattedSub}`;
    if (view === 'classes') return `/classes/${formattedSub}`;
    if (view === 'syllabus') return `/syllabus/${formattedSub}`;
    if (view === 'entry-tests') return `/entry-tests/${formattedSub}`;
    if (view === 'competitive-exams') return `/competitive-exams/${formattedSub}`;
  }
  
  return `/${view}`;
}

// Evaluate access for a user on a given path
export function evaluateAccess(
  path: string,
  user: StudentProfile | AdminUser | null,
  isAuthenticated: boolean
): RouteAuthResult {
  const route = resolveRoute(path);

  // If public route, instantly authorized
  if (!route.isProtected) {
    return {
      isAllowed: true,
      status: 'AUTHORIZED',
      path: route.path,
      requiredRoles: route.allowedRoles,
      currentRole: user ? normalizeRole(user.roles ? user.roles[0] : (user as any).role) : null,
    };
  }

  // If protected and not authenticated
  if (!isAuthenticated || !user) {
    return {
      isAllowed: false,
      status: 'UNAUTHENTICATED',
      path: route.path,
      requiredRoles: route.allowedRoles,
      currentRole: null,
      message: `Authentication required to access ${route.title} (${route.path}). Please log in.`,
    };
  }

  // Determine user's normalized roles from verified profile
  const rawRoles = (user.roles && user.roles.length > 0) ? user.roles : [(user as any).role || 'Student'];
  const normalizedRoles = rawRoles.map((r) => normalizeRole(r));

  // Check if ANY of the user's assigned roles is in the allowedRoles list
  const hasPermission = normalizedRoles.some((r) => route.allowedRoles.includes(r));
  const primaryRole = normalizedRoles.includes('admin')
    ? 'admin'
    : (normalizedRoles.includes('teacher') ? 'teacher' : (normalizedRoles.includes('editor') ? 'editor' : 'student'));

  if (!hasPermission) {
    return {
      isAllowed: false,
      status: 'FORBIDDEN',
      path: route.path,
      requiredRoles: route.allowedRoles,
      currentRole: primaryRole,
      message: `Access Denied: You are signed in as [${rawRoles.join(', ')}], but this section requires ${route.allowedRoles.map(r => r.toUpperCase()).join(' or ')} privileges.`,
    };
  }

  return {
    isAllowed: true,
    status: 'AUTHORIZED',
    path: route.path,
    requiredRoles: route.allowedRoles,
    currentRole: primaryRole,
  };
}

// Read current browser path from window
export function getBrowserPath(): string {
  if (typeof window === 'undefined') return '/';
  
  // Detect if hash contains OAuth tokens, refresh tokens, or auth error payloads from Supabase
  const rawHash = window.location.hash || '';
  const isAuthFragment =
    rawHash.includes('access_token=') ||
    rawHash.includes('refresh_token=') ||
    rawHash.includes('error=') ||
    rawHash.includes('error_description=') ||
    rawHash.includes('type=recovery') ||
    rawHash.includes('type=signup') ||
    rawHash.includes('type=invite');

  // If hash is an auth payload, do not treat it as a page route path!
  if (isAuthFragment) {
    return normalizePath(window.location.pathname);
  }

  // Prefer hash route if present (e.g. /#/admin/users or #/dashboard) for universal SPA compatibility
  if (rawHash.length > 1 && (rawHash.startsWith('#/') || !rawHash.includes('='))) {
    return normalizePath(rawHash);
  }
  
  // Include search/query params if present on window.location
  const full = window.location.pathname + (window.location.search || '');
  return normalizePath(full);
}

// Update browser address bar and history without reloading
export function updateBrowserUrl(path: string, replace = false): void {
  if (typeof window === 'undefined') return;
  
  // If current URL contains auth tokens that are still being processed by Supabase, do not overwrite UNLESS replace is true
  const rawHash = window.location.hash || '';
  if (!replace && (rawHash.includes('access_token=') || rawHash.includes('refresh_token='))) {
    return;
  }

  const cleanPath = normalizePath(path);
  const hashPath = `#${cleanPath}`;

  try {
    if (replace) {
      window.history.replaceState({ path: cleanPath }, '', cleanPath);
    } else {
      window.history.pushState({ path: cleanPath }, '', cleanPath);
    }
  } catch (e) {
    // If pushState is restricted in iframe, update window.location.hash safely
    window.location.hash = hashPath;
  }
}
