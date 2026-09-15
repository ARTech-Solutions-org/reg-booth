export interface Attendee {
  id: number;
  qrId: string;
  name: string;
  email: string | null;
  company: string | null;
  ticketType: string;
  checkedInAt: string | null;
  badgePrinted: boolean;
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

export type BadgePreset = 'badge-3x4' | 'cr80' | 'label-4x6' | 'roll-80mm' | 'roll-58mm' | 'custom';
export type PrintColorMode = 'full-color' | 'monochrome' | 'high-contrast';
export type FontSizeScale = 'compact' | 'normal' | 'large';

export interface PrintConfig {
  printerDeviceName: string;
  preset: BadgePreset;
  width: string;
  height: string;
  orientation: 'portrait' | 'landscape';
  colorMode: PrintColorMode;
  accentColor: string;
  showLanyardHole: boolean;
  showLogo: boolean;
  showCompany: boolean;
  eventName: string;
  qrSize: number;
  fontSizeScale: FontSizeScale;
}

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  printerDeviceName: '',
  preset: 'badge-3x4',
  width: '3.2in',
  height: '4.4in',
  orientation: 'portrait',
  colorMode: 'full-color',
  accentColor: '#000000',
  showLanyardHole: true,
  showLogo: true,
  showCompany: true,
  eventName: 'ARTECH • LIVE THE EXPERIENCE',
  qrSize: 130,
  fontSizeScale: 'normal',
};

