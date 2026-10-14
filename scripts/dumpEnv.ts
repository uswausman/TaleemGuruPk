console.log('=== Environment Variables Inspection ===');
for (const key of Object.keys(process.env).sort()) {
  if (
    key.includes('DB') ||
    key.includes('POSTGRES') ||
    key.includes('PG') ||
    key.includes('SUPABASE') ||
    key.includes('VERCEL') ||
    key.includes('SQL') ||
    key.includes('URL')
  ) {
    const val = process.env[key];
    const masked = val && val.length > 15 ? val.substring(0, 10) + '...' + (val.includes('@') ? '@' + val.split('@')[1] : '') : val;
    console.log(`${key} = ${masked}`);
  }
}
