export interface Attendee {
  id: number;
  qrId: string;
  name: string;
  email: string | null;
  company: string | null;
  ticketType: string;
  checkedInAt: string | null;
  createdAt: string;
}

export interface OrganizerUser {
  username: string;
  displayName: string;
}

export interface DashboardSummary {
  total: number;
  checkedIn: number;
  remaining: number;
  recentCheckIns: Array<{
    name: string;
    ticketType: string;
    company: string | null;
    checkedInAt: string;
  }>;
}

export interface CheckInResult {
  status: 'valid' | 'duplicate' | 'invalid';
  message: string;
  attendee: Attendee | null;
}

export interface PublicRegisterInput {
  name: string;
  email?: string;
  company?: string;
  ticketType?: string;
}

export interface WalkInRegisterInput {
  name: string;
  email?: string;
  company?: string;
  ticketType: string;
}
