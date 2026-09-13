import crypto from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';

const scrypt = promisify(crypto.scrypt);
export const COOKIE_NAME = 'event_checkin_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SessionPayload {
  username: string;
  expiresAt: number;
}

const getSecret = () => process.env.SESSION_SECRET || 'event-checkin-secure-default-secret-2026';

function sign(value: string): string {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function encodeSession(payload: SessionPayload): string {
  const value = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${value}.${sign(value)}`;
}

export function decodeSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expectedSig = sign(encoded);
  const expectedBuf = Buffer.from(expectedSig);
  const actualBuf = Buffer.from(signature);

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SessionPayload;
    if (!payload.username || !payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  return expectedBuf.length === derivedKey.length && crypto.timingSafeEqual(expectedBuf, derivedKey);
}

export function setSessionCookie(res: Response, username: string): void {
  const token = encodeSession({
    username,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSessionUser(req: Request) {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = decodeSession(token);
  if (!payload) return null;
  return db.getOrganizerUser(payload.username);
}

export async function requireOrganizer(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Organizer login required' });
    return;
  }
  (req as any).user = user;
  next();
}
