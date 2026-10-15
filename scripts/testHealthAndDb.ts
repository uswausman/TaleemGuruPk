import { checkDatabaseHealth } from '../src/server/productionReliability';
import { resolveDatabaseConnectionString } from '../src/db/index';

async function testHealth() {
  console.log('=== Testing Database Health Check ===');
  const resolved = resolveDatabaseConnectionString();
  console.log('Resolved DB config:', {
    envVar: resolved?.selectedEnvVar,
    hasUrl: Boolean(resolved?.url),
  });

  const health = await checkDatabaseHealth();
  console.log('Health check result:', health);
}

testHealth().catch(console.error);
