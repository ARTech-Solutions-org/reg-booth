import React, { useState } from 'react';
import { Lock, User, ArrowRight, QrCode, ShieldAlert, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import type { OrganizerUser } from '../../shared/types.js';

interface LoginProps {
  onSuccess: (user: OrganizerUser) => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [username, setUsername] = useState('organizer');
  const [password, setPassword] = useState('welcome123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.login({ username, password });
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen calm-canvas-bg text-slate-800 flex flex-col items-center justify-center p-4 selection:bg-stone-200 selection:text-slate-900">
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-slate-800 shadow-sm border border-stone-200 mb-4">
            <QrCode className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Organizer Access
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Sign in to access entrance scanning & badge printing controls
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-sm font-medium text-rose-700">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Organizer Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="organizer"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition"
                />
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600 font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-stone-400" />
              <span>Default credentials: <b>organizer</b> / <b>welcome123</b></span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-3.5 text-base font-bold text-white shadow-sm active:scale-[0.98] disabled:opacity-40 transition cursor-pointer"
            >
              {isSubmitting ? 'Verifying...' : 'Access Admin Station'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-stone-100 text-center">
            <a href="/register" className="text-xs font-semibold text-stone-600 hover:text-slate-900 hover:underline">
              ← Go to Public Attendee Registration
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
