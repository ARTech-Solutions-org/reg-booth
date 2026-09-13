import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, Clock, Activity, RefreshCw, Camera } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-stone-500" />
            <span className="font-mono text-xs uppercase tracking-wider text-stone-500 font-semibold">
              Real-Time Entrance Telemetry
            </span>
          </div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Live Attendance Board
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Monitoring total attendee arrivals, entrance flow, and capacity.
          </p>
        </div>
        <button
          onClick={fetchSummary}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-50 transition self-start sm:self-auto shadow-sm cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Entrance Kiosk Quick Launch Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-slate-800 border border-stone-200">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Entrance Check-In Desk
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Active Station
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">Entrance Kiosk Station</h3>
            <p className="text-xs text-stone-600 mt-0.5">
              Dedicated, distraction-free scanning & on-site walk-in registration terminal.
            </p>
          </div>
        </div>
        <Link
          href="/kiosk"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 transition shadow-sm self-stretch sm:self-auto justify-center cursor-pointer whitespace-nowrap"
        >
          <span>Launch Entrance Kiosk →</span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Registered */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-600">
              Total Registered
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-slate-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-4xl sm:text-5xl font-extrabold text-slate-900">
            {summary ? summary.total.toLocaleString() : '—'}
          </div>
          <p className="mt-2 text-xs text-stone-500">All registered conference guests</p>
        </div>

        {/* Checked In */}
        <div className="rounded-3xl border border-[#D4E5D7] bg-[#F7FAF8] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#2D5538]">
              Checked In
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F0EA] text-[#2D5538]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-4xl sm:text-5xl font-extrabold text-[#2D5538]">
            {summary ? summary.checkedIn.toLocaleString() : '—'}
          </div>
          <p className="mt-2 text-xs text-[#2D5538]/80 font-medium">
            {percentCheckedIn}% of expected attendees inside
          </p>
        </div>

        {/* Remaining / Expected */}
        <div className="rounded-3xl border border-[#F2DECA] bg-[#FDFBF7] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#6D4C2F]">
              Pending Arrival
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FDF3E7] text-[#6D4C2F]">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-4xl sm:text-5xl font-extrabold text-[#6D4C2F]">
            {summary ? summary.remaining.toLocaleString() : '—'}
          </div>
          <p className="mt-2 text-xs text-[#6D4C2F]/80 font-medium">Awaiting entrance check-in</p>
        </div>
      </div>

      {/* Attendance Progress Bar */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-800">Overall Attendance Rate</span>
          <span className="font-mono text-sm font-bold text-slate-800">{percentCheckedIn}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100 border border-stone-200">
          <div
            className="h-full bg-slate-900 transition-all duration-500 rounded-full"
            style={{ width: `${percentCheckedIn}%` }}
          />
        </div>
      </div>

      {/* Recent Check-Ins Activity Feed */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="h-5 w-5 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">Recent Entrance Check-Ins</h2>
        </div>

        {summary && summary.recentCheckIns.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {summary.recentCheckIns.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-slate-800 font-bold text-sm border border-stone-200">
                    {item.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-base">{item.name}</div>
                    <div className="text-xs text-stone-500">
                      {item.company || 'Attendee'} •{' '}
                      <span className="font-mono text-stone-700 uppercase font-semibold">{item.ticketType}</span>
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs text-stone-500 font-medium">
                  {new Date(item.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-stone-500 py-8">
            No check-ins recorded yet today.
          </p>
        )}
      </div>
    </div>
  );
}
