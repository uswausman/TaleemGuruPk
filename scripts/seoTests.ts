/**
 * TaleemGuru Step 22: Professional SEO & Indexing Test Suite
 * Verifies dynamic SEO metadata, canonical domains, noindex isolation for unpublished content,
 * robots.txt rules, dynamic sitemaps, structured data integrity, and 404 protection.
 */

import { CANONICAL_PRODUCTION_DOMAIN, getCanonicalUrl } from '../src/lib/config';
import { resolveRoute, viewToCanonicalPath } from '../src/lib/routeGuards';
import {
  ROUTE_SEO_REGISTRY,
  determineRobotsDirective,
  buildDynamicTitle,
  buildDynamicDescription,
  generateSchemaGraph,
} from '../src/lib/seo';
import { generateDynamicSitemap, generateRobotsTxt, getDynamicSeoMetadata } from '../src/server/seoServer';

async function runSeoTests() {
  console.log('==================================================');
  console.log('  TALEEMGURU STEP 22: PROFESSIONAL SEO & INDEXING TESTS');
  console.log('==================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Canonical Domain Enforcement
  console.log('\n--- 1. Canonical Domain & Parameter URL Normalization ---');
  assert(
    CANONICAL_PRODUCTION_DOMAIN === 'https://www.taleemguru.pk',
    'Canonical production domain is strictly https://www.taleemguru.pk'
  );

  const cleanUrl1 = getCanonicalUrl('/tests');
  assert(cleanUrl1 === 'https://www.taleemguru.pk/tests', 'Rooted canonical URL for /tests is https://www.taleemguru.pk/tests');

  const paramUrl = getCanonicalUrl('/tests?utm_source=facebook&utm_medium=cpc&fbclid=IwAR123#quiz-header');
  assert(
    paramUrl === 'https://www.taleemguru.pk/tests',
    'Canonical URL strips tracking parameters and hash fragments (prevents duplicate indexing)'
  );

  const trailingSlashUrl = getCanonicalUrl('/past-papers/');
  assert(
    trailingSlashUrl === 'https://www.taleemguru.pk/past-papers',
    'Canonical URL strips unnecessary trailing slashes'
  );

  const rootCanonical = getCanonicalUrl('/');
  assert(rootCanonical === 'https://www.taleemguru.pk/', 'Root canonical URL correctly preserves single slash');

  // TEST 2: Audit Public Routes for Unique Title & Meta Description
  console.log('\n--- 2. Public Route Metadata Audit ---');
  const requiredPublicViews = [
    'home',
    'boards',
    'classes',
    'subjects',
    'past-papers',
    'notes',
    'tests',
    'search',
    'mcqs',
    'entry-tests',
    'competitive-exams',
    'armed-forces',
    'leaderboard',
    'privacy-policy',
    'terms-of-service',
  ];

  const titlesSet = new Set<string>();
  const descriptionsSet = new Set<string>();

  for (const view of requiredPublicViews) {
    const meta = ROUTE_SEO_REGISTRY[view];
    assert(Boolean(meta), `Route metadata exists for "${view}"`);
    assert(Boolean(meta?.title && meta.title.length > 20), `Route "${view}" has a descriptive unique title`);
    assert(
      Boolean(meta?.description && meta.description.length > 40),
      `Route "${view}" has an informative meta description`
    );

    if (meta) {
      assert(!titlesSet.has(meta.title), `Title for "${view}" is globally unique across routes`);
      titlesSet.add(meta.title);

      assert(!descriptionsSet.has(meta.description), `Description for "${view}" is globally unique across routes`);
      descriptionsSet.add(meta.description);
    }
  }

  // TEST 3: Branding Tagline Preservation
  console.log('\n--- 3. Brand Tagline Preservation ---');
  const homeMeta = ROUTE_SEO_REGISTRY.home;
  assert(
    homeMeta.title.includes('Learn. Practice. Test. Improve.'),
    'Home title preserves exact branding: "Learn. Practice. Test. Improve."'
  );

  // TEST 4: Published vs Non-Published Indexing Isolation
  console.log('\n--- 4. Published vs Non-Published Indexing Isolation ---');
  // Published educational content MUST be indexable
  const publishedRobots = determineRobotsDirective({
    view: 'tests',
    contentStatus: 'Published',
  });
  assert(
    publishedRobots.startsWith('index, follow'),
    'Published content is indexable (index, follow)'
  );

  // Draft content MUST be noindex
  const draftRobots = determineRobotsDirective({
    view: 'tests',
    contentStatus: 'Draft',
  });
  assert(
    draftRobots === 'noindex, nofollow',
    'Draft content is strictly noindex, nofollow'
  );

  // Pending Review MUST be noindex
  const pendingRobots = determineRobotsDirective({
    view: 'tests',
    contentStatus: 'Pending Review',
  });
  assert(
    pendingRobots === 'noindex, nofollow',
    'Pending Review content is strictly noindex, nofollow'
  );

  // Approved (pre-publication) MUST be noindex
  const approvedRobots = determineRobotsDirective({
    view: 'tests',
    contentStatus: 'Approved',
  });
  assert(
    approvedRobots === 'noindex, nofollow',
    'Approved (not yet published) content is strictly noindex, nofollow'
  );

  // Rejected MUST be noindex
  const rejectedRobots = determineRobotsDirective({
    view: 'tests',
    contentStatus: 'Rejected',
  });
  assert(
    rejectedRobots === 'noindex, nofollow',
    'Rejected content is strictly noindex, nofollow'
  );

  // Archived MUST be noindex
  const archivedRobots = determineRobotsDirective({
    view: 'tests',
    contentStatus: 'Archived',
  });
  assert(
    archivedRobots === 'noindex, nofollow',
    'Archived content is strictly noindex, nofollow'
  );

  // Private views MUST be noindex
  const privateViews = ['admin-panel', 'teacher-panel', 'student-dashboard', 'access-denied', 'certificates', 'results'];
  for (const pv of privateViews) {
    const pRobots = determineRobotsDirective({ view: pv });
    assert(pRobots === 'noindex, nofollow', `Private view "${pv}" is strictly noindex, nofollow`);
  }

  // TEST 5: 404 & Empty-Content Handling
  console.log('\n--- 5. 404 & Empty Content Protection ---');
  const unknownRouteResult = resolveRoute('/some-random-broken-path-12345');
  assert(
    unknownRouteResult.view === 'not-found' && unknownRouteResult.isNotFound === true,
    'Unknown route /some-random-broken-path-12345 resolves to not-found view with isNotFound flag'
  );

  const notFoundRobots = determineRobotsDirective({
    view: 'not-found',
    isNotFound: true,
  });
  assert(
    notFoundRobots === 'noindex, nofollow',
    '404 Not Found pages strictly return noindex, nofollow'
  );

  const notFoundCanonical = viewToCanonicalPath('not-found');
  assert(notFoundCanonical === '/404', 'Not found canonical path is /404');

  const emptyContentRobots = determineRobotsDirective({
    view: 'subjects',
    isEmptyContent: true,
  });
  assert(
    emptyContentRobots === 'noindex, follow',
    'Empty content filter pages return noindex, follow to avoid soft-404 indexing'
  );

  const searchParamRobots = determineRobotsDirective({
    view: 'search',
    hasSearchQuery: true,
  });
  assert(
    searchParamRobots === 'noindex, follow',
    'Search result pages with queries return noindex, follow (prevents crawl traps)'
  );

  // TEST 6: Structured Data Integrity (Zero Fake Data)
  console.log('\n--- 6. Schema.org Structured Data Integrity ---');
  const schema = generateSchemaGraph({
    view: 'tests',
    canonicalUrl: 'https://www.taleemguru.pk/tests',
    title: 'Class 10 Physics Chapter 1 Test',
    description: 'Kinematics online test',
    activeItem: {
      id: 'test-1',
      title: 'Class 10 Physics Chapter 1 Test',
      description: 'Kinematics online test',
      status: 'Published',
      subject: 'Physics',
      classLevel: 'Class 10',
      durationMinutes: 15,
      totalQuestions: 10,
    },
  });

  assert(schema['@context'] === 'https://schema.org', 'Structured data uses https://schema.org context');
  const graph = schema['@graph'];
  const orgNode = graph.find((n: any) => n['@type'] === 'EducationalOrganization');
  assert(Boolean(orgNode && orgNode.name === 'Taleem Guru'), 'Schema contains authentic EducationalOrganization');
  assert(orgNode.slogan === 'Learn. Practice. Test. Improve.', 'EducationalOrganization preserves brand slogan');

  const quizNode = graph.find((n: any) => n['@type'] === 'Quiz');
  assert(Boolean(quizNode), 'Schema contains Quiz node for educational test');
  assert(quizNode.timeRequired === 'PT15M', 'Quiz timeRequired is accurately derived from real duration (PT15M)');
  assert(quizNode.hasPart?.numberOfItems === 10, 'Quiz hasPart accurately reflects real totalQuestions');

  // Verify ABSOLUTELY NO FAKE DATA
  const fullJson = JSON.stringify(schema);
  assert(!fullJson.includes('aggregateRating'), 'Structured data strictly contains NO fake aggregate ratings');
  assert(!fullJson.includes('ratingValue'), 'Structured data strictly contains NO fake rating values');
  assert(!fullJson.includes('reviewCount'), 'Structured data strictly contains NO fake review counts');

  // TEST 7: Dynamic Robots.txt Generation
  console.log('\n--- 7. Robots.txt Generation & Rules ---');
  const robotsTxt = generateRobotsTxt();
  assert(robotsTxt.includes('User-agent: *'), 'robots.txt specifies User-agent: *');
  assert(robotsTxt.includes('Disallow: /admin'), 'robots.txt disallows /admin');
  assert(robotsTxt.includes('Disallow: /dashboard'), 'robots.txt disallows /dashboard');
  assert(robotsTxt.includes('Disallow: /test-session'), 'robots.txt disallows /test-session');
  assert(robotsTxt.includes('Disallow: /*?*'), 'robots.txt disallows query parameters (*?*) to stop duplicate indexing');
  assert(
    robotsTxt.includes('Sitemap: https://www.taleemguru.pk/sitemap.xml'),
    'robots.txt points to canonical sitemap at https://www.taleemguru.pk/sitemap.xml'
  );

  // TEST 8: Dynamic XML Sitemap Generation from PostgreSQL Content
  console.log('\n--- 8. Dynamic Sitemap Generation ---');
  const sitemapXml = await generateDynamicSitemap();
  assert(sitemapXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Sitemap has valid XML declaration');
  assert(sitemapXml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), 'Sitemap defines valid urlset schema');
  assert(sitemapXml.includes('<loc>https://www.taleemguru.pk/</loc>'), 'Sitemap contains canonical homepage');
  assert(sitemapXml.includes('<loc>https://www.taleemguru.pk/tests</loc>'), 'Sitemap contains /tests');
  assert(sitemapXml.includes('<loc>https://www.taleemguru.pk/past-papers</loc>'), 'Sitemap contains /past-papers');
  assert(sitemapXml.includes('<loc>https://www.taleemguru.pk/notes</loc>'), 'Sitemap contains /notes');
  assert(sitemapXml.includes('<loc>https://www.taleemguru.pk/mcqs</loc>'), 'Sitemap contains /mcqs');
  assert(!sitemapXml.includes('/admin'), 'Sitemap strictly contains NO administrative routes');
  assert(!sitemapXml.includes('/dashboard'), 'Sitemap strictly contains NO student dashboard routes');

  // TEST 9: Dynamic Database-Driven SEO Metadata Endpoint
  console.log('\n--- 9. Dynamic Database-Driven SEO Resolver ---');
  const homeMetaRes = await getDynamicSeoMetadata({ view: 'home', path: '/' });
  assert(homeMetaRes.isIndexable === true, 'Home route metadata is indexable');
  assert(homeMetaRes.canonicalUrl === 'https://www.taleemguru.pk/', 'Home canonical URL is https://www.taleemguru.pk/');

  const dynamicSearchRes = await getDynamicSeoMetadata({ view: 'search', subFilter: 'physics', path: '/search?q=physics' });
  assert(dynamicSearchRes.canonicalUrl === 'https://www.taleemguru.pk/search', 'Search canonical URL is https://www.taleemguru.pk/search without params');
  assert(dynamicSearchRes.isIndexable === false, 'Search with keyword query is not indexable (noindex, follow)');

  console.log('\n==================================================');
  console.log(`STEP 22 SEO TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSeoTests().catch((err) => {
  console.error('Fatal error in SEO test suite:', err);
  process.exit(1);
});
