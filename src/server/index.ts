import 'dotenv/config';
import { createApp } from './app.js';
import { db } from './db/index.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

async function start() {
  try {
    await db.init();
    const app = createApp();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Event Server] API listening on http://0.0.0.0:${PORT} (proxy: http://localhost:${PORT})`);
      console.log(`[Event Server] Ready for registrations and mobile scanner check-ins.`);
    });
  } catch (err) {
    console.error('[Event Server] Fatal startup error:', err);
    process.exit(1);
  }
}

start();
