import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();
// Check-ins can be initiated from the entrance kiosk terminal

router.post('/check-ins', async (req, res): Promise<void> => {
  const { qrId } = req.body;

  if (!qrId || typeof qrId !== 'string' || !qrId.trim()) {
    res.status(400).json({
      status: 'invalid',
      message: 'Please provide or scan a valid QR code ID.',
      attendee: null,
    });
    return;
  }

  try {
    const result = await db.checkInAttendee(qrId.trim());
    res.json(result);
  } catch (err: any) {
    console.error('Check-in error:', err);
    res.status(500).json({
      status: 'invalid',
      message: 'Failed to process check-in. Please try again.',
      attendee: null,
    });
  }
});

export default router;
