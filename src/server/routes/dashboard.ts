import { Router } from 'express';
import { db } from '../db/index.js';
import { requireOrganizer } from '../lib/auth.js';

const router = Router();
router.use('/dashboard', requireOrganizer);

router.get('/dashboard/summary', (_req, res): void => {
  const summary = db.getDashboardSummary();
  res.json(summary);
});

export default router;
