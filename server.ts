import fs from 'fs';
import path from 'path';
import express from 'express';

// Normalize Supabase URLs at process boot to strip accidental wrapping quotes and /rest/v1/ suffix issues
const normalizeBootUrl = (val?: string) => {
  if (!val || typeof val !== 'string') return val;
  let s = val.trim().replace(/^\uFEFF/, '').trim();
  while (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};
if (process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = normalizeBootUrl(process.env.VITE_SUPABASE_URL);
}
if (process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = normalizeBootUrl(process.env.SUPABASE_URL);
}

import app from './src/serverApp.ts';
import { migrateExistingDocuments } from './src/server/migrateDocuments.ts';

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Vite middleware for development or static serving for production container
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : path.join(process.cwd(), 'build');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Run safe, idempotent document migration in the background
    migrateExistingDocuments()
      .then((summary) => {
        console.log(
          `[Document Migration] Finished. Papers migrated: ${summary.pastPapersMigrated} (skipped: ${summary.pastPapersSkipped}), Notes migrated: ${summary.studyNotesMigrated} (skipped: ${summary.studyNotesSkipped})`
        );
      })
      .catch((err) => {
        console.error('[Document Migration] Error during background migration:', err);
      });
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
