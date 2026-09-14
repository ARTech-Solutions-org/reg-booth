import React, { useState, useEffect } from 'react';
import { Search, Printer, Download, CheckCircle2, Clock, Users, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';
import { PrintBadgeModal } from '../components/PrintBadgeModal.js';
import { downloadAttendeeTicket } from '../lib/qr-utils.js';
import type { Attendee } from '../../shared/types.js';

export function Attendees() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked-in' | 'pending'>('all');
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const fetchAttendees = async () => {
    setIsLoading(true);
    try {
      const data = await api.listAttendees({
        q: searchQuery || undefined,
        status: statusFilter,
      });
      setAttendees(data);
    } catch (err) {
      console.error('Failed to load attendees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAttendees();
  };

  const openPrint = (attendee: Attendee) => {
    setSelectedAttendee(attendee);
    setIsPrintModalOpen(true);
  };

  const handleDownload = (attendee: Attendee) => {
    downloadAttendeeTicket(attendee);
  };

  return (
    <div className="space-y-6 text-stone-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-white/80" />
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-stone-400 font-semibold">
              ARTECH Directory
            </span>
          </div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Guest Roster
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            ARTECH • Live the Experience | Search, filter guests, and print official credentials.
          </p>
        </div>
        <button
          onClick={fetchAttendees}
          className="glossy-btn-dark inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh List
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, company, or QR ID..."
            className="glossy-input w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-stone-500"
          />
        </form>

        <div className="glossy-panel flex rounded-xl p-1 gap-1">
          {(['all', 'checked-in', 'pending'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition cursor-pointer ${
                statusFilter === filter
                  ? 'glossy-btn-white text-slate-950 shadow-xs'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {filter === 'checked-in' ? 'Checked In' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Attendees Table */}
      <div className="glossy-panel overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
        {isLoading ? (
          <div className="p-12 text-center text-stone-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-white" />
            <p className="font-semibold text-white">Loading attendees roster...</p>
          </div>
        ) : attendees.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30 text-stone-400" />
            <p className="text-base font-bold text-white">No attendees found</p>
            <p className="text-xs mt-1 text-stone-400">Try adjusting your search query or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-300">
              <thead className="border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 font-mono">
                <tr>
                  <th className="px-6 py-4">Guest</th>
                  <th className="px-6 py-4">Organization</th>
                  <th className="px-6 py-4">Ticket Tier</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {attendees.map((attendee) => (
                  <tr key={attendee.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-base tracking-tight">{attendee.name}</div>
                      <div className="text-xs text-stone-400 font-mono mt-0.5">
                        {attendee.qrId} {attendee.email ? `• ${attendee.email}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-stone-300">
                      {attendee.company || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-md px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider border ${
                        attendee.ticketType.toLowerCase() === 'vip'
                          ? 'bg-white text-slate-950 border-white font-black shadow-xs'
                          : attendee.ticketType.toLowerCase() === 'speaker'
                          ? 'bg-white/15 text-white border-white/25'
                          : 'bg-stone-800 text-stone-200 border-stone-700'
                      }`}>
                        {attendee.ticketType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {attendee.checkedInAt ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white border border-white/20">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          Checked In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-stone-400 border border-white/10">
                          <Clock className="h-3.5 w-3.5 text-stone-500" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPrint(attendee)}
                          className="glossy-btn-white inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold shadow-xs cursor-pointer"
                          title="Print official lanyard badge"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print Badge
                        </button>
                        <button
                          onClick={() => handleDownload(attendee)}
                          className="glossy-btn-dark p-1.5 rounded-xl cursor-pointer"
                          title="Download pass image"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Badge Modal */}
      <PrintBadgeModal
        attendee={selectedAttendee}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
}
