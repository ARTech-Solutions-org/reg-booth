import { Router } from 'express';
import { db } from '../db/index.js';
import { requireOrganizer } from '../lib/auth.js';

const router = Router();

// List attendees with optional search and filter (Organizers only)
router.get('/attendees', requireOrganizer, async (req, res): Promise<void> => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const status = typeof req.query.status === 'string' && ['all', 'checked-in', 'pending'].includes(req.query.status)
    ? (req.query.status as 'all' | 'checked-in' | 'pending')
    : 'all';

  try {
    const attendees = await db.getAttendees({ q, status });
    res.json(attendees);
  } catch (err: any) {
    console.error('Error fetching attendees:', err);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

// Admin walk-in on-site registration (Immediately marks checked in + returns QR ID for badge printing)
router.post('/attendees/walk-in', async (req, res): Promise<void> => {
  const { name, email, company, ticketType, autoCheckIn } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required for walk-in attendee.' });
    return;
  }

  if (!company || typeof company !== 'string' || !company.trim()) {
    res.status(400).json({ error: 'Organization / Company is required.' });
    return;
  }

  if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }

  try {
    const attendee = await db.createAttendee({
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      ticketType: ticketType && typeof ticketType === 'string' ? ticketType.trim() : 'General',
      checkedIn: autoCheckIn === true, // Default to false so attendee pass can be scanned at the entrance scanner gun
    });

    res.status(201).json({
      status: 'valid',
      message: `Walk-in registration complete! ${attendee.name}'s pass is ready.`,
      attendee,
    });
  } catch (err: any) {
    console.error('Walk-in creation error:', err);
    res.status(500).json({ error: 'Failed to register walk-in attendee.' });
  }
});

// Standard attendee creation (Organizers only)
router.post('/attendees/create', requireOrganizer, async (req, res): Promise<void> => {
  const { name, email, company, ticketType, qrId } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required.' });
    return;
  }

  if (!company || typeof company !== 'string' || !company.trim()) {
    res.status(400).json({ error: 'Organization / Company is required.' });
    return;
  }

  if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }

  try {
    const attendee = await db.createAttendee({
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
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
router.post('/attendees/import', requireOrganizer, async (req, res): Promise<void> => {
  const { attendees } = req.body;

  if (!Array.isArray(attendees) || attendees.length === 0) {
    res.status(400).json({ error: 'Valid attendees list required.' });
    return;
  }

  try {
    let imported = 0;
    const createdList = [];

    for (const item of attendees) {
      if (!item.name || !item.name.trim()) continue;
      const created = await db.createAttendee({
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
  } catch (err: any) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Failed to import attendees.' });
  }
});

export default router;
