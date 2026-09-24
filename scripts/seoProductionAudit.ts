/**
 * TaleemGuru Step 23: Production SEO & Google Search Readiness Audit
 * Performs real-time live HTTP probing of production domain (https://taleemguru.pk and https://www.taleemguru.pk),
 * validates DNS verification, sitemap integrity, robots.txt directives, canonicalization,
 * index/noindex boundary rules, broken link detection, and Schema.org compliance.
 */

import dns from 'dns';
import { promisify } from 'util';
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

const resolveTxtAsync = promisify(dns.resolveTxt);

export interface AuditResult {
  title: string;
  passed: boolean;
  details: string;
}

export async function runProductionSeoAudit(): Promise<{
  passedCount: number;
  failedCount: number;
  results: AuditResult[];
  liveUrlsChecked: Array<{ url: string; status: number; type: string; details?: string }>;
  gscStatus: { verified: boolean; method: string; details: string };
  issuesFound: string[];
}> {
  const results: AuditResult[] = [];
  const liveUrlsChecked: Array<{ url: string; status: number; type: string; details?: string }> = [];
  const issuesFound: string[] = [];
  let passedCount = 0;
  let failedCount = 0;

  function record(title: string, passed: boolean, details: string) {
    results.push({ title, passed, details });
    if (passed) {
      passedCount++;
    } else {
      failedCount++;
      issuesFound.push(`${title}: ${details}`);
    }
  }

  // -------------------------------------------------------------
  // 1. Google Search Console Verification Audit (Real DNS & Meta Tag)
  // -------------------------------------------------------------
  let gscStatus = { verified: false, method: 'None', details: 'No verification record found' };
  try {
    const txtRecords = await resolveTxtAsync('taleemguru.pk');
    const flatTxt = txtRecords.flat();
    const gscRecord = flatTxt.find((r) => r.startsWith('google-site-verification='));
    if (gscRecord) {
      const token = gscRecord.replace('google-site-verification=', '');
      gscStatus = {
        verified: true,
        method: 'DNS TXT Record (Domain Property)',
        details: `Verified token: ${token}`,
      };
      record(
        'Google Search Console DNS Verification',
        true,
        `Found authentic DNS TXT token: ${token}`
      );
    } else {
      record('Google Search Console DNS Verification', false, 'No DNS TXT record found on taleemguru.pk');
    }
  } catch (err: any) {
    record('Google Search Console DNS Verification', false, `DNS query error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // 2. HTTP/HTTPS and www/non-www Canonicalization & Live Probing
  // -------------------------------------------------------------
  const liveEndPointsToTest = [
    { url: 'http://taleemguru.pk', expectedStatus: 308, desc: 'HTTP Apex Redirect' },
    { url: 'http://www.taleemguru.pk', expectedStatus: 308, desc: 'HTTP WWW Redirect' },
    { url: 'https://taleemguru.pk', expectedStatus: 308, desc: 'HTTPS Apex to WWW Redirect' },
    { url: 'https://www.taleemguru.pk', expectedStatus: 200, desc: 'HTTPS WWW Live Production Primary' },
    { url: 'https://www.taleemguru.pk/robots.txt', expectedStatus: 200, desc: 'Live robots.txt' },
    { url: 'https://www.taleemguru.pk/sitemap.xml', expectedStatus: 200, desc: 'Live sitemap.xml' },
  ];

  for (const ep of liveEndPointsToTest) {
    try {
      const res = await fetch(ep.url, { redirect: 'manual' });
      const loc = res.headers.get('location') || '';
      liveUrlsChecked.push({
        url: ep.url,
        status: res.status,
        type: res.headers.get('content-type') || 'unknown',
        details: loc ? `Redirects to ${loc}` : 'Direct response',
      });

      const isMatch = res.status === ep.expectedStatus;
      record(
        `Live HTTP Check: ${ep.desc} (${ep.url})`,
        isMatch,
        `Returned HTTP ${res.status}${loc ? ` -> Location: ${loc}` : ''}`
      );
    } catch (e: any) {
      liveUrlsChecked.push({
        url: ep.url,
        status: 0,
        type: 'error',
        details: e.message,
      });
      record(`Live HTTP Check: ${ep.desc} (${ep.url})`, false, `Connection error: ${e.message}`);
    }
  }

  // -------------------------------------------------------------
  // 3. Live Production Public Routes Verification
  // -------------------------------------------------------------
  const publicRoutes = [
    '/',
    '/boards',
    '/classes',
    '/subjects',
    '/mcqs',
    '/tests',
    '/past-papers',
    '/notes',
    '/entry-tests',
    '/competitive-exams',
    '/armed-forces',
    '/leaderboard',
    '/privacy-policy',
    '/terms-of-service',
    '/search',
  ];

  for (const r of publicRoutes) {
    try {
      const targetUrl = `https://www.taleemguru.pk${r}`;
      const res = await fetch(targetUrl, { redirect: 'follow' });
      const ct = res.headers.get('content-type') || '';
      liveUrlsChecked.push({
        url: targetUrl,
        status: res.status,
        type: ct,
        details: 'Public portal route reachable',
      });
      record(
        `Public Route Reachability: ${r}`,
        res.status === 200,
        `Returned HTTP ${res.status}`
      );
    } catch (e: any) {
      record(`Public Route Reachability: ${r}`, false, `Error: ${e.message}`);
    }
  }

  // -------------------------------------------------------------
  // 4. Live robots.txt Directives Audit
  // -------------------------------------------------------------
  try {
    const robotsRes = await fetch('https://www.taleemguru.pk/robots.txt');
    const robotsText = await robotsRes.text();
    const hasUserAgent = robotsText.includes('User-agent:');
    const hasAdminDisallow = robotsText.includes('Disallow: /admin');
    const hasSitemapDirective = robotsText.includes('Sitemap:');

    record('Live robots.txt User-Agent', hasUserAgent, 'User-agent directive present');
    record('Live robots.txt Admin Disallow', hasAdminDisallow, 'Disallow /admin directive present');
    record('Live robots.txt Sitemap Pointer', hasSitemapDirective, 'Sitemap pointer directive present');
  } catch (err: any) {
    record('Live robots.txt Directives Audit', false, `Fetch error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // 5. Local Server Live Endpoints Verification (Latest Codebase)
  // -------------------------------------------------------------
  try {
    const localSitemapRes = await fetch('http://localhost:3000/sitemap.xml');
    const sitemapXml = await localSitemapRes.text();
    const isValidXml = sitemapXml.startsWith('<?xml') && sitemapXml.includes('<urlset') && sitemapXml.includes('</urlset>');
    record(
      'Dynamic Sitemap XML Format & Structure',
      isValidXml && localSitemapRes.status === 200,
      `Status ${localSitemapRes.status}, valid XML length ${sitemapXml.length}`
    );

    // Check that sitemap contains canonical URLs and zero private URLs
    const containsHome = sitemapXml.includes('<loc>https://www.taleemguru.pk/</loc>');
    const containsTests = sitemapXml.includes('<loc>https://www.taleemguru.pk/tests</loc>');
    const containsPastPapers = sitemapXml.includes('<loc>https://www.taleemguru.pk/past-papers</loc>');
    const hasNoAdminInSitemap = !sitemapXml.includes('/admin');
    const hasNoDashboardInSitemap = !sitemapXml.includes('/dashboard');

    record('Dynamic Sitemap Essential URLs', containsHome && containsTests && containsPastPapers, 'Core public URLs present');
    record('Dynamic Sitemap Private Route Isolation', hasNoAdminInSitemap && hasNoDashboardInSitemap, 'No private routes in sitemap');
  } catch (err: any) {
    record('Local Server Sitemap Check', false, `Error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // 6. Indexing Isolation for Content Status (Only Published Is Indexable)
  // -------------------------------------------------------------
  const statuses = [
    { status: 'Published', expectIndex: true },
    { status: 'Draft', expectIndex: false },
    { status: 'Pending Review', expectIndex: false },
    { status: 'Approved', expectIndex: false },
    { status: 'Rejected', expectIndex: false },
    { status: 'Archived', expectIndex: false },
  ];

  for (const item of statuses) {
    const directive = determineRobotsDirective({ view: 'tests', contentStatus: item.status });
    const isIndex = directive.startsWith('index');
    record(
      `Content Status Indexing Isolation: ${item.status}`,
      isIndex === item.expectIndex,
      `Status "${item.status}" produced: "${directive}" (Expected indexable: ${item.expectIndex})`
    );
  }

  // -------------------------------------------------------------
  // 7. Search Query Pages (Prevent Crawl Traps)
  // -------------------------------------------------------------
  const searchWithQueryDirective = determineRobotsDirective({
    view: 'search',
    hasSearchQuery: true,
  });
  record(
    'Search Query Crawl Trap Prevention',
    searchWithQueryDirective === 'noindex, follow',
    `Search with query produced: "${searchWithQueryDirective}"`
  );

  // -------------------------------------------------------------
  // 8. 404 Status and Indexing Protection
  // -------------------------------------------------------------
  const notFoundRoute = resolveRoute('/this-route-does-not-exist-at-all');
  record(
    '404 Route Detection on Broken URL',
    notFoundRoute.view === 'not-found' && notFoundRoute.isNotFound === true,
    `Resolved view: ${notFoundRoute.view}, isNotFound: ${notFoundRoute.isNotFound}`
  );

  const notFoundRobots = determineRobotsDirective({ view: 'not-found', isNotFound: true });
  record(
    '404 Robots Directive (Strict noindex, nofollow)',
    notFoundRobots === 'noindex, nofollow',
    `404 directive: "${notFoundRobots}"`
  );

  // -------------------------------------------------------------
  // 9. Public Route Titles & Meta Descriptions Uniqueness & Quality
  // -------------------------------------------------------------
  const publicViews = [
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

  const seenTitles = new Set<string>();
  const seenDescriptions = new Set<string>();
  let duplicateTitleCount = 0;
  let duplicateDescCount = 0;

  for (const v of publicViews) {
    const meta = ROUTE_SEO_REGISTRY[v];
    if (!meta) continue;

    if (seenTitles.has(meta.title)) duplicateTitleCount++;
    else seenTitles.add(meta.title);

    if (seenDescriptions.has(meta.description)) duplicateDescCount++;
    else seenDescriptions.add(meta.description);
  }

  record(
    'Unique Titles on All Public Routes',
    duplicateTitleCount === 0,
    `Checked ${publicViews.length} routes, found ${duplicateTitleCount} duplicates`
  );
  record(
    'Unique Meta Descriptions on All Public Routes',
    duplicateDescCount === 0,
    `Checked ${publicViews.length} routes, found ${duplicateDescCount} duplicates`
  );

  // -------------------------------------------------------------
  // 10. Authentic Structured Data (No Fabricated Ratings or Reviews)
  // -------------------------------------------------------------
  const testSchema = generateSchemaGraph({
    view: 'home',
    canonicalUrl: 'https://www.taleemguru.pk/',
    title: ROUTE_SEO_REGISTRY.home.title,
    description: ROUTE_SEO_REGISTRY.home.description,
  });

  const schemaString = JSON.stringify(testSchema);
  const hasFakeRating = schemaString.includes('aggregateRating') || schemaString.includes('ratingValue');
  const hasFakeReview = schemaString.includes('Review') || schemaString.includes('reviewCount');

  record(
    'Structured Data Integrity (No Fake Ratings)',
    !hasFakeRating,
    'Verified zero aggregateRating or ratingValue nodes'
  );
  record(
    'Structured Data Integrity (No Fake Reviews)',
    !hasFakeReview,
    'Verified zero fake review nodes'
  );
  record(
    'Structured Data Tagline Preservation',
    schemaString.includes('Learn. Practice. Test. Improve.'),
    'Preserves authentic brand slogan'
  );

  return {
    passedCount,
    failedCount,
    results,
    liveUrlsChecked,
    gscStatus,
    issuesFound,
  };
}

// Auto-run if executed directly
if (import.meta.url.endsWith(process.argv[1])) {
  runProductionSeoAudit().then((summary) => {
    console.log('====================================================');
    console.log('  TALEEMGURU STEP 23: PRODUCTION SEO AUDIT REPORT');
    console.log('====================================================');
    console.log(`Passed Checks: ${summary.passedCount}`);
    console.log(`Failed Checks: ${summary.failedCount}`);
    console.log(`GSC Status:    ${summary.gscStatus.method} -> ${summary.gscStatus.details}`);
    console.log('\n--- Live URLs Audited ---');
    summary.liveUrlsChecked.forEach((u) => {
      console.log(`  ${u.status} [${u.type}] ${u.url} ${u.details ? `(${u.details})` : ''}`);
    });

    if (summary.issuesFound.length > 0) {
      console.log('\n--- Issues Noted ---');
      summary.issuesFound.forEach((iss) => console.log(`  • ${iss}`));
    }

    if (summary.failedCount > 0) {
      console.error('\nAudit encountered failures.');
      process.exit(1);
    } else {
      console.log('\nAll SEO & Google Search readiness checks PASSED.');
    }
  }).catch((err) => {
    console.error('Fatal audit failure:', err);
    process.exit(1);
  });
}
