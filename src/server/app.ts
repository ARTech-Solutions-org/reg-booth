import express, { type Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import publicRouter from './routes/public.js';
import authRouter from './routes/auth.js';
import attendeesRouter from './routes/attendees.js';
import checkInsRouter from './routes/check-ins.js';
import dashboardRouter from './routes/dashboard.js';

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
  const clientDist = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
