import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/server/app.js';
import { db } from '../src/server/db/index.js';

let appInstance: any = null;
let dbReady = false;

async function ensureDbReady() {
  if (dbReady) return;
  // Each cold-start attempt: if it fails, we throw so the handler returns 500
  // and the NEXT request will retry (dbReady stays false)
  await db.init();
  dbReady = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureDbReady();

    if (!appInstance) {
      appInstance = createApp();
    }

    return appInstance(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Handler Error]:', err.message, err.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred.',
    });
  }
}
