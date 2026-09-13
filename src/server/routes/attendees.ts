import { Router } from 'express';
import { db } from '../db/index.js';
import { requireOrganizer } from '../lib/auth.js';

const router = Router();

// List attendees with optional search and filter (Organizers only)
router.get('/attendees', requireOrganizer, (req, res): void => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const status = typeof req.query.status === 'string' && ['all', 'checked-in', 'pending'].includes(req.query.status)
    ? (req.query.status as 'all' | 'checked-in' | 'pending')
    : 'all';

  const attendees = db.getAttendees({ q, status });
  res.json(attendees);
});

// Admin walk-in on-site registration (Immediately marks checked in + returns QR ID for badge printing)
router.post('/attendees/walk-in', (req, res): void => {
  const { name, email, company, ticketType } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required for walk-in attendee.' });
    return;
  }

  try {
    const attendee = db.createAttendee({
      name: name.trim(),
      email: email && typeof email === 'string' ? email.trim() : null,
      company: company && typeof company === 'string' ? company.trim() : null,
      ticketType: ticketType && typeof ticketType === 'string' ? ticketType.trim() : 'General',
      checkedIn: true, // Walk-in is present on-site, immediately checked in!
    });

    res.status(201).json({
      status: 'valid',
      message: `Walk-in registration complete! ${attendee.name} is checked in.`,
      attendee,
    });
  } catch (err: any) {
    console.error('Walk-in creation error:', err);
    res.status(500).json({ error: 'Failed to register walk-in attendee.' });
  }
});

// Standard attendee creation (Organizers only)
router.post('/attendees/create', requireOrganizer, (req, res): void => {
  const { name, email, company, ticketType, qrId } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required.' });
    return;
  }

  try {
    const attendee = db.createAttendee({
      name: name.trim(),
      email: email && typeof email === 'string' ? email.trim() : null,
      company: company && typeof company === 'string' ? company.trim() : null,
      ticketType: ticketType && typeof ticketType === 'string' ? ticketType.trim() : 'General',
      qrId: qrId && typeof qrId === 'string' ? qrId.trim() : undefined,
      checkedIn: false,
    });

    res.status(201).json(attendee);
  } catch (err: any) {
    console.error('Attendee creation error:', err);
    res.status(500).json({ error: 'Failed to create attendee.' });
  }
});

// Bulk CSV import (Organizers only)
router.post('/attendees/import', requireOrganizer, (req, res): void => {
  const { attendees } = req.body;

  if (!Array.isArray(attendees) || attendees.length === 0) {
    res.status(400).json({ error: 'Valid attendees list required.' });
    return;
  }

  let imported = 0;
  const createdList = [];

  for (const item of attendees) {
    if (!item.name || !item.name.trim()) continue;
    const created = db.createAttendee({
      name: item.name.trim(),
      email: item.email?.trim() || null,
      company: item.company?.trim() || null,
      ticketType: item.ticketType?.trim() || 'General',
      qrId: item.qrId?.trim() || undefined,
      checkedIn: false,
    });
    createdList.push(created);
    imported++;
  }

  res.status(201).json({
    imported,
    skipped: attendees.length - imported,
    attendees: createdList,
  });
});

export default router;
