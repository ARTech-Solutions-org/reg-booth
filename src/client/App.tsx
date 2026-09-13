import React, { useState, useEffect } from 'react';
import { Route, Switch, Link, useLocation } from 'wouter';
import {
  QrCode,
  Users,
  Activity,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Camera,
} from 'lucide-react';
import { api } from './lib/api.js';
import { Register } from './pages/Register.js';
import { AdminCheckIn } from './pages/AdminCheckIn.js';
import { Attendees } from './pages/Attendees.js';
import { Dashboard } from './pages/Dashboard.js';
import { Login } from './pages/Login.js';
import { Kiosk } from './pages/Kiosk.js';
import type { OrganizerUser } from '../shared/types.js';

function Shell({
  children,
  user,
  onLogout,
}: {
  children: React.ReactNode;
  user: OrganizerUser;
  onLogout: () => void;
}) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/admin', label: 'Live Dashboard', icon: Activity },
    { href: '/admin/attendees', label: 'Attendee Roster', icon: Users },
  ];

  return (
    <div className="min-h-screen calm-canvas-bg text-slate-800 md:flex">
      {/* Sidebar for Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200/80 bg-white/95 p-6 backdrop-blur-xl transition-transform md:static md:translate-x-0 shadow-sm ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between pb-6 border-b border-stone-200/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 border border-stone-200 font-bold text-slate-800 shadow-sm">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-slate-900 text-base">EventPass</div>
              <div className="font-mono text-[10px] text-stone-500 font-semibold uppercase tracking-wider">
                Admin Station
              </div>
            </div>
          </div>
          <button
            className="md:hidden text-stone-400 hover:text-slate-700"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="mt-6 space-y-1.5 flex-1">
          <p className="px-3 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-stone-400 mb-2">
            Operations
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || (href === '/admin' && location === '/admin/dashboard');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          {/* Dedicated Entrance Kiosk Link */}
          <div className="pt-4">
            <p className="px-3 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-stone-400 mb-2">
              Entrance Desk
            </p>
            <Link
              href="/kiosk"
              className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-stone-100/70 hover:bg-stone-200/80 transition border border-stone-200/80"
            >
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-stone-600" />
                <span>Entrance Kiosk Station</span>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold text-stone-600 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                Desk
              </span>
            </Link>
          </div>

          <div className="pt-4">
            <p className="px-3 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-stone-400 mb-2">
              Public Portal
            </p>
            <Link
              href="/register"
              className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-slate-900 transition border border-stone-200"
              target="_blank"
            >
              <span>Public Registration Form</span>
              <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
            </Link>
          </div>
        </nav>

        {/* User Card & Logout */}
        <div className="mt-auto border-t border-stone-200/80 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-slate-800 font-bold border border-stone-200">
                {user.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-900">{user.displayName}</div>
                <div className="truncate font-mono text-[10px] text-stone-400">@{user.username}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-slate-800 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200/80 bg-white/90 px-4 backdrop-blur-md md:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-slate-700 hover:text-slate-900"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-slate-800 border border-stone-200">
              <QrCode className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900 text-base">EventPass</span>
          </div>
          <button
            onClick={onLogout}
            className="text-stone-400 hover:text-slate-800 p-2"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export function App() {
  const [user, setUser] = useState<OrganizerUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    api
      .getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setIsCheckingAuth(false));
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    }
    setUser(null);
    setLocation('/login');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen calm-canvas-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-stone-500 font-semibold">Loading EventPass Station...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public Registration Flow (Shareable Link) */}
      <Route path="/register" component={Register} />

      {/* Dedicated Entrance Kiosk (Scan QR Pass or Register On-Site Walk-In) */}
      <Route path="/kiosk" component={Kiosk} />

      {/* Organizer Login */}
      <Route path="/login">
        {user ? (
          <Dashboard />
        ) : (
          <Login
            onSuccess={(loggedUser) => {
              setUser(loggedUser);
              setLocation('/admin');
            }}
          />
        )}
      </Route>

      {/* Authenticated Admin Shell Routes (Dashboard, Attendee Roster, etc.) */}
      {user ? (
        <Shell user={user} onLogout={handleLogout}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/admin" component={Dashboard} />
            <Route path="/admin/dashboard" component={Dashboard} />
            <Route path="/admin/attendees" component={Attendees} />
            <Route path="/admin/checkin" component={AdminCheckIn} />
            <Route>
              <Dashboard />
            </Route>
          </Switch>
        </Shell>
      ) : (
        /* If guest visits root or /admin without being logged in */
        <Switch>
          <Route path="/admin">
            <Login
              onSuccess={(loggedUser) => {
                setUser(loggedUser);
                setLocation('/admin');
              }}
            />
          </Route>
          {/* Default to Public Registration if arriving at root unauthenticated */}
          <Route component={Register} />
        </Switch>
      )}
    </Switch>
  );
}

export default App;
