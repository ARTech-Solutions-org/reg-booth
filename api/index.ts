import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/server/app.js';
import { db } from '../src/server/db/index.js';

let appInstance: any = null;
let initPromise: Promise<void> | null = null;

async function getApp() {
  if (!initPromise) {
    initPromise = db.init().catch((err) => {
      console.error('[Vercel Serverless] DB init error:', err);
    });
  }
  await initPromise;

  if (!appInstance) {
    appInstance = createApp();
  }
  return appInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Handler Error]:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred.',
    });
  }
}
