import {
  getTestsFromDb,
  getTestByIdFromDb,
  getPastPapersFromDb,
  getPastPaperByIdFromDb,
  getStudyNotesFromDb,
  getStudyNoteByIdFromDb,
  getMCQByIdFromDb,
  getBoardsFromDb as getHierarchyBoards,
  getClassesFromDb as getHierarchyClasses,
  getSubjectsFromDb as getHierarchySubjects,
} from '../db/content';
import { CANONICAL_PRODUCTION_DOMAIN, getCanonicalUrl } from '../lib/config';
import {
  ROUTE_SEO_REGISTRY,
  determineRobotsDirective,
  buildDynamicTitle,
  buildDynamicDescription,
  generateSchemaGraph,
} from '../lib/seo';

/**
 * Generate a dynamic XML sitemap grounded in real PostgreSQL content.
 * Only Published educational content is included.
 * Draft, Pending Review, Approved, Rejected, and Archived records are strictly excluded.
 */
export async function generateDynamicSitemap(): Promise<string> {
  const baseUrl = CANONICAL_PRODUCTION_DOMAIN;
  const now = new Date().toISOString().split('T')[0];

  // 1. Core Public Routes
  const staticPublicRoutes = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/tests', priority: '0.9', changefreq: 'daily' },
    { path: '/mcqs', priority: '0.9', changefreq: 'daily' },
    { path: '/past-papers', priority: '0.9', changefreq: 'daily' },
    { path: '/notes', priority: '0.9', changefreq: 'daily' },
    { path: '/boards', priority: '0.8', changefreq: 'weekly' },
    { path: '/classes', priority: '0.8', changefreq: 'weekly' },
    { path: '/subjects', priority: '0.8', changefreq: 'weekly' },
    { path: '/entry-tests', priority: '0.8', changefreq: 'weekly' },
    { path: '/competitive-exams', priority: '0.8', changefreq: 'weekly' },
    { path: '/armed-forces', priority: '0.8', changefreq: 'weekly' },
    { path: '/leaderboard', priority: '0.7', changefreq: 'daily' },
    { path: '/privacy-policy', priority: '0.5', changefreq: 'monthly' },
    { path: '/terms-of-service', priority: '0.5', changefreq: 'monthly' },
  ];

  const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

  for (const route of staticPublicRoutes) {
    urls.push({
      loc: `${baseUrl}${route.path}`,
      lastmod: now,
      changefreq: route.changefreq,
      priority: route.priority,
    });
  }

  try {
    // 2. Query Authoritative Published Tests from PostgreSQL
    const publishedTests = await getTestsFromDb({ status: 'Published', limit: 100 });
    for (const test of publishedTests) {
      if (test.status === 'Published' && test.id) {
        const lastModDate = test.createdAt ? test.createdAt.split('T')[0] : now;
        urls.push({
          loc: `${baseUrl}/tests?subject=${encodeURIComponent(test.subject)}`,
          lastmod: lastModDate,
          changefreq: 'weekly',
          priority: '0.8',
        });
      }
    }

    // 3. Query Authoritative Published Past Papers from PostgreSQL
    const publishedPapers = await getPastPapersFromDb({ status: 'Published', limit: 100 });
    for (const paper of publishedPapers) {
      if (paper.status === 'Published' && paper.id) {
        const lastModDate = paper.createdAt ? paper.createdAt.split('T')[0] : now;
        urls.push({
          loc: `${baseUrl}/past-papers?board=${encodeURIComponent(paper.board)}`,
          lastmod: lastModDate,
          changefreq: 'weekly',
          priority: '0.8',
        });
      }
    }

    // 4. Query Authoritative Published Study Notes from PostgreSQL
    const publishedNotes = await getStudyNotesFromDb({ status: 'Published', limit: 100 });
    for (const note of publishedNotes) {
      if (note.status === 'Published' && note.id) {
        const lastModDate = note.createdAt ? note.createdAt.split('T')[0] : now;
        urls.push({
          loc: `${baseUrl}/notes?subject=${encodeURIComponent(note.subject)}`,
          lastmod: lastModDate,
          changefreq: 'weekly',
          priority: '0.8',
        });
      }
    }

    // 5. Query Active Boards from Educational Hierarchy
    const activeBoards = await getHierarchyBoards();
    for (const board of activeBoards) {
      if (board.status === 'Active' && board.name) {
        urls.push({
          loc: `${baseUrl}/boards?filter=${encodeURIComponent(board.name)}`,
          lastmod: now,
          changefreq: 'monthly',
          priority: '0.7',
        });
      }
    }

    // 6. Query Active Classes from Educational Hierarchy
    const activeClasses = await getHierarchyClasses();
    for (const cls of activeClasses) {
      if (cls.status === 'Active' && cls.name) {
        urls.push({
          loc: `${baseUrl}/classes?filter=${encodeURIComponent(cls.name)}`,
          lastmod: now,
          changefreq: 'monthly',
          priority: '0.7',
        });
      }
    }

    // 7. Query Active Subjects from Educational Hierarchy
    const activeSubjects = await getHierarchySubjects();
    for (const subj of activeSubjects) {
      if (subj.status === 'Active' && subj.name) {
        urls.push({
          loc: `${baseUrl}/subjects?filter=${encodeURIComponent(subj.name)}`,
          lastmod: now,
          changefreq: 'monthly',
          priority: '0.7',
        });
      }
    }
  } catch (err) {
    console.warn('[SEO] Notice: Database query during sitemap generation encountered fallback:', err);
  }

  // Deduplicate URLs
  const uniqueUrlsMap = new Map<string, (typeof urls)[0]>();
  for (const u of urls) {
    if (!uniqueUrlsMap.has(u.loc)) {
      uniqueUrlsMap.set(u.loc, u);
    }
  }

  // Format valid XML
  const xmlEntries = Array.from(uniqueUrlsMap.values())
    .map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${xmlEntries}
</urlset>
`;
}

/**
 * Generate production robots.txt
 * Disallows private, session, administrative, and query-parameter duplicate URLs.
 */
export function generateRobotsTxt(): string {
  const baseUrl = CANONICAL_PRODUCTION_DOMAIN;
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /admin-panel
Disallow: /dashboard
Disallow: /profile
Disallow: /certificates
Disallow: /attempts
Disallow: /results
Disallow: /test-session
Disallow: /quiz-session
Disallow: /access-denied
Disallow: /auth/
Disallow: /api/
Disallow: /*?*

# Canonical Sitemap
Sitemap: ${baseUrl}/sitemap.xml
`;
}

/**
 * Dynamically resolves SEO metadata from real PostgreSQL records.
 */
export async function getDynamicSeoMetadata(params: {
  view?: string;
  subFilter?: string;
  testId?: string;
  paperId?: string;
  noteId?: string;
  mcqId?: string;
  path?: string;
}) {
  const { view = 'home', subFilter, testId, paperId, noteId, mcqId, path = '/' } = params;

  let activeItem: any = null;
  let contentStatus: string | null = null;
  let isNotFound = false;

  // 1. Resolve by Test ID
  if (testId) {
    const test = await getTestByIdFromDb(testId);
    if (test) {
      activeItem = {
        id: test.id,
        title: test.title,
        description: test.description,
        status: test.status,
        subject: test.subject,
        classLevel: test.classLevel,
        board: test.board,
        durationMinutes: test.durationMinutes,
        totalQuestions: test.totalQuestions,
      };
      contentStatus = test.status;
    } else {
      isNotFound = true;
    }
  }
  // 2. Resolve by Past Paper ID
  else if (paperId) {
    const paper = await getPastPaperByIdFromDb(paperId);
    if (paper) {
      activeItem = {
        id: paper.id,
        title: paper.title,
        description: paper.description,
        status: paper.status,
        subject: paper.subject,
        classLevel: paper.classLevel,
        board: paper.board,
        year: paper.year,
        type: paper.type,
      };
      contentStatus = paper.status;
    } else {
      isNotFound = true;
    }
  }
  // 3. Resolve by Study Note ID
  else if (noteId) {
    const note = await getStudyNoteByIdFromDb(noteId);
    if (note) {
      activeItem = {
        id: note.id,
        title: note.title,
        description: note.description || note.contentSnippet,
        status: note.status,
        subject: note.subject,
        classLevel: note.classLevel,
        board: note.board,
      };
      contentStatus = note.status;
    } else {
      isNotFound = true;
    }
  }
  // 4. Resolve by MCQ ID
  else if (mcqId) {
    const mcq = await getMCQByIdFromDb(mcqId);
    if (mcq) {
      activeItem = {
        id: mcq.id,
        title: mcq.question,
        description: mcq.explanation,
        status: mcq.status,
        subject: mcq.subject,
        classLevel: mcq.classLevel,
        board: mcq.board,
      };
      contentStatus = mcq.status;
    } else {
      isNotFound = true;
    }
  }

  const finalCanonical = getCanonicalUrl(path);
  const finalTitle = buildDynamicTitle(view, subFilter, activeItem?.title);
  const finalDescription = buildDynamicDescription(view, subFilter, activeItem?.description);

  const robots = determineRobotsDirective({
    view,
    contentStatus,
    isNotFound,
    isEmptyContent: false,
    hasSearchQuery: view === 'search' && Boolean(subFilter),
  });

  const isIndexable = robots.startsWith('index');

  const schemaGraph = generateSchemaGraph({
    view,
    canonicalUrl: finalCanonical,
    title: finalTitle,
    description: finalDescription,
    subFilter,
    activeItem,
  });

  return {
    title: finalTitle,
    description: finalDescription,
    canonicalUrl: finalCanonical,
    robots,
    isIndexable,
    status: contentStatus || 'Published',
    schemaOrg: schemaGraph,
    activeItem,
  };
}
