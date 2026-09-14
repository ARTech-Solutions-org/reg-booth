import express, { type Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import publicRouter from './routes/public.js';
import authRouter from './routes/auth.js';
import attendeesRouter from './routes/attendees.js';
import checkInsRouter from './routes/check-ins.js';
import dashboardRouter from './routes/dashboard.js';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get(['/api', '/api/healthz'], (_req, res) => {
    res.json({ status: 'ok', service: 'EventPass API', timestamp: new Date().toISOString() });
  });

  // Mount API routes
  app.use('/api', publicRouter);
  app.use('/api', authRouter);
  app.use('/api', attendeesRouter);
  app.use('/api', checkInsRouter);
  app.use('/api', dashboardRouter);

  // Serve production client build if dist folder exists
  const possibleDistDirs = [
    process.env.CLIENT_DIST,
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), 'resources', 'app', 'dist'),
    path.join(__dirname, '..', 'dist'),
    path.join(__dirname, 'dist'),
  ].filter(Boolean) as string[];

  const clientDist = possibleDistDirs.find(d => {
    try {
      return fs.existsSync(d) && fs.existsSync(path.join(d, 'index.html'));
    } catch {
      return false;
    }
  });

  if (clientDist) {
    console.log(`[Event Server] Serving static client build from: ${clientDist}`);
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    console.warn('[Event Server] No client dist folder found. API routes available only.');
  }

  return app;
}
