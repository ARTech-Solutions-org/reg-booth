import crypto from 'node:crypto';
import pg from 'pg';
import type { Attendee, DashboardSummary, CheckInResult } from '../../shared/types.js';

const { Pool } = pg;

export interface OrganizerRecord {
  id: number;
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

function mapRowToAttendee(row: any): Attendee {
  return {
    id: row.id,
    qrId: row.qr_id,
    name: row.name,
    email: row.email || null,
    company: row.company || null,
    ticketType: row.ticket_type || 'General',
    checkedInAt: row.checked_in_at ? new Date(row.checked_in_at).toISOString() : null,
    badgePrinted: row.badge_printed === true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

const DEFAULT_DATABASE_URL = 'postgresql://neondb_owner:npg_SwpcZsGgx6K1@ep-odd-hall-a5tabuwm-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

class EventDatabase {
  private pool: pg.Pool | null = null;
  private initPromise: Promise<void> | null = null;

  private getPool(): pg.Pool {
    if (!this.pool) {
      const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
      this.pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 20000,
        keepAlive: true,
      });

      this.pool.on('error', (err) => {
        console.error('[Database Pool Error]:', err);
      });
    }
    return this.pool;
  }

  public async queryWithRetry(text: string, params?: any[]): Promise<pg.QueryResult<any>> {
    const pool = this.getPool();
    try {
      return await pool.query(text, params);
    } catch (err: any) {
      const isConnectionError =
        err?.message?.includes('Connection terminated') ||
        err?.message?.includes('timeout') ||
        err?.code === 'ECONNRESET' ||
        err?.code === '57P01';

      if (isConnectionError) {
        console.warn('[Database] Connection dropped or timed out, retrying query...');
        return await pool.query(text, params);
      }
      throw err;
    }
  }

  public async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this._initInternal().catch((err) => {
        this.initPromise = null;
        throw err;
      });
    }
    return this.initPromise;
  }

  private async _initInternal(): Promise<void> {
    const pool = this.getPool();

    // 1. Create tables (badge_printed included for fresh DBs)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendees (
        id SERIAL PRIMARY KEY,
        qr_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        company VARCHAR(255),
        ticket_type VARCHAR(50) DEFAULT 'General',
        checked_in_at TIMESTAMPTZ,
        badge_printed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_attendees_qr_id ON attendees(qr_id);

      CREATE TABLE IF NOT EXISTS organizers (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 1b. Safe migration: add badge_printed to existing DBs that pre-date this column
    await pool.query(`
      ALTER TABLE attendees
      ADD COLUMN IF NOT EXISTS badge_printed BOOLEAN NOT NULL DEFAULT FALSE
    `);

    // 2. Seed organizer if table is empty
    const orgCheck = await pool.query('SELECT COUNT(*) FROM organizers');
    if (parseInt(orgCheck.rows[0].count, 10) === 0) {
      const { hashPassword } = await import('../lib/auth.js');
      const defaultPassword = process.env.ORGANIZER_PASSWORD || 'welcome123';
      const passwordHash = await hashPassword(defaultPassword);

      await pool.query(
        `INSERT INTO organizers (username, display_name, password_hash) VALUES ($1, $2, $3)`,
        ['organizer', 'Event Lead Organizer', passwordHash]
      );
      console.log('[Database] Default organizer account initialized (user: organizer).');
    }

    // 3. Seed initial sample attendees if table is empty
    const attendeeCheck = await pool.query('SELECT COUNT(*) FROM attendees');
    if (parseInt(attendeeCheck.rows[0].count, 10) === 0) {
      const samples = [
        { qrId: 'EVT-7Q4M-001', name: 'Jordan Lee', email: 'jordan@example.com', company: 'Apex Tech Inc.', ticketType: 'General' },
        { qrId: 'EVT-7Q4M-002', name: 'Maya Patel', email: 'maya@example.com', company: 'Horizon Design Co.', ticketType: 'VIP' },
        { qrId: 'EVT-7Q4M-003', name: 'Dr. Theo Martin', email: 'theo@example.com', company: 'Nova Institute', ticketType: 'Speaker' },
        { qrId: 'EVT-9BHY-2S5Y', name: 'Samantha Reed', email: 'samantha@biotech.org', company: 'BioTech Innovations', ticketType: 'VIP' },
      ];

      for (const s of samples) {
        await pool.query(
          `INSERT INTO attendees (qr_id, name, email, company, ticket_type) VALUES ($1, $2, $3, $4, $5)`,
          [s.qrId, s.name, s.email, s.company, s.ticketType]
        );
      }
      console.log('[Database] Initial attendees seeded.');
    }
  }

  public generateUniqueQrId(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return `EVT-${code.slice(0, 4)}-${code.slice(4)}`;
  }

  public async getAttendees(filters?: { q?: string; status?: 'all' | 'checked-in' | 'pending' }): Promise<Attendee[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters?.q && filters.q.trim()) {
      values.push(`%${filters.q.trim().toLowerCase()}%`);
      const idx = values.length;
      conditions.push(`(
        LOWER(name) LIKE $${idx} OR
        LOWER(COALESCE(email, '')) LIKE $${idx} OR
        LOWER(COALESCE(company, '')) LIKE $${idx} OR
        LOWER(qr_id) LIKE $${idx}
      )`);
    }

    if (filters?.status === 'checked-in') {
      conditions.push('checked_in_at IS NOT NULL');
    } else if (filters?.status === 'pending') {
      conditions.push('checked_in_at IS NULL');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await this.queryWithRetry(
      `SELECT * FROM attendees ${whereClause} ORDER BY id DESC`,
      values
    );

    return res.rows.map(mapRowToAttendee);
  }

  public async getAttendeeByQrId(qrId: string): Promise<Attendee | null> {
    const res = await this.queryWithRetry(
      `SELECT * FROM attendees WHERE UPPER(qr_id) = UPPER($1) LIMIT 1`,
      [qrId.trim()]
    );
    if (res.rows.length === 0) return null;
    return mapRowToAttendee(res.rows[0]);
  }

  public async getAttendeeById(id: number): Promise<Attendee | null> {
    const res = await this.queryWithRetry(`SELECT * FROM attendees WHERE id = $1 LIMIT 1`, [id]);
    if (res.rows.length === 0) return null;
    return mapRowToAttendee(res.rows[0]);
  }

  public async createAttendee(data: {
    name: string;
    email?: string | null;
    company?: string | null;
    ticketType?: string;
    qrId?: string;
    checkedIn?: boolean;
  }): Promise<Attendee> {
    let qrId = data.qrId?.trim();
    if (!qrId) {
      let isUnique = false;
      while (!isUnique) {
        qrId = this.generateUniqueQrId();
        const existing = await this.queryWithRetry('SELECT id FROM attendees WHERE qr_id = $1', [qrId]);
        if (existing.rows.length === 0) {
          isUnique = true;
        }
      }
    }

    const checkedInAt = data.checkedIn ? new Date() : null;

    const res = await this.queryWithRetry(
      `INSERT INTO attendees (qr_id, name, email, company, ticket_type, checked_in_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        qrId,
        data.name.trim(),
        data.email?.trim() || null,
        data.company?.trim() || null,
        data.ticketType?.trim() || 'General',
        checkedInAt,
      ]
    );

    return mapRowToAttendee(res.rows[0]);
  }

  public async checkInAttendee(qrId: string): Promise<CheckInResult> {
    const attendee = await this.getAttendeeByQrId(qrId);

    if (!attendee) {
      return {
        status: 'invalid',
        message: 'This QR code is not registered for this event.',
        attendee: null,
      };
    }

    if (attendee.checkedInAt) {
      return {
        status: 'duplicate',
        message: `${attendee.name} has already checked in.`,
        attendee,
      };
    }

    const res = await this.queryWithRetry(
      `UPDATE attendees SET checked_in_at = NOW() WHERE id = $1 RETURNING *`,
      [attendee.id]
    );

    const updated = mapRowToAttendee(res.rows[0]);
    return {
      status: 'valid',
      message: `${updated.name} successfully checked in.`,
      attendee: updated,
    };
  }

  /**
   * Atomically marks badge_printed = TRUE only if it was FALSE before.
   * Returns alreadyPrinted=true when the badge was already marked — DB-level print-once enforcement.
   */
  public async markBadgePrinted(attendeeId: number): Promise<{ attendee: Attendee; alreadyPrinted: boolean }> {
    // Conditional update: only updates rows where badge_printed is still FALSE
    const res = await this.queryWithRetry(
      `UPDATE attendees
       SET badge_printed = TRUE
       WHERE id = $1 AND badge_printed = FALSE
       RETURNING *`,
      [attendeeId]
    );

    if (res.rowCount === 0) {
      // Already printed — fetch current state and return it
      const current = await this.queryWithRetry(
        `SELECT * FROM attendees WHERE id = $1`,
        [attendeeId]
      );
      if (current.rows.length === 0) throw new Error('Attendee not found.');
      return { attendee: mapRowToAttendee(current.rows[0]), alreadyPrinted: true };
    }

    return { attendee: mapRowToAttendee(res.rows[0]), alreadyPrinted: false };
  }

  public async getDashboardSummary(): Promise<DashboardSummary> {
    const [totalRes, checkedInRes, recentRes] = await Promise.all([
      this.queryWithRetry('SELECT COUNT(*) FROM attendees'),
      this.queryWithRetry('SELECT COUNT(*) FROM attendees WHERE checked_in_at IS NOT NULL'),
      this.queryWithRetry(`
        SELECT name, ticket_type, company, checked_in_at
        FROM attendees
        WHERE checked_in_at IS NOT NULL
        ORDER BY checked_in_at DESC
        LIMIT 8
      `),
    ]);

    const total = parseInt(totalRes.rows[0].count, 10) || 0;
    const checkedIn = parseInt(checkedInRes.rows[0].count, 10) || 0;
    const remaining = Math.max(0, total - checkedIn);

    const recentCheckIns = recentRes.rows.map((r) => ({
      name: r.name,
      ticketType: r.ticket_type,
      company: r.company || undefined,
      checkedInAt: new Date(r.checked_in_at).toISOString(),
    }));

    return {
      total,
      checkedIn,
      remaining,
      recentCheckIns,
    };
  }

  public async getOrganizerUser(username: string): Promise<{ username: string; displayName: string } | null> {
    const res = await this.queryWithRetry(
      `SELECT username, display_name FROM organizers WHERE LOWER(username) = LOWER($1) LIMIT 1`,
      [username.trim()]
    );
    if (res.rows.length === 0) return null;
    return {
      username: res.rows[0].username,
      displayName: res.rows[0].display_name,
    };
  }

  public async getOrganizerUserWithHash(username: string): Promise<OrganizerRecord | null> {
    const res = await this.queryWithRetry(
      `SELECT id, username, display_name, password_hash, created_at FROM organizers WHERE LOWER(username) = LOWER($1) LIMIT 1`,
      [username.trim()]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      passwordHash: r.password_hash,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }
}

export const db = new EventDatabase();
