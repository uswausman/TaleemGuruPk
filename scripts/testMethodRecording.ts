import { recordLiveError, getLiveErrorLogs } from '../src/server/websiteHealthServer.ts';
import { db } from '../src/db/index.ts';
import { websiteErrorIncidents } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function runTest() {
  console.log('Running HTTP Method Recording Verification Test...');

  // Strict Safety Guard: Never execute against production or unverified remote databases.
  // Requires explicit ALLOW_INTEGRATION_TEST_DB_WRITES === 'true' AND verified localhost DATABASE_URL.
  const allowWrites = process.env.ALLOW_INTEGRATION_TEST_DB_WRITES === 'true';
  const dbUrl = process.env.DATABASE_URL || '';
  const isVerifiedLocal = dbUrl.includes('127.0.0.1') || dbUrl.includes('localhost');

  if (!allowWrites || !isVerifiedLocal || process.env.NODE_ENV === 'production') {
    console.warn('[SAFETY SHIELD] Refusing to execute live database mutation test.');
    console.warn('Live database mutations require ALLOW_INTEGRATION_TEST_DB_WRITES=true on a verified localhost DATABASE_URL.');
    console.warn('Test aborted safely without modifying database.');
    return;
  }

  const uniqueId = Date.now();
  const testRouteGet = `/test/route/get_${uniqueId}`;
  const testRoutePost = `/test/route/post_${uniqueId}`;
  const testRoutePut = `/test/route/put_${uniqueId}`;
  const testRouteDelete = `/test/route/delete_${uniqueId}`;

  // 1. Test GET (default / explicit)
  await recordLiveError({
    severity: 'WARN',
    category: 'API',
    method: 'GET',
    statusCode: 400,
    route: testRouteGet,
    errorMessage: 'Test GET error',
  });

  // 2. Test POST
  await recordLiveError({
    severity: 'WARN',
    category: 'API',
    method: 'POST',
    statusCode: 400,
    route: testRoutePost,
    errorMessage: 'Test POST error',
  });

  // 3. Test PUT
  await recordLiveError({
    severity: 'WARN',
    category: 'API',
    method: 'PUT',
    statusCode: 400,
    route: testRoutePut,
    errorMessage: 'Test PUT error',
  });

  // 4. Test DELETE
  await recordLiveError({
    severity: 'WARN',
    category: 'API',
    method: 'DELETE',
    statusCode: 400,
    route: testRouteDelete,
    errorMessage: 'Test DELETE error',
  });

  const logs = await getLiveErrorLogs({ limit: 50 });

  const getLog = logs.find((l) => l.route === testRouteGet);
  const postLog = logs.find((l) => l.route === testRoutePost);
  const putLog = logs.find((l) => l.route === testRoutePut);
  const deleteLog = logs.find((l) => l.route === testRouteDelete);

  console.log('GET Log found:', !!getLog);
  console.log('POST Log found:', !!postLog);
  console.log('PUT Log found:', !!putLog);
  console.log('DELETE Log found:', !!deleteLog);

  if (db) {
    const postDbRow = await db.select().from(websiteErrorIncidents).where(eq(websiteErrorIncidents.route, testRoutePost)).limit(1);
    const putDbRow = await db.select().from(websiteErrorIncidents).where(eq(websiteErrorIncidents.route, testRoutePut)).limit(1);
    const deleteDbRow = await db.select().from(websiteErrorIncidents).where(eq(websiteErrorIncidents.route, testRouteDelete)).limit(1);

    console.log('POST DB Method:', postDbRow[0]?.method);
    console.log('PUT DB Method:', putDbRow[0]?.method);
    console.log('DELETE DB Method:', deleteDbRow[0]?.method);

    const success = 
      postDbRow[0]?.method === 'POST' &&
      putDbRow[0]?.method === 'PUT' &&
      deleteDbRow[0]?.method === 'DELETE';

    if (success) {
      console.log('TEST RESULT: PASS');
      process.exit(0);
    } else {
      console.error('TEST RESULT: FAIL - Methods did not match expected values.');
      process.exit(1);
    }
  } else {
    console.log('Database not initialized for direct query test, skipping db assertion.');
    process.exit(0);
  }
}

runTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
