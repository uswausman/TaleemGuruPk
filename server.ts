import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

// Normalize Supabase URLs at process boot to prevent /rest/v1/ suffix issues
if (process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}
if (process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

import app from './src/serverApp.ts';
import { migrateExistingDocuments } from './src/server/migrateDocuments.ts';

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Vite middleware for development or static serving for production container
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
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
