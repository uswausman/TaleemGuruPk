import type { ViewMode } from '../types.ts';
import { CANONICAL_PRODUCTION_DOMAIN, getCanonicalUrl } from './config.ts';

export interface RouteSeoConfig {
  title: string;
  description: string;
  canonicalPath: string;
  keywords: string[];
  schemaType: 'EducationalOrganization' | 'Quiz' | 'Course' | 'ItemPage' | 'Article';
  isPublic: boolean;
}

export const ROUTE_SEO_REGISTRY: Record<string, RouteSeoConfig> = {
  home: {
    title: 'TALEEM GURU - Learn. Practice. Test. Improve. | Pakistan Online Tests & MCQs',
    description:
      'Pakistan’s leading online test & quiz platform for 9th, 10th, 11th, 12th Matric & Intermediate BISE Board exams, MDCAT, ECAT, CSS, Armed Forces, and comprehensive solved past papers.',
    canonicalPath: '/',
    keywords: [
      'Pakistan education',
      'Board exams',
      'MCQs online test',
      'Matric preparation',
      '9th class',
      '10th class',
      '11th class',
      '12th class',
      'Punjab Board',
      'Federal Board',
      'Past papers',
      'Educational notes',
      'MDCAT mock test',
      'ECAT entry test',
    ],
    schemaType: 'EducationalOrganization',
    isPublic: true,
  },
  tests: {
    title: 'Online Chapter Tests & Quizzes for Class 9, 10, 11, 12 | Taleem Guru',
    description:
      'Take timed online tests and quizzes for Matric and Inter BISE Punjab, Federal, Sindh, and KPK boards with instant scoring, negative marking, and detailed answer keys.',
    canonicalPath: '/tests',
    keywords: ['Online quizzes', 'Chapter tests', 'Board exams preparation', 'Mock tests Pakistan', 'Self assessment'],
    schemaType: 'Quiz',
    isPublic: true,
  },
  mcqs: {
    title: 'Solved MCQ Bank with Explanations - Matric & Intermediate | Taleem Guru',
    description:
      'Search over 10,000+ board-verified multiple choice questions with step-by-step solutions for Physics, Chemistry, Biology, Mathematics, and Computer Science.',
    canonicalPath: '/mcqs',
    keywords: ['MCQ Bank', 'Solved MCQs', 'Past paper MCQs', 'Matric MCQs', 'FSc MCQs', 'MDCAT MCQs'],
    schemaType: 'Course',
    isPublic: true,
  },
  boards: {
    title: 'All Pakistan Education Boards Directory - BISE & FBISE | Taleem Guru',
    description:
      'Find past papers, date sheets, roll number slips, and chapter tests for all BISE Punjab, Federal Board Islamabad, Sindh, KPK, Balochistan, and AJK boards.',
    canonicalPath: '/boards',
    keywords: ['Punjab Board', 'BISE Lahore', 'Federal Board', 'FBISE Islamabad', 'BISE Rawalpindi', 'Sindh Board'],
    schemaType: 'EducationalOrganization',
    isPublic: true,
  },
  classes: {
    title: 'Class 9, 10, 11, 12 Academic Portals & Syllabus | Taleem Guru',
    description:
      'Grade-specific preparation hubs for Class 9 (SSC-I), Class 10 (SSC-II), Class 11 (HSSC-I), and Class 12 (HSSC-II) with chapter-wise MCQs, notes, and past papers.',
    canonicalPath: '/classes',
    keywords: ['9th class', '10th class', '11th class', '12th class', 'SSC Part 1', 'HSSC Part 2', 'FSc Pre Medical'],
    schemaType: 'Course',
    isPublic: true,
  },
  subjects: {
    title: 'Academic Subjects Catalog - Science, Arts & Compulsory | Taleem Guru',
    description:
      'Browse Physics, Chemistry, Biology, Mathematics, Computer Science, English, Urdu, Pakistan Studies, and Islamiat preparation materials.',
    canonicalPath: '/subjects',
    keywords: ['Physics MCQs', 'Chemistry notes', 'Biology past papers', 'Mathematics formulas', 'Computer Science syllabus'],
    schemaType: 'Course',
    isPublic: true,
  },
  notes: {
    title: 'High-Yield Educational Notes & Formula Sheets | Taleem Guru',
    description:
      'Download authentic PDF chapter notes, short questions, long questions, definitions, and formula sheets for Pakistani school and college examinations.',
    canonicalPath: '/notes',
    keywords: ['Educational notes', 'Physics formula sheet', 'Short questions solved', 'Class 10 notes', 'FSc notes PDF'],
    schemaType: 'Course',
    isPublic: true,
  },
  'past-papers': {
    title: '10-Year Solved Past Papers Archive for All Boards | Taleem Guru',
    description:
      'Download and practice 10-year past examination papers for BISE Lahore, FBISE Islamabad, Karachi Board, and more with verified answer keys.',
    canonicalPath: '/past-papers',
    keywords: ['Past papers', 'BISE Lahore past papers', 'FBISE past papers', 'Solved matric papers', '10 year past papers'],
    schemaType: 'Course',
    isPublic: true,
  },
  search: {
    title: 'Search Educational Content - MCQs, Tests, Past Papers & Notes | Taleem Guru',
    description:
      'Search across thousands of verified MCQs, online tests, solved past papers, study notes, and educational documents for Matric, Inter, MDCAT, and ECAT.',
    canonicalPath: '/search',
    keywords: ['Search MCQs', 'Search past papers', 'Online tests Pakistan', 'Study notes search', 'Taleem Guru search'],
    schemaType: 'ItemPage',
    isPublic: true,
  },
  'entry-tests': {
    title: 'MDCAT, ECAT, NUMS, NUST & GIKI Entry Test Preparation | Taleem Guru',
    description:
      'Crack medical and engineering entrance exams in Pakistan with full-length syllabus mock tests, past papers, and national percentile ranking.',
    canonicalPath: '/entry-tests',
    keywords: ['MDCAT preparation', 'ECAT test practice', 'NUMS mock exam', 'UHS past papers', 'NUST NET preparation'],
    schemaType: 'Quiz',
    isPublic: true,
  },
  'competitive-exams': {
    title: 'CSS & PMS Competitive Exams Preparation Portal | Taleem Guru',
    description:
      'FPSC CSS Screening MPT and PPSC PMS general knowledge, Pakistan affairs, current affairs, Islamic studies, and everyday science MCQ tests.',
    canonicalPath: '/competitive-exams',
    keywords: ['CSS preparation', 'FPSC MPT screening test', 'PMS past papers', 'General Knowledge MCQs', 'Pakistan affairs'],
    schemaType: 'Course',
    isPublic: true,
  },
  'armed-forces': {
    title: 'Pakistan Armed Forces Initial Test Preparation (Army, Navy, PAF) | Taleem Guru',
    description:
      'Prepare for PMA Long Course, PAF GDP, and Pak Navy cadet tests with verbal, non-verbal intelligence, and academic test simulator.',
    canonicalPath: '/armed-forces',
    keywords: ['PMA Long Course', 'Army initial test', 'Verbal intelligence test', 'Non verbal test', 'PAF GDP test'],
    schemaType: 'Quiz',
    isPublic: true,
  },
  leaderboard: {
    title: 'National Student Merit Leaderboard & Rankings | Taleem Guru',
    description:
      'View weekly, monthly, and all-time student rankings across Pakistan based on quiz accuracy, test scores, and learning streaks.',
    canonicalPath: '/leaderboard',
    keywords: ['Student leaderboard', 'National rankings', 'Merit list Pakistan', 'Quiz competition', 'Taleem Guru top scorers'],
    schemaType: 'ItemPage',
    isPublic: true,
  },
  'privacy-policy': {
    title: 'Privacy Policy - Student Data & Academic Protection | Taleem Guru Pakistan',
    description:
      'Review the Privacy Policy for Taleem Guru Pakistan. Learn how we safeguard student account credentials, test results, performance analytics, and merit certificates.',
    canonicalPath: '/privacy-policy',
    keywords: ['Privacy policy', 'Taleem Guru privacy', 'Student data protection', 'Academic privacy Pakistan', 'Educational data security'],
    schemaType: 'ItemPage',
    isPublic: true,
  },
  'terms-of-service': {
    title: 'Terms of Service - Academic Integrity & Testing Agreement | Taleem Guru Pakistan',
    description:
      'Terms of Service for Taleem Guru Pakistan. Understanding candidate rights, permissible test engine usage, merit certificate verification, and examination conduct.',
    canonicalPath: '/terms-of-service',
    keywords: ['Terms of service', 'Taleem Guru terms', 'Academic integrity', 'Test rules Pakistan', 'Certificate verification rules'],
    schemaType: 'ItemPage',
    isPublic: true,
  },
  'not-found': {
    title: 'Page Not Found (404) | Taleem Guru Pakistan',
    description: 'The requested educational page, test, or study note does not exist or has been relocated.',
    canonicalPath: '/404',
    keywords: ['404 not found', 'Taleem Guru'],
    schemaType: 'ItemPage',
    isPublic: false,
  },
  // Private / Authenticated Views
  'student-dashboard': {
    title: 'Student Dashboard | Taleem Guru',
    description: 'Personalized student learning analytics, test attempts, and bookmark repository.',
    canonicalPath: '/dashboard',
    keywords: ['Student dashboard'],
    schemaType: 'ItemPage',
    isPublic: false,
  },
  'admin-panel': {
    title: 'Admin Control Center | Taleem Guru',
    description: 'Administrative platform management, question banking, and moderation center.',
    canonicalPath: '/admin',
    keywords: ['Admin panel'],
    schemaType: 'ItemPage',
    isPublic: false,
  },
  'teacher-panel': {
    title: 'Teacher Evaluation Portal | Taleem Guru',
    description: 'Instructor dashboard for managing student assessments and question verification.',
    canonicalPath: '/admin',
    keywords: ['Teacher panel'],
    schemaType: 'ItemPage',
    isPublic: false,
  },
  'access-denied': {
    title: 'Access Restricted | Taleem Guru',
    description: 'Unauthorized access. Authentication with required role credentials is required.',
    canonicalPath: '/access-denied',
    keywords: ['Access restricted'],
    schemaType: 'ItemPage',
    isPublic: false,
  },
  'test-session': {
    title: 'Live Online Examination | Taleem Guru',
    description: 'Timed online exam simulation in progress.',
    canonicalPath: '/tests',
    keywords: ['Test session'],
    schemaType: 'Quiz',
    isPublic: false,
  },
  'quiz-session': {
    title: 'Live Quiz Session | Taleem Guru',
    description: 'Timed interactive quiz attempt in progress.',
    canonicalPath: '/quizzes',
    keywords: ['Quiz session'],
    schemaType: 'Quiz',
    isPublic: false,
  },
  results: {
    title: 'Examination Result & Performance Breakdown | Taleem Guru',
    description: 'Detailed candidate score report and performance diagnostics.',
    canonicalPath: '/results',
    keywords: ['Test results'],
    schemaType: 'ItemPage',
    isPublic: false,
  },
  certificates: {
    title: 'Merit Certificates Repository | Taleem Guru',
    description: 'Download verified merit certificates and score cards.',
    canonicalPath: '/certificates',
    keywords: ['Certificates'],
    schemaType: 'ItemPage',
    isPublic: false,
  },
  'verify-certificate': {
    title: 'Verify Certificate Authenticity | Taleem Guru',
    description: 'Validate authentic Taleem Guru examination certificates using QR verification codes.',
    canonicalPath: '/verify',
    keywords: ['Verify certificate'],
    schemaType: 'ItemPage',
    isPublic: true,
  },
};

/**
 * List of private or authenticated views that must ALWAYS be noindex.
 */
export const PRIVATE_NOINDEX_VIEWS = new Set<string>([
  'student-dashboard',
  'admin-panel',
  'teacher-panel',
  'access-denied',
  'test-session',
  'quiz-session',
  'results',
  'certificates',
  'auth-callback',
  'not-found',
]);

/**
 * Determine authoritative robots meta directive.
 * Strict rules:
 * 1. 404 or Not Found -> noindex, nofollow
 * 2. Empty Content pages -> noindex, follow (preserves link equity, prevents thin content indexing)
 * 3. Search query pages -> noindex, follow (prevents infinite search query crawl traps)
 * 4. Private / Authenticated views -> noindex, nofollow
 * 5. Content status !== 'Published' (e.g. Draft, Pending Review, Approved, Rejected, Archived) -> noindex, nofollow
 * 6. Published public educational content -> index, follow
 */
export function determineRobotsDirective(options: {
  view: ViewMode | string;
  contentStatus?: string | null;
  isNotFound?: boolean;
  isEmptyContent?: boolean;
  hasSearchQuery?: boolean;
}): string {
  const { view, contentStatus, isNotFound, isEmptyContent, hasSearchQuery } = options;

  // 1. Not Found
  if (isNotFound || view === 'not-found') {
    return 'noindex, nofollow';
  }

  // 2. Private or Session views
  if (PRIVATE_NOINDEX_VIEWS.has(view)) {
    return 'noindex, nofollow';
  }

  // 3. Status Check: ONLY Published content is indexable!
  // Any Draft, Pending Review, Approved, Rejected, or Archived content MUST be noindex.
  if (contentStatus) {
    const normalizedStatus = contentStatus.trim().toLowerCase();
    if (normalizedStatus !== 'published') {
      return 'noindex, nofollow';
    }
  }

  // 4. Empty content on dynamic query/filter
  if (isEmptyContent) {
    return 'noindex, follow';
  }

  // 5. Internal search query pages (prevent duplicate parameter indexing)
  if (hasSearchQuery || (view === 'search' && options.hasSearchQuery)) {
    return 'noindex, follow';
  }

  // 6. Confirmed Published & Public Route
  const routeCfg = ROUTE_SEO_REGISTRY[view];
  if (routeCfg && !routeCfg.isPublic) {
    return 'noindex, nofollow';
  }

  return 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
}

/**
 * Build dynamic title for route and optional subfilter/category.
 */
export function buildDynamicTitle(
  view: ViewMode | string,
  subFilter?: string,
  customTitle?: string
): string {
  if (customTitle) return customTitle;

  const base = ROUTE_SEO_REGISTRY[view] || ROUTE_SEO_REGISTRY.home;
  if (!subFilter) return base.title;

  const cleanFilter = subFilter.trim();
  switch (view) {
    case 'boards':
      return `${cleanFilter} BISE Board - Model Papers, Syllabi & Past Papers | Taleem Guru`;
    case 'classes':
      return `${cleanFilter} Syllabus, Chapter MCQs & Solved Papers | Taleem Guru`;
    case 'subjects':
      return `${cleanFilter} Solved MCQs, Notes & Online Chapter Tests | Taleem Guru`;
    case 'past-papers':
      return `${cleanFilter} Solved Past Papers with Answer Keys | Taleem Guru`;
    case 'notes':
      return `${cleanFilter} Chapter Study Notes & Formula Sheets | Taleem Guru`;
    case 'mcqs':
      return `${cleanFilter} Chapter MCQs Bank with Solutions | Taleem Guru`;
    case 'entry-tests':
      return `${cleanFilter} Syllabus Mocks & Past Papers | Taleem Guru`;
    case 'search':
      return `Search: "${cleanFilter}" - Educational Results | Taleem Guru`;
    default:
      return `${cleanFilter} - ${base.title}`;
  }
}

/**
 * Build dynamic description for route and optional subfilter.
 */
export function buildDynamicDescription(
  view: ViewMode | string,
  subFilter?: string,
  customDescription?: string
): string {
  if (customDescription) return customDescription;

  const base = ROUTE_SEO_REGISTRY[view] || ROUTE_SEO_REGISTRY.home;
  if (!subFilter) return base.description;

  const cleanFilter = subFilter.trim();
  switch (view) {
    case 'boards':
      return `Access verified past papers, chapter tests, model exams, and date sheet notices for ${cleanFilter} across all Matric & Inter grades on Taleem Guru.`;
    case 'classes':
      return `Complete curriculum preparation for ${cleanFilter} students in Pakistan. Chapter-wise MCQs, revision notes, and board past papers on Taleem Guru.`;
    case 'subjects':
      return `Comprehensive syllabus preparation for ${cleanFilter}. Practice chapter MCQs, download formula sheets, and take timed online assessments on Taleem Guru.`;
    case 'past-papers':
      return `Download 10-year past examination papers and answer keys for ${cleanFilter} with step-by-step verified solutions on Taleem Guru.`;
    case 'notes':
      return `High-yield chapter notes, definitions, formula summaries, and solved short questions for ${cleanFilter} on Taleem Guru.`;
    case 'mcqs':
      return `Extensive collection of board-verified multiple choice questions for ${cleanFilter} with explanations on Taleem Guru.`;
    default:
      return `Educational resources, tests, past papers, and notes for ${cleanFilter} on Taleem Guru Pakistan.`;
  }
}

/**
 * Generate Schema.org structured data strictly grounded in real content.
 * NEVER creates fake ratings, fake reviews, fake stars, or fake student counts.
 */
export function generateSchemaGraph(options: {
  view: ViewMode | string;
  canonicalUrl: string;
  title: string;
  description: string;
  subFilter?: string;
  activeItem?: {
    id: string;
    title: string;
    description?: string;
    status?: string;
    subject?: string;
    classLevel?: string;
    board?: string;
    durationMinutes?: number;
    totalQuestions?: number;
    year?: number;
    type?: string;
  } | null;
}) {
  const { view, canonicalUrl, title, description, subFilter, activeItem } = options;
  const baseUrl = CANONICAL_PRODUCTION_DOMAIN;

  // 1. Authoritative EducationalOrganization (No fake reviews or ratings)
  const organizationNode = {
    '@type': 'EducationalOrganization',
    '@id': `${baseUrl}/#organization`,
    name: 'Taleem Guru',
    url: baseUrl,
    logo: `${baseUrl}/vite.svg`,
    description: 'Pakistan’s Smart Online Test & Quiz Platform for BISE Boards, MDCAT, ECAT, CSS, and Matric/Inter Exam Preparation.',
    slogan: 'Learn. Practice. Test. Improve.',
    educationalCredentialAwarded: 'Certificate of Merit & Assessment Performance Report',
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Pakistan',
    },
    knowsAbout: [
      'Matriculation Examination',
      'Intermediate Examination',
      'BISE Board Past Papers',
      'MDCAT Entry Test',
      'ECAT Engineering Test',
      'Pakistan CSS Examination',
    ],
  };

  // 2. WebSite Node with SearchAction
  const websiteNode = {
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    url: baseUrl,
    name: 'Taleem Guru - Pakistan Online Tests & MCQs',
    publisher: {
      '@id': `${baseUrl}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  // 3. BreadcrumbList Node
  const breadcrumbElements: any[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${baseUrl}/`,
    },
  ];

  if (view !== 'home' && view !== 'not-found') {
    breadcrumbElements.push({
      '@type': 'ListItem',
      position: 2,
      name: view.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      item: getCanonicalUrl(`/${view}`),
    });

    if (subFilter) {
      breadcrumbElements.push({
        '@type': 'ListItem',
        position: 3,
        name: subFilter,
        item: canonicalUrl,
      });
    }
  }

  const breadcrumbNode = {
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}#breadcrumb`,
    itemListElement: breadcrumbElements,
  };

  const graph: any[] = [organizationNode, websiteNode, breadcrumbNode];

  // 4. Content Specific Structured Data based on REAL attributes
  if (activeItem) {
    if (view === 'tests' || view === 'test-session') {
      graph.push({
        '@type': 'Quiz',
        '@id': `${canonicalUrl}#quiz`,
        name: activeItem.title,
        description: activeItem.description || description,
        educationalLevel: activeItem.classLevel || 'General',
        timeRequired: activeItem.durationMinutes ? `PT${activeItem.durationMinutes}M` : undefined,
        about: activeItem.subject,
        hasPart: activeItem.totalQuestions
          ? {
              '@type': 'ItemList',
              numberOfItems: activeItem.totalQuestions,
            }
          : undefined,
      });
    } else if (view === 'past-papers') {
      graph.push({
        '@type': 'LearningResource',
        '@id': `${canonicalUrl}#resource`,
        name: activeItem.title,
        description: activeItem.description || description,
        learningResourceType: 'Past Examination Paper',
        educationalLevel: activeItem.classLevel,
        about: activeItem.subject,
        keywords: [activeItem.board, activeItem.subject, activeItem.year?.toString()].filter(Boolean),
      });
    } else if (view === 'notes') {
      graph.push({
        '@type': 'LearningResource',
        '@id': `${canonicalUrl}#resource`,
        name: activeItem.title,
        description: activeItem.description || description,
        learningResourceType: 'Study Notes & Formula Sheets',
        educationalLevel: activeItem.classLevel,
        about: activeItem.subject,
      });
    }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
