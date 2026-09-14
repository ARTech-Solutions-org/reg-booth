import 'dotenv/config';
import { createApp } from './app.js';
import { db } from './db/index.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

async function start() {
  try {
    const app = createApp();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Event Server] API listening on http://0.0.0.0:${PORT} (proxy: http://localhost:${PORT})`);
      console.log(`[Event Server] Ready for registrations and mobile scanner check-ins.`);
    });

    // Background DB initialization so UI responds immediately
    db.init()
      .then(() => {
        console.log('[Event Server] Neon PostgreSQL connection verified and tables ready.');
      })
      .catch((err) => {
        console.warn('[Event Server] DB init will retry on first request:', err?.message || err);
      });
  } catch (err) {
    console.error('[Event Server] Fatal server listen error:', err);
  }
}

start();
