import { Router } from 'express';
import { db } from '../db/index.js';
import { setSessionCookie, clearSessionCookie, getSessionUser, verifyPassword } from '../lib/auth.js';

const router = Router();

router.post('/auth/login', async (req, res): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Please enter both username and password.' });
    return;
  }

  const user = await db.getOrganizerUserWithHash(username.trim());
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  setSessionCookie(res, user.username);
  res.json({
    user: {
      username: user.username,
      displayName: user.displayName,
    },
  });
});

router.post('/auth/logout', (_req, res): void => {
  clearSessionCookie(res);
  res.status(204).end();
});

router.get('/auth/me', async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json(user);
});

export default router;
