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
    <div className="min-h-screen calm-canvas-bg text-stone-100 flex flex-col items-center justify-center p-4 selection:bg-white/20 selection:text-white">
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl glossy-card mb-4 p-2.5">
            <img
              src="/brand-logo-mark.png"
              alt="ARTECH"
              className="h-full w-full object-contain filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white font-display">
            ARTECH STATION
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            Sign in to access entrance scanning & badge printing controls
          </p>
        </div>

        <div className="glossy-panel p-6 sm:p-8">
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-sm font-medium text-rose-300 backdrop-blur-sm">
              <ShieldAlert className="h-5 w-5 shrink-0 text-rose-400" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-300">
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
                  className="glossy-input w-full pl-10 pr-4 py-3 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-300">
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
                  className="glossy-input w-full pl-10 pr-4 py-3 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-stone-400 font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-stone-400" />
              <span>Default credentials: <b className="text-stone-200">organizer</b> / <b className="text-stone-200">welcome123</b></span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl glossy-btn-white py-3.5 text-base font-bold active:scale-[0.98] disabled:opacity-40 transition cursor-pointer"
            >
              {isSubmitting ? 'Verifying...' : 'Access Admin Station'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <a href="/register" className="text-xs font-semibold text-stone-400 hover:text-white transition">
              ← Go to Public Attendee Registration
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
