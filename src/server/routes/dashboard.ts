import { Router } from 'express';
import { db } from '../db/index.js';
import { requireOrganizer } from '../lib/auth.js';

const router = Router();
router.use('/dashboard', requireOrganizer);

router.get('/dashboard/summary', async (_req, res): Promise<void> => {
  try {
    const summary = await db.getDashboardSummary();
    res.json(summary);
  } catch (err: any) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

export default router;
