import { ENTRY_TESTS_DATA } from '../src/data/mockData';
import { ENTRY_TEST_TABS, normalizeTabId, matchesEntryTestCategory } from '../src/components/EntryTestsView';
import { normalizePath, resolveRoute, viewToCanonicalPath } from '../src/lib/routeGuards';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('--- STARTING ENTRY TEST TABS VERIFICATION ---');

  // 1. Verify standard tabs exist
  const expectedTabs = ['All', 'MDCAT', 'ECAT', 'CSS', 'PMS', 'Armed Forces'];
  const tabIds = ENTRY_TEST_TABS.map(t => t.id);
  for (const expected of expectedTabs) {
    assert(tabIds.includes(expected), `Tab list contains expected tab "${expected}"`);
  }

  // 2. Verify Tab normalization
  assert(normalizeTabId('all') === 'All', 'normalizeTabId("all") -> "All"');
  assert(normalizeTabId('MDCAT') === 'MDCAT', 'normalizeTabId("MDCAT") -> "MDCAT"');
  assert(normalizeTabId('mdcat') === 'MDCAT', 'normalizeTabId("mdcat") -> "MDCAT"');
  assert(normalizeTabId('ECAT') === 'ECAT', 'normalizeTabId("ECAT") -> "ECAT"');
  assert(normalizeTabId('ecat') === 'ECAT', 'normalizeTabId("ecat") -> "ECAT"');
  assert(normalizeTabId('CSS') === 'CSS', 'normalizeTabId("CSS") -> "CSS"');
  assert(normalizeTabId('css') === 'CSS', 'normalizeTabId("css") -> "CSS"');
  assert(normalizeTabId('PMS') === 'PMS', 'normalizeTabId("PMS") -> "PMS"');
  assert(normalizeTabId('pms') === 'PMS', 'normalizeTabId("pms") -> "PMS"');
  assert(normalizeTabId('Armed Forces') === 'Armed Forces', 'normalizeTabId("Armed Forces") -> "Armed Forces"');
  assert(normalizeTabId('armed-forces') === 'Armed Forces', 'normalizeTabId("armed-forces") -> "Armed Forces"');
  assert(normalizeTabId('army') === 'Armed Forces', 'normalizeTabId("army") -> "Armed Forces"');
  assert(normalizeTabId('navy') === 'Armed Forces', 'normalizeTabId("navy") -> "Armed Forces"');

  // 3. Test matching on ENTRY_TESTS_DATA
  const allTests = ENTRY_TESTS_DATA;
  console.log(`Total tests in master dataset: ${allTests.length}`);

  // Test "All" tab
  const allFiltered = allTests.filter(t => matchesEntryTestCategory(t, 'All'));
  assert(allFiltered.length === allTests.length, `"All" tab returns all ${allTests.length} tests`);

  // Test "MDCAT" tab
  const mdcatFiltered = allTests.filter(t => matchesEntryTestCategory(t, 'MDCAT'));
  assert(mdcatFiltered.length >= 2, `MDCAT returns >= 2 medical tests (Found ${mdcatFiltered.length})`);
  assert(mdcatFiltered.some(t => t.id === 'mdcat'), 'MDCAT contains "mdcat"');
  assert(mdcatFiltered.some(t => t.id === 'nums'), 'MDCAT contains "nums"');
  assert(!mdcatFiltered.some(t => t.id === 'css-mpt'), 'MDCAT does not contain CSS');

  // Test "ECAT" tab
  const ecatFiltered = allTests.filter(t => matchesEntryTestCategory(t, 'ECAT'));
  assert(ecatFiltered.length >= 4, `ECAT returns >= 4 engineering tests (Found ${ecatFiltered.length})`);
  assert(ecatFiltered.some(t => t.id === 'ecat'), 'ECAT contains "ecat"');
  assert(ecatFiltered.some(t => t.id === 'nust-net'), 'ECAT contains "nust-net"');
  assert(!ecatFiltered.some(t => t.id === 'pms'), 'ECAT does not contain PMS');

  // Test "CSS" tab
  const cssFiltered = allTests.filter(t => matchesEntryTestCategory(t, 'CSS'));
  assert(cssFiltered.length >= 1, `CSS returns >= 1 test (Found ${cssFiltered.length})`);
  assert(cssFiltered.some(t => t.id === 'css-mpt' || t.name.includes('CSS')), 'CSS tab contains CSS test');
  assert(!cssFiltered.some(t => t.id === 'mdcat'), 'CSS tab does not contain MDCAT');

  // Test "PMS" tab
  const pmsFiltered = allTests.filter(t => matchesEntryTestCategory(t, 'PMS'));
  assert(pmsFiltered.length >= 1, `PMS returns >= 1 test (Found ${pmsFiltered.length})`);
  assert(pmsFiltered.some(t => t.id === 'pms' || t.name.includes('PMS')), 'PMS tab contains PMS test');
  assert(!pmsFiltered.some(t => t.id === 'ecat'), 'PMS tab does not contain ECAT');

  // Test "Armed Forces" tab
  const armedFiltered = allTests.filter(t => matchesEntryTestCategory(t, 'Armed Forces'));
  assert(armedFiltered.length >= 3, `Armed Forces returns >= 3 tests for Army, Navy, PAF (Found ${armedFiltered.length})`);
  assert(armedFiltered.some(t => t.id === 'pak-army'), 'Armed Forces contains Pakistan Army');
  assert(armedFiltered.some(t => t.id === 'pak-navy'), 'Armed Forces contains Pakistan Navy');
  assert(armedFiltered.some(t => t.id === 'pak-airforce'), 'Armed Forces contains Pakistan Air Force');
  assert(!armedFiltered.some(t => t.id === 'mdcat'), 'Armed Forces does not contain MDCAT');

  // 4. Test URL routes and query parameters
  const cssRoute = resolveRoute('/entry-tests?category=css');
  assert(cssRoute.view === 'entry-tests', 'URL /entry-tests?category=css resolves to entry-tests view');
  assert(cssRoute.subFilter === 'CSS', `URL /entry-tests?category=css sets subFilter to "CSS" (got "${cssRoute.subFilter}")`);

  const pmsRoute = resolveRoute('/entry-tests?category=pms');
  assert(pmsRoute.view === 'entry-tests', 'URL /entry-tests?category=pms resolves to entry-tests view');
  assert(pmsRoute.subFilter === 'PMS', `URL /entry-tests?category=pms sets subFilter to "PMS" (got "${pmsRoute.subFilter}")`);

  const armedRoute = resolveRoute('/entry-tests?category=armed-forces');
  assert(armedRoute.view === 'entry-tests', 'URL /entry-tests?category=armed-forces resolves to entry-tests view');
  assert(armedRoute.subFilter === 'Armed Forces', `URL /entry-tests?category=armed-forces sets subFilter to "Armed Forces" (got "${armedRoute.subFilter}")`);

  const mdcatRoute = resolveRoute('/entry-tests/mdcat');
  assert(mdcatRoute.subFilter === 'MDCAT', 'URL /entry-tests/mdcat sets subFilter to "MDCAT"');

  const ecatRoute = resolveRoute('/entry-tests/ecat');
  assert(ecatRoute.subFilter === 'ECAT', 'URL /entry-tests/ecat sets subFilter to "ECAT"');

  console.log('\n🎉 ALL ENTRY TEST TABS TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
