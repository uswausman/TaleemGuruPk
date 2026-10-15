console.log('Environment variables check:', {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'PRESENT (len=' + process.env.DATABASE_URL.length + ')' : 'MISSING',
  POSTGRES_URL: process.env.POSTGRES_URL ? 'PRESENT' : 'MISSING',
  SUPABASE_DATABASE_URL: process.env.SUPABASE_DATABASE_URL ? 'PRESENT' : 'MISSING',
  SQL_HOST: process.env.SQL_HOST ? 'PRESENT' : 'MISSING',
});
