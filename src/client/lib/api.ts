import type {
  Attendee,
  OrganizerUser,
  DashboardSummary,
  CheckInResult,
  PublicRegisterInput,
  WalkInRegisterInput,
} from '../../shared/types.js';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    let errorMessage = `Request failed: ${res.statusText}`;
    try {
      const data = await res.json();
      if (data && data.error) errorMessage = data.error;
      else if (data && data.message) errorMessage = data.message;
    } catch {
      // Non-JSON response
    }
    throw new Error(errorMessage);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Public
  publicRegister: (data: PublicRegisterInput) =>
    request<{ message: string; attendee: Attendee }>('/public/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getEventInfo: () =>
    request<{ eventName: string; date: string; location: string; ticketTypes: string[] }>('/public/event-info'),

  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ user: OrganizerUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  logout: () =>
    request<void>('/auth/logout', {
      method: 'POST',
    }),

  getCurrentUser: () =>
    request<OrganizerUser>('/auth/me'),

  // Attendees
  listAttendees: (params?: { q?: string; status?: 'all' | 'checked-in' | 'pending' }) => {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    const qs = query.toString();
    return request<Attendee[]>(`/attendees${qs ? `?${qs}` : ''}`);
  },

  walkInRegister: (data: WalkInRegisterInput) =>
    request<{ status: 'valid'; message: string; attendee: Attendee }>('/attendees/walk-in', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createAttendee: (data: { name: string; email?: string; company?: string; ticketType: string; qrId?: string }) =>
    request<Attendee>('/attendees/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  importAttendees: (attendees: Array<{ name: string; email?: string; company?: string; ticketType?: string; qrId?: string }>) =>
    request<{ imported: number; skipped: number; attendees: Attendee[] }>('/attendees/import', {
      method: 'POST',
      body: JSON.stringify({ attendees }),
    }),

  // Check-In
  checkIn: (qrId: string) =>
    request<CheckInResult>('/check-ins', {
      method: 'POST',
      body: JSON.stringify({ qrId }),
    }),

  // Dashboard
  getDashboardSummary: () =>
    request<DashboardSummary>('/dashboard/summary'),
};
