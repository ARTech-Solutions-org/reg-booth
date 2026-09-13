import { Router } from 'express';
import { db } from '../db/index.js';
import { requireOrganizer } from '../lib/auth.js';

const router = Router();
// Check-ins can be initiated from the entrance kiosk terminal


router.post('/check-ins', (req, res): void => {
  const { qrId } = req.body;

  if (!qrId || typeof qrId !== 'string' || !qrId.trim()) {
    res.status(400).json({
      status: 'invalid',
      message: 'Please provide or scan a valid QR code ID.',
      attendee: null,
    });
    return;
  }

  const result = db.checkInAttendee(qrId.trim());
  res.json(result);
});

export default router;
