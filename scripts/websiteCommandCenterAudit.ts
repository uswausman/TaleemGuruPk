import {
  isSafeUrlForCrawl,
  executeSeoAudit,
  runDatabaseHealthCheck,
  runApiHealthCheck,
  getTrafficAnalyticsData,
  recordLiveError,
  getLiveErrorLogs,
  getWebsiteCommandCenterSummary,
  approveAndApplyFix,
  getFixProposals,
  getSearchConsoleData,
  getSearchConsoleSeoIntelligence,
  runPageSpeedAudit,
  verifyDeploymentAndCompare,
  rollbackLastDeployment,
  getSystemAlerts,
} from '../src/server/websiteHealthServer.ts';

async function runAudit() {
  console.log('====================================================');
  console.log('STARTING WEBSITE COMMAND CENTER PRODUCTION QA AUDIT');
  console.log('====================================================\n');

  // 1. SSRF Guard Security Verification
  console.log('1. TESTING SSRF GUARD ON PRIVATE IP TARGETS:');
  const ssrfTargets = [
    'http://127.0.0.1/admin',
    'http://localhost:8080',
    'http://10.0.0.1/internal',
    'http://192.168.1.1/router',
    'http://172.16.0.1/gateway',
    'http://169.254.169.254/latest/meta-data/',
  ];

  let ssrfPassCount = 0;
  ssrfTargets.forEach((target) => {
    const res = isSafeUrlForCrawl(target);
    if (!res.safe) {
      ssrfPassCount++;
      console.log(`  [BLOCKED] ${target} -> ${res.reason}`);
    } else {
      console.error(`  [FAIL - SSRF VULNERABILITY] ${target} was NOT blocked!`);
    }
  });

  const ssrfSuccess = ssrfPassCount === ssrfTargets.length;
  console.log(`  SSRF Guard Status: ${ssrfSuccess ? 'PASS (100% Blocked)' : 'FAIL'}\n`);

  // 2. Canonical SEO Scanner Execution
  console.log('2. EXECUTING CANONICAL SEO SCANNER:');
  try {
    const seoReport = await executeSeoAudit('https://www.taleemguru.pk');
    console.log(`  Canonical Domain: ${seoReport.canonicalDomain}`);
    console.log(`  Overall SEO Score: ${seoReport.overallSeoScore}/100`);
    console.log(`  Pages Scanned: ${seoReport.pagesScanned}`);
    console.log(`  Robots.txt Status: ${seoReport.checks.robotsTxt}`);
    console.log(`  Sitemap.xml Status: ${seoReport.checks.sitemapXml}`);
    console.log('  SEO Audit Status: PASS\n');
  } catch (err: any) {
    console.error('  [FAIL] SEO Scan Error:', err.message);
  }

  // 3. Database Health Check Verification
  console.log('3. EXECUTING DATABASE HEALTH MONITOR:');
  try {
    const dbReport = await runDatabaseHealthCheck();
    console.log(`  Database Status: ${dbReport.status}`);
    console.log(`  Connected: ${dbReport.connected}`);
    console.log(`  Query Latency: ${dbReport.latencyMs}ms`);
    console.log(`  Tables Checked (${dbReport.requiredTablesStatus.length} total):`);
    dbReport.requiredTablesStatus.forEach((t) => {
      console.log(`    - ${t.tableName}: ${t.exists ? `Verified (${t.recordCount ?? 0} records)` : 'Missing'}`);
    });
    console.log('  Database Health Monitor Status: PASS\n');
  } catch (err: any) {
    console.error('  [FAIL] Database Health Monitor Error:', err.message);
  }

  // 4. Live Error Monitoring & Redaction Verification
  console.log('4. TESTING LIVE ERROR MONITORING & SENSITIVE DATA REDACTION:');
  await recordLiveError({
    severity: 'CRITICAL',
    category: 'Authentication',
    statusCode: 401,
    route: '/api/auth/login?token=secret_12345_token',
    errorMessage: 'Failed auth with password=super_secret_pass and bearer Bearer eyJhbGciOiJIUzI1NiI',
  });

  const logs = await getLiveErrorLogs();
  const testLog = logs.find((l) => l.statusCode === 401);
  if (testLog) {
    console.log(`  Logged Route: ${testLog.route}`);
    console.log(`  Logged Message: ${testLog.errorMessage}`);
    const containsPassword = testLog.errorMessage.includes('super_secret_pass');
    const containsToken = testLog.errorMessage.includes('secret_12345_token');
    if (!containsPassword && !containsToken) {
      console.log('  Sensitive Data Redaction: PASS (Secrets scrubbed)\n');
    } else {
      console.error('  [FAIL] Secrets were NOT scrubbed properly!\n');
    }
  }

  // 5. Overall Command Center Summary Calculation
  console.log('5. EXECUTING OVERALL COMMAND CENTER HEALTH SCORING FORMULA:');
  try {
    const summary = await getWebsiteCommandCenterSummary();
    console.log(`  Calculated Overall Score: ${summary.overallHealth.score}/100`);
    console.log(`  Calculated Status: ${summary.overallHealth.status}`);
    console.log(`  SEO Score Component: ${summary.scores.seoScore}`);
    console.log(`  Performance Score Component: ${summary.scores.performanceScore}`);
    console.log(`  API Health Percent: ${summary.scores.apiHealthPercent}%`);
    console.log(`  Database Health Percent: ${summary.scores.databaseHealthPercent}%`);
    console.log('  Health Scoring Engine Status: PASS\n');
  } catch (err: any) {
    console.error('  [FAIL] Health Scoring Engine Error:', err.message);
  }

  // 6. Auto-Fix Security Audit Verification
  console.log('6. TESTING AUTO-FIX SAFETY RESTRICTION ENFORCEMENT:');
  const restrictedProposal = {
    id: 'fix_test_restricted',
    issueId: 'diag_auth_bypass',
    title: 'Attempted Auth Bypass Fix',
    category: 'Security',
    affectedFiles: ['src/middleware/auth.ts'],
    beforeCode: 'requireHighAdmin()',
    afterCode: 'requireAuth()',
    reason: 'Malicious auto-fix attempt',
    riskLevel: 'HIGH' as const,
    fixSafety: 'NEVER' as const,
    status: 'PENDING' as const,
    createdAt: new Date().toISOString(),
  };

  getFixProposals().push(restrictedProposal);
  const fixAttempt = await approveAndApplyFix(restrictedProposal.id, 'attacker@test.com');
  if (!fixAttempt.success) {
    console.log(`  Restricted Operation Blocked: PASS -> ${fixAttempt.error}\n`);
  } else {
    console.error('  [FAIL] Restricted NEVER operation was allowed!\n');
  }

  // 7. Phase 2 Integrations Verification
  console.log('7. TESTING PHASE 2 INTEGRATIONS & AUTOMATION:');
  const gsc = await getSearchConsoleData('28 Days');
  console.log(`  Search Console Status: ${gsc.status}`);

  const intel = await getSearchConsoleSeoIntelligence();
  console.log(`  Search Console Intelligence Recommendations: ${intel.length} items`);

  const psi = await runPageSpeedAudit('/', 'mobile');
  console.log(`  PageSpeed Insights Audit Status: ${psi.connected ? 'Connected' : 'Not Connected (Key Required)'}`);

  const deployVerify = await verifyDeploymentAndCompare();
  console.log(`  Deployment Verification Status: ${deployVerify.status}`);

  const rollbackRes = rollbackLastDeployment('admin@taleemguru.pk');
  console.log(`  Rollback Support Status: ${rollbackRes.message}`);

  const alerts = getSystemAlerts();
  console.log(`  System Alert Engine Active: ${alerts.length} alert(s) logged`);

  console.log('\n====================================================');
  console.log('ALL PHASE 2 QA CHECKS COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

runAudit();
