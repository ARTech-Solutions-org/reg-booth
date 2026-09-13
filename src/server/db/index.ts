import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Attendee, DashboardSummary } from '../../shared/types.js';

export interface OrganizerRecord {
  id: number;
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

interface DatabaseState {
  attendees: Attendee[];
  organizers: OrganizerRecord[];
  nextAttendeeId: number;
  nextOrganizerId: number;
}

class EventDatabase {
  private dataDir: string;
  private dbFilePath: string;
  private state: DatabaseState = {
    attendees: [],
    organizers: [],
    nextAttendeeId: 1,
    nextOrganizerId: 1,
  };
  private isInitialized = false;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'data');
    this.dbFilePath = path.join(this.dataDir, 'event-data.json');
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = {
          attendees: parsed.attendees || [],
          organizers: parsed.organizers || [],
          nextAttendeeId: parsed.nextAttendeeId || (parsed.attendees?.length ? Math.max(...parsed.attendees.map((a: any) => a.id)) + 1 : 1),
          nextOrganizerId: parsed.nextOrganizerId || (parsed.organizers?.length ? Math.max(...parsed.organizers.map((o: any) => o.id)) + 1 : 1),
        };
      } catch (err) {
        console.error('Failed to parse existing event database file, initializing fresh store:', err);
      }
    }

    // Seed default organizer if none exists
    if (this.state.organizers.length === 0) {
      const { hashPassword } = await import('../lib/auth.js');
      const defaultPassword = process.env.ORGANIZER_PASSWORD || 'welcome123';
      const passwordHash = await hashPassword(defaultPassword);
      this.state.organizers.push({
        id: this.state.nextOrganizerId++,
        username: 'organizer',
        displayName: 'Event Lead Organizer',
        passwordHash,
        createdAt: new Date().toISOString(),
      });
      this.save();
    }

    // Seed sample attendees if empty for instant testing
    if (this.state.attendees.length === 0) {
      this.seedInitialAttendees();
    }

    this.isInitialized = true;
  }

  private save(): void {
    try {
      const tmpPath = `${this.dbFilePath}.tmp-${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.dbFilePath);
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }

  private seedInitialAttendees() {
    const samples = [
      { qrId: 'EVT-7Q4M-001', name: 'Jordan Lee', email: 'jordan@example.com', company: 'Apex Tech Inc.', ticketType: 'General' },
      { qrId: 'EVT-7Q4M-002', name: 'Maya Patel', email: 'maya@example.com', company: 'Horizon Design Co.', ticketType: 'VIP' },
      { qrId: 'EVT-7Q4M-003', name: 'Dr. Theo Martin', email: 'theo@example.com', company: 'Nova Institute', ticketType: 'Speaker' },
    ];

    for (const sample of samples) {
      this.state.attendees.push({
        id: this.state.nextAttendeeId++,
        qrId: sample.qrId,
        name: sample.name,
        email: sample.email,
        company: sample.company,
        ticketType: sample.ticketType,
        checkedInAt: null,
        createdAt: new Date().toISOString(),
      });
    }
    this.save();
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

  public getAttendees(filters?: { q?: string; status?: 'all' | 'checked-in' | 'pending' }): Attendee[] {
    let list = [...this.state.attendees];

    if (filters?.q) {
      const query = filters.q.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          (a.email && a.email.toLowerCase().includes(query)) ||
          (a.company && a.company.toLowerCase().includes(query)) ||
          a.qrId.toLowerCase().includes(query)
      );
    }

    if (filters?.status === 'checked-in') {
      list = list.filter((a) => a.checkedInAt !== null);
    } else if (filters?.status === 'pending') {
      list = list.filter((a) => a.checkedInAt === null);
    }

    // Sort: most recent check-in or created
    return list.sort((a, b) => b.id - a.id);
  }

  public getAttendeeByQrId(qrId: string): Attendee | null {
    const normalized = qrId.trim().toUpperCase();
    return this.state.attendees.find((a) => a.qrId.toUpperCase() === normalized) || null;
  }

  public getAttendeeById(id: number): Attendee | null {
    return this.state.attendees.find((a) => a.id === id) || null;
  }

  public createAttendee(data: {
    name: string;
    email?: string | null;
    company?: string | null;
    ticketType?: string;
    qrId?: string;
    checkedIn?: boolean;
  }): Attendee {
    let qrId = data.qrId?.trim();
    if (!qrId) {
      do {
        qrId = this.generateUniqueQrId();
      } while (this.state.attendees.some((a) => a.qrId === qrId));
    }

    const newAttendee: Attendee = {
      id: this.state.nextAttendeeId++,
      qrId,
      name: data.name.trim(),
      email: data.email?.trim() || null,
      company: data.company?.trim() || null,
      ticketType: data.ticketType?.trim() || 'General',
      checkedInAt: data.checkedIn ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    };

    this.state.attendees.push(newAttendee);
    this.save();
    return newAttendee;
  }

  public checkInAttendee(qrId: string): { status: 'valid' | 'duplicate' | 'invalid'; message: string; attendee: Attendee | null } {
    const trimmed = qrId.trim();
    const attendee = this.getAttendeeByQrId(trimmed);

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

    attendee.checkedInAt = new Date().toISOString();
    this.save();

    return {
      status: 'valid',
      message: `${attendee.name} successfully checked in.`,
      attendee,
    };
  }

  public getDashboardSummary(): DashboardSummary {
    const total = this.state.attendees.length;
    const checkedIn = this.state.attendees.filter((a) => a.checkedInAt !== null).length;
    const remaining = total - checkedIn;

    const recentCheckIns = this.state.attendees
      .filter((a): a is Attendee & { checkedInAt: string } => a.checkedInAt !== null)
      .sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime())
      .slice(0, 8)
      .map((a) => ({
        name: a.name,
        ticketType: a.ticketType,
        company: a.company,
        checkedInAt: a.checkedInAt,
      }));

    return {
      total,
      checkedIn,
      remaining,
      recentCheckIns,
    };
  }

  public getOrganizerUser(username: string): { username: string; displayName: string } | null {
    const user = this.state.organizers.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return null;
    return { username: user.username, displayName: user.displayName };
  }

  public getOrganizerUserWithHash(username: string): OrganizerRecord | null {
    return this.state.organizers.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
  }
}

export const db = new EventDatabase();
