import fs from 'fs';
import path from 'path';
import express from 'express';

// Normalize Supabase URLs at process boot to prevent /rest/v1/ suffix issues
if (process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}
if (process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

import app from './src/serverApp.ts';
import { migrateExistingDocuments } from './src/server/migrateDocuments.ts';

function resolvePort(): number {
  const cliPortIndex = process.argv.indexOf('--port');
  if (cliPortIndex !== -1 && process.argv[cliPortIndex + 1]) {
    const parsed = parseInt(process.argv[cliPortIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.DEFAULT_APP_PORT) {
    const parsed = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // In AI Studio / Cloud Run container, Nginx binds to 8080 and proxies to 3000.
  // Never bind Node directly to 8080 to prevent EADDRINUSE crash.
  if (process.env.PORT && process.env.PORT !== '8080') {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

async function startServer() {
  const PORT = resolvePort();
  const cwd = process.cwd();
  const distDir = path.join(cwd, 'dist');
  const buildDir = path.join(cwd, 'build');
  const distIndexHtml = path.join(distDir, 'index.html');
  const buildIndexHtml = path.join(buildDir, 'index.html');
  const hasBuiltAssets = fs.existsSync(distIndexHtml) || fs.existsSync(buildIndexHtml);

  const isExplicitDev =
    process.env.npm_lifecycle_event === 'dev' ||
    process.argv.includes('--dev') ||
    (!hasBuiltAssets && process.env.NODE_ENV !== 'production');

  // Vite middleware for development or static serving for production container
  if (isExplicitDev && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const staticDir = fs.existsSync(distIndexHtml) ? distDir : buildDir;
    app.use(express.static(staticDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TaleemGuru] Server running on http://localhost:${PORT} (PID: ${process.pid})`);

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

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[TaleemGuru] FATAL: Port ${PORT} is already in use. Retrying or terminating...`);
    } else {
      console.error('[TaleemGuru] Server error:', err);
    }
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('[TaleemGuru] Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
