import React, { useState, useEffect, useMemo } from 'react';
import { Search, Printer, Download, CheckCircle2, Clock, Users, Plus, RefreshCw } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Attendee Roster
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            View, search, filter attendees, and print official credentials.
          </p>
        </div>
        <button
          onClick={fetchAttendees}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-50 transition self-start sm:self-auto shadow-sm cursor-pointer"
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
            className="w-full rounded-xl border border-stone-300 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition shadow-sm"
          />
        </form>

        <div className="flex rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
          {(['all', 'checked-in', 'pending'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition cursor-pointer ${
                statusFilter === filter
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-slate-900 hover:bg-stone-50'
              }`}
            >
              {filter === 'checked-in' ? 'Checked In' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Attendees Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-stone-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-stone-500" />
            <p className="font-semibold text-stone-600">Loading attendees roster...</p>
          </div>
        ) : attendees.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30 text-stone-400" />
            <p className="text-base font-bold text-slate-700">No attendees found</p>
            <p className="text-xs mt-1 text-stone-500">Try adjusting your search query or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-600">
                <tr>
                  <th className="px-6 py-4">Attendee</th>
                  <th className="px-6 py-4">Organization</th>
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {attendees.map((attendee) => (
                  <tr key={attendee.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-base">{attendee.name}</div>
                      <div className="text-xs text-stone-400 font-mono mt-0.5">
                        {attendee.qrId} {attendee.email ? `• ${attendee.email}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-stone-600">
                      {attendee.company || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-md px-2.5 py-1 text-xs font-mono font-bold uppercase border ${
                        attendee.ticketType.toLowerCase() === 'vip'
                          ? 'bg-[#FDF3E7] text-[#6D4C2F] border-[#F2DECA]'
                          : attendee.ticketType.toLowerCase() === 'speaker'
                          ? 'bg-[#EEF3F8] text-[#2B4C6F] border-[#D4E0EE]'
                          : attendee.ticketType.toLowerCase() === 'press'
                          ? 'bg-[#FBF0F1] text-[#6E333B] border-[#F0D5D8]'
                          : 'bg-[#EFF5F0] text-[#2D5538] border-[#D4E5D7]'
                      }`}>
                        {attendee.ticketType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {attendee.checkedInAt ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0EA] px-3 py-1 text-xs font-semibold text-[#2D5538] border border-[#D4E5D7]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#2D5538]" />
                          Checked In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 border border-stone-200">
                          <Clock className="h-3.5 w-3.5 text-stone-400" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPrint(attendee)}
                          className="inline-flex items-center gap-1 rounded-xl bg-stone-100 border border-stone-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-900 hover:text-white transition shadow-sm cursor-pointer"
                          title="Print official lanyard badge"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print Badge
                        </button>
                        <button
                          onClick={() => handleDownload(attendee)}
                          className="p-1.5 rounded-xl border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 transition shadow-sm cursor-pointer"
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
