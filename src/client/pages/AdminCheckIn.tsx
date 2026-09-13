import React, { useState } from 'react';
import {
  Camera,
  UserPlus,
  Printer,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
  User,
  Mail,
  Building,
  Ticket,
  Check,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { ScannerView } from '../components/ScannerView.js';
import { PrintBadgeModal } from '../components/PrintBadgeModal.js';
import type { Attendee, CheckInResult } from '../../shared/types.js';

export function AdminCheckIn() {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');

  // Option A (Scan) States
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanResult, setScanResult] = useState<CheckInResult | null>(null);

  // Option B (Manual Walk-In) States
  const [walkInForm, setWalkInForm] = useState({
    name: '',
    email: '',
    company: '',
    ticketType: 'General',
  });
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);
  const [walkInResult, setWalkInResult] = useState<Attendee | null>(null);
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Badge Print Modal State
  const [badgeAttendee, setBadgeAttendee] = useState<Attendee | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // =========================================================================
  // Option A Handlers
  // =========================================================================
  const handleScan = async (qrId: string) => {
    setIsProcessingScan(true);
    try {
      const result = await api.checkIn(qrId);
      setScanResult(result);
    } catch (err: any) {
      setScanResult({
        status: 'invalid',
        message: err.message || 'Check-in request failed. Please try again.',
        attendee: null,
      });
    } finally {
      setIsProcessingScan(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
  };

  // =========================================================================
  // Option B Handlers
  // =========================================================================
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInForm.name.trim()) {
      setWalkInError('Please enter the walk-in attendee name.');
      return;
    }
    if (!walkInForm.company.trim()) {
      setWalkInError('Please enter the organization or company.');
      return;
    }
    if (!walkInForm.email.trim() || !walkInForm.email.includes('@')) {
      setWalkInError('Please enter a valid email address.');
      return;
    }

    setIsSubmittingWalkIn(true);
    setWalkInError(null);

    try {
      const res = await api.walkInRegister(walkInForm);
      setWalkInResult(res.attendee);
      setWalkInForm({
        name: '',
        email: '',
        company: '',
        ticketType: 'General',
      });
    } catch (err: any) {
      setWalkInError(err.message || 'Failed to register walk-in.');
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  const resetWalkIn = () => {
    setWalkInResult(null);
    setWalkInError(null);
  };

  // =========================================================================
  // Badge Printing Trigger
  // =========================================================================
  const openBadgePrint = (attendee: Attendee) => {
    setBadgeAttendee(attendee);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Station Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            <span className="font-mono text-xs uppercase tracking-wider text-stone-500 font-semibold">
              Entrance Station Online
            </span>
          </div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Check-In & Registration Hub
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Scan attendee QR code or register walk-ins, then print their official badge.
          </p>
        </div>

        {/* Tab Selection: Option A (Scan) vs Option B (Manual Entry) */}
        <div className="inline-flex rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => {
              setActiveTab('scan');
              resetScan();
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-slate-900 hover:bg-stone-50'
            }`}
          >
            <Camera className="h-4 w-4" />
            Option A — Scan QR
          </button>
          <button
            onClick={() => {
              setActiveTab('manual');
              resetWalkIn();
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-slate-900 hover:bg-stone-50'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Option B — Manual Walk-In
          </button>
        </div>
      </div>

      {/* =====================================================================
          OPTION A: CAMERA SCANNER VIEW
          ===================================================================== */}
      {activeTab === 'scan' && (
        <div className="relative">
          {!scanResult ? (
            <div className="rounded-3xl border border-stone-200 bg-white/95 p-6 sm:p-8 backdrop-blur-xl shadow-sm">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Camera Check-In Scanner</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Point camera at attendee's digital pass or enter their QR ID manually
                </p>
              </div>

              <ScannerView onScan={handleScan} isProcessing={isProcessingScan} />
            </div>
          ) : (
            /* ===============================================================
               SCAN OUTCOME FULL CARD (Approved / Duplicate / Invalid)
               =============================================================== */
            <div
              className={`rounded-3xl border p-6 sm:p-8 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-200 ${
                scanResult.status === 'valid'
                  ? 'border-[#D4E5D7] bg-[#F7FAF8]'
                  : scanResult.status === 'duplicate'
                  ? 'border-[#F2DECA] bg-[#FDFBF7]'
                  : 'border-[#F0D5D8] bg-[#FDF8F9]'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                {/* Status Icon */}
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full mb-3 border ${
                    scanResult.status === 'valid'
                      ? 'bg-[#E8F0EA] text-[#2D5538] border-[#D4E5D7]'
                      : scanResult.status === 'duplicate'
                      ? 'bg-[#FDF3E7] text-[#6D4C2F] border-[#F2DECA]'
                      : 'bg-[#FBF0F1] text-[#6E333B] border-[#F0D5D8]'
                  }`}
                >
                  {scanResult.status === 'valid' ? (
                    <CheckCircle2 className="h-9 w-9" />
                  ) : scanResult.status === 'duplicate' ? (
                    <AlertCircle className="h-9 w-9" />
                  ) : (
                    <XCircle className="h-9 w-9" />
                  )}
                </div>

                {/* Status Heading */}
                <span
                  className={`font-mono text-xs font-bold uppercase tracking-[0.2em] ${
                    scanResult.status === 'valid'
                      ? 'text-[#2D5538]'
                      : scanResult.status === 'duplicate'
                      ? 'text-[#6D4C2F]'
                      : 'text-[#6E333B]'
                  }`}
                >
                  {scanResult.status === 'valid'
                    ? 'Entry Approved'
                    : scanResult.status === 'duplicate'
                    ? 'Duplicate Check-In'
                    : 'Invalid QR Code'}
                </span>
                <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                  {scanResult.status === 'valid'
                    ? 'Check-In Complete!'
                    : scanResult.status === 'duplicate'
                    ? 'Already Checked In'
                    : 'Pass Not Found'}
                </h2>

                {/* Attendee Details */}
                {scanResult.attendee ? (
                  <div className="mt-6 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-2xl font-bold text-slate-900">
                          {scanResult.attendee.name}
                        </div>
                        {scanResult.attendee.company && (
                          <div className="text-sm font-medium text-stone-600">
                            {scanResult.attendee.company}
                          </div>
                        )}
                        {scanResult.attendee.email && (
                          <div className="text-xs text-stone-400 mt-0.5">
                            {scanResult.attendee.email}
                          </div>
                        )}
                      </div>
                      <span className={`rounded-md px-3 py-1 font-mono text-xs font-bold uppercase border ${
                        scanResult.attendee.ticketType.toLowerCase() === 'vip'
                          ? 'bg-[#FDF3E7] text-[#6D4C2F] border-[#F2DECA]'
                          : scanResult.attendee.ticketType.toLowerCase() === 'speaker'
                          ? 'bg-[#EEF3F8] text-[#2B4C6F] border-[#D4E0EE]'
                          : scanResult.attendee.ticketType.toLowerCase() === 'press'
                          ? 'bg-[#FBF0F1] text-[#6E333B] border-[#F0D5D8]'
                          : 'bg-[#EFF5F0] text-[#2D5538] border-[#D4E5D7]'
                      }`}>
                        {scanResult.attendee.ticketType}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-mono">
                      <span>Pass ID: {scanResult.attendee.qrId}</span>
                      <span>
                        Checked in: {new Date(scanResult.attendee.checkedInAt || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 max-w-sm text-sm text-stone-600">{scanResult.message}</p>
                )}

                {/* Action Buttons: Print Badge & Scan Next */}
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                  {scanResult.attendee && (
                    <button
                      onClick={() => openBadgePrint(scanResult.attendee!)}
                      className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 px-6 py-3.5 text-base font-bold text-white shadow-sm active:scale-95 transition cursor-pointer"
                    >
                      <Printer className="h-5 w-5" />
                      Print Badge Now
                    </button>
                  )}
                  <button
                    onClick={resetScan}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white hover:bg-stone-50 px-6 py-3.5 text-base font-semibold text-slate-700 active:scale-95 transition cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Scan Next Guest
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          OPTION B: MANUAL WALK-IN ENTRY
          ===================================================================== */}
      {activeTab === 'manual' && (
        <div className="relative">
          {!walkInResult ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white/95 p-6 sm:p-8 backdrop-blur-xl shadow-sm">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-1.5 text-xs font-semibold text-stone-700 mb-2">
                  <UserPlus className="h-3.5 w-3.5 text-stone-500" />
                  On-Site Guest Entry
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Manual Walk-In Registration</h2>
                <p className="text-xs text-stone-500 mt-1">
                  Type attendee info. They will be immediately checked in and ready for badge printing.
                </p>
              </div>

              {walkInError && (
                <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm font-medium text-rose-700">
                  {walkInError}
                </div>
              )}

              <form onSubmit={handleWalkInSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Full Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan Lee"
                      value={walkInForm.name}
                      onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Organization / Company <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Tech Inc."
                      value={walkInForm.company}
                      onChange={(e) => setWalkInForm({ ...walkInForm, company: e.target.value })}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Email Address <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="email"
                      required
                      placeholder="jordan@example.com"
                      value={walkInForm.email}
                      onChange={(e) => setWalkInForm({ ...walkInForm, email: e.target.value })}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Ticket Type <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Ticket className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <select
                      required
                      value={walkInForm.ticketType}
                      onChange={(e) => setWalkInForm({ ...walkInForm, ticketType: e.target.value })}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition"
                    >
                      <option value="General">General Admission</option>
                      <option value="VIP">VIP All-Access</option>
                      <option value="Speaker">Speaker</option>
                      <option value="Staff">Staff</option>
                      <option value="Press">Press / Media</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingWalkIn}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-3.5 text-base font-bold text-white shadow-sm active:scale-[0.98] disabled:opacity-40 transition cursor-pointer"
                >
                  <Check className="h-5 w-5" />
                  {isSubmittingWalkIn ? 'Registering...' : 'Register Walk-In & Check In'}
                </button>
              </form>
            </div>
          ) : (
            /* ===============================================================
               WALK-IN SUCCESS CARD WITH IMMEDIATE PRINT BUTTON
               =============================================================== */
            <div className="mx-auto max-w-xl rounded-3xl border border-[#D4E5D7] bg-[#F7FAF8] p-6 sm:p-8 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0EA] text-[#2D5538] mb-3 border border-[#D4E5D7]">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#2D5538]">
                  Walk-In Checked In
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Ready for Badge Printing!</h2>

                <div className="mt-5 w-full rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{walkInResult.name}</div>
                      {walkInResult.company && (
                        <div className="text-sm font-medium text-stone-600">
                          {walkInResult.company}
                        </div>
                      )}
                      {walkInResult.email && (
                        <div className="text-xs text-stone-400 mt-0.5">{walkInResult.email}</div>
                      )}
                    </div>
                    <span className={`rounded-md px-3 py-1 font-mono text-xs font-bold uppercase border ${
                      walkInResult.ticketType.toLowerCase() === 'vip'
                        ? 'bg-[#FDF3E7] text-[#6D4C2F] border-[#F2DECA]'
                        : walkInResult.ticketType.toLowerCase() === 'speaker'
                        ? 'bg-[#EEF3F8] text-[#2B4C6F] border-[#D4E0EE]'
                        : walkInResult.ticketType.toLowerCase() === 'press'
                        ? 'bg-[#FBF0F1] text-[#6E333B] border-[#F0D5D8]'
                        : 'bg-[#EFF5F0] text-[#2D5538] border-[#D4E5D7]'
                    }`}>
                      {walkInResult.ticketType}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-mono">
                    <span>Generated Pass: {walkInResult.qrId}</span>
                    <span className="text-[#2D5538] font-bold">Checked In Just Now</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full">
                  <button
                    onClick={() => openBadgePrint(walkInResult)}
                    className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 px-6 py-3.5 text-base font-bold text-white shadow-sm active:scale-95 transition cursor-pointer"
                  >
                    <Printer className="h-5 w-5" />
                    Print Badge Now
                  </button>
                  <button
                    onClick={resetWalkIn}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white hover:bg-stone-50 px-6 py-3.5 text-base font-semibold text-slate-700 active:scale-95 transition cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    Register Another Walk-In
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Embedded Badge Printing Modal */}
      <PrintBadgeModal
        attendee={badgeAttendee}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
}
