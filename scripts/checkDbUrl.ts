import { resolveDatabaseConnectionString, sanitizeSupabaseConnectionString } from '../src/db/index';

const raw = process.env.DATABASE_URL || '';
console.log('Raw DATABASE_URL present:', Boolean(raw));
try {
  const parsed = new URL(raw);
  console.log('Parsed hostname:', parsed.hostname);
  console.log('Parsed username:', parsed.username);
  console.log('Parsed port:', parsed.port);
  const sanitized = sanitizeSupabaseConnectionString(raw);
  const sParsed = new URL(sanitized);
  console.log('Sanitized hostname:', sParsed.hostname);
  console.log('Sanitized username:', sParsed.username);
  console.log('Sanitized port:', sParsed.port);
} catch (e) {
  console.error('URL parse error:', e);
}
