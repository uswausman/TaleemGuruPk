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

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development or static serving for production container
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
