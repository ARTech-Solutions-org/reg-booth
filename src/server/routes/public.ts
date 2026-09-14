import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// Public attendee self-registration
router.post('/public/register', async (req, res): Promise<void> => {
  const { name, email, company, ticketType } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Full name is required.' });
    return;
  }

  if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }

  if (!company || typeof company !== 'string' || !company.trim()) {
    res.status(400).json({ error: 'Organization / Company is required.' });
    return;
  }

  try {
    const attendee = await db.createAttendee({
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      ticketType: ticketType && typeof ticketType === 'string' ? ticketType.trim() : 'General',
      checkedIn: false,
    });

    res.status(201).json({
      message: 'Registration successful! Your QR pass is ready.',
      attendee,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to process registration. Please try again.' });
  }
});

// Public event info
router.get('/public/event-info', (_req, res): void => {
  res.json({
    eventName: 'ARTECH • LIVE THE EXPERIENCE',
    date: 'September 2026',
    location: 'ARTECH Main Pavilion — Access Gate 1',
    ticketTypes: ['General', 'VIP', 'Speaker', 'Press', 'Staff'],
  });
});

export default router;
