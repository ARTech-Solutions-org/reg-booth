import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, Clock, Activity, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { api } from '../lib/api.js';
import type { DashboardSummary } from '../../shared/types.js';

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000); // 10s live polling
    return () => clearInterval(interval);
  }, []);

  const percentCheckedIn = summary && summary.total > 0
    ? Math.round((summary.checkedIn / summary.total) * 100)
    : 0;

  return (
    <div className="space-y-6 text-stone-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-stone-400 font-semibold">
              ARTECH Live Telemetry
            </span>
          </div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Live Attendance Board
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            ARTECH • Live the Experience | Monitoring total arrivals, entrance flow, and capacity.
          </p>
        </div>
        <button
          onClick={fetchSummary}
          className="glossy-btn-dark inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Entrance Kiosk Quick Launch Card */}
      <div className="glossy-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/15 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            <img src="/brand-logo-mark.png" alt="ARTECH" className="h-7 w-7 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">
                Entrance Check-In Desk
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-200 border border-white/15">
                Active Desk
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5 tracking-tight">ARTECH Entrance Kiosk Station</h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Dedicated, distraction-free scanning & on-site walk-in registration terminal.
            </p>
          </div>
        </div>
        <Link
          href="/kiosk"
          className="glossy-btn-white inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-slate-950 transition shadow-md self-stretch sm:self-auto justify-center cursor-pointer whitespace-nowrap"
        >
          <span>Launch Entrance Kiosk →</span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Registered */}
        <div className="glossy-panel rounded-3xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-stone-400">
              Total Registered
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white border border-white/15">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            {summary ? summary.total.toLocaleString() : '—'}
          </div>
          <p className="mt-2 text-xs text-stone-400">All registered conference guests</p>
        </div>

        {/* Checked In */}
        <div className="glossy-panel rounded-3xl p-6 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-stone-300">
              Checked In
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-950 font-bold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            {summary ? summary.checkedIn.toLocaleString() : '—'}
          </div>
          <p className="mt-2 text-xs text-stone-300 font-medium">
            {percentCheckedIn}% of expected attendees inside
          </p>
        </div>

        {/* Remaining / Expected */}
        <div className="glossy-panel rounded-3xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-stone-400">
              Pending Arrival
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-stone-300 border border-white/15">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 text-4xl sm:text-5xl font-extrabold text-stone-300 tracking-tight">
            {summary ? summary.remaining.toLocaleString() : '—'}
          </div>
          <p className="mt-2 text-xs text-stone-400 font-medium">Awaiting entrance check-in</p>
        </div>
      </div>

      {/* Attendance Progress Bar */}
      <div className="glossy-panel rounded-3xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-sm font-semibold text-white tracking-wide">Overall Attendance Rate</span>
          <span className="font-mono text-sm font-bold text-white">{percentCheckedIn}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 border border-white/10">
          <div
            className="h-full bg-white transition-all duration-500 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.6)]"
            style={{ width: `${percentCheckedIn}%` }}
          />
        </div>
      </div>

      {/* Recent Check-Ins Activity Feed */}
      <div className="glossy-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/10">
          <Activity className="h-5 w-5 text-stone-300" />
          <h2 className="text-xl font-bold text-white tracking-tight">Recent Entrance Check-Ins</h2>
        </div>

        {summary && summary.recentCheckIns.length > 0 ? (
          <div className="divide-y divide-white/10">
            {summary.recentCheckIns.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white font-bold text-sm border border-white/15">
                    {item.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-bold text-white text-base">{item.name}</div>
                    <div className="text-xs text-stone-400">
                      {item.company || 'Guest'} •{' '}
                      <span className="font-mono text-stone-300 uppercase font-semibold">{item.ticketType}</span>
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs text-stone-400 font-medium">
                  {new Date(item.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-stone-400 py-8">
            No check-ins recorded yet today.
          </p>
        )}
      </div>
    </div>
  );
}
