import React, { useState, useRef } from 'react';
import {
  Scan,
  UserPlus,
  Printer,
  CheckCircle2,
  AlertCircle,
  XCircle,
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
import { useHardwareScanner, playScannerTone } from '../hooks/useHardwareScanner.js';
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
  const [hasWalkInPrinted, setHasWalkInPrinted] = useState(false);

  // Badge Print Modal State
  const [badgeAttendee, setBadgeAttendee] = useState<Attendee | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Synchronous lock to prevent parallel network requests from duplicate key events
  const isScanningRef = useRef(false);

  // =========================================================================
  // Option A Handlers & Global Hardware Scanner
  // =========================================================================
  const handleScan = async (qrId: string) => {
    if (isScanningRef.current || isProcessingScan) return;
    isScanningRef.current = true;
    setIsProcessingScan(true);

    try {
      const result = await api.checkIn(qrId);
      setScanResult(result);
      if (result.status === 'valid') {
        playScannerTone('success');
      } else {
        playScannerTone('warning');
      }
    } catch (err: any) {
      playScannerTone('warning');
      setScanResult({
        status: 'invalid',
        message: err.message || 'Check-in request failed. Please try again.',
        attendee: null,
      });
    } finally {
      setIsProcessingScan(false);
      setTimeout(() => {
        isScanningRef.current = false;
      }, 1000);
    }
  };

  // Always listening for handheld barcode/QR gun scans across the station
  useHardwareScanner({
    onScan: (scannedCode) => {
      setActiveTab('scan');
      handleScan(scannedCode);
    },
    enabled: true,
  });

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
    setHasWalkInPrinted(false);
  };

  // =========================================================================
  // Badge Printing Trigger
  // =========================================================================
  const openBadgePrint = (attendee: Attendee) => {
    setBadgeAttendee(attendee);
    setIsPrintModalOpen(true);
    setHasWalkInPrinted(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Station Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-stone-400 font-semibold">
              ARTECH Station Online
            </span>
          </div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Check-In & Access Hub
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            Scan attendee QR code or register walk-ins, then print their official ARTECH badge.
          </p>
        </div>

        {/* Tab Selection: Option A (Scan) vs Option B (Manual Entry) */}
        <div className="glossy-panel inline-flex rounded-2xl p-1 shadow-lg gap-1">
          <button
            onClick={() => {
              setActiveTab('scan');
              resetScan();
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'scan'
                ? 'glossy-btn-white text-slate-950 shadow-md'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scan className="h-4 w-4" />
            Option A — Scan Badge
          </button>
          <button
            onClick={() => {
              setActiveTab('manual');
              resetWalkIn();
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'manual'
                ? 'glossy-btn-white text-slate-950 shadow-md'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Option B — Manual Walk-In
          </button>
        </div>
      </div>

      {/* =====================================================================
          OPTION A: SCANNER VIEW
          ===================================================================== */}
      {activeTab === 'scan' && (
        <div className="relative">
          {!scanResult ? (
            <div className="glossy-panel rounded-3xl p-6 sm:p-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold tracking-tight text-white uppercase">Check-In Scanner Hub</h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Scan pass using your USB/handheld barcode scanner, or enter QR ID below
                </p>
              </div>

              <ScannerView onScan={handleScan} isProcessing={isProcessingScan} />
            </div>
          ) : (
            /* ===============================================================
               SCAN OUTCOME FULL CARD (Approved / Duplicate / Invalid)
               =============================================================== */
            <div
              className={`glossy-panel rounded-3xl p-6 sm:p-8 transition-all animate-in fade-in zoom-in-95 duration-200 ${
                scanResult.status === 'valid'
                  ? 'border-emerald-500/40 shadow-emerald-950/30'
                  : scanResult.status === 'duplicate'
                  ? 'border-amber-500/40 shadow-amber-950/30'
                  : 'border-rose-500/40 shadow-rose-950/30'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                {/* Status Icon */}
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl mb-3 border ${
                    scanResult.status === 'valid'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : scanResult.status === 'duplicate'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
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
                  className={`font-mono text-xs font-bold uppercase tracking-[0.25em] ${
                    scanResult.status === 'valid'
                      ? 'text-emerald-400'
                      : scanResult.status === 'duplicate'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {scanResult.status === 'valid'
                    ? 'Entry Approved'
                    : scanResult.status === 'duplicate'
                    ? 'Duplicate Check-In'
                    : 'Invalid QR Code'}
                </span>
                <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
                  {scanResult.status === 'valid'
                    ? 'Check-In Complete!'
                    : scanResult.status === 'duplicate'
                    ? 'Already Checked In'
                    : 'Pass Not Found'}
                </h2>

                {/* Attendee Details */}
                {scanResult.attendee ? (
                  <div className="glossy-card mt-6 w-full max-w-md rounded-2xl p-5 text-left border border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-2xl font-bold text-white tracking-tight">
                          {scanResult.attendee.name}
                        </div>
                        {scanResult.attendee.company && (
                          <div className="text-sm font-medium text-stone-400 mt-0.5">
                            {scanResult.attendee.company}
                          </div>
                        )}
                        {scanResult.attendee.email && (
                          <div className="text-xs text-stone-500 mt-0.5">
                            {scanResult.attendee.email}
                          </div>
                        )}
                      </div>
                      <span className={`rounded-md px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider border ${
                        scanResult.attendee.ticketType.toLowerCase() === 'vip'
                          ? 'bg-white text-slate-950 border-white font-black shadow-xs'
                          : scanResult.attendee.ticketType.toLowerCase() === 'speaker'
                          ? 'bg-white/15 text-white border-white/25'
                          : scanResult.attendee.ticketType.toLowerCase() === 'press'
                          ? 'bg-white/10 text-stone-300 border-white/20'
                          : 'bg-stone-800 text-stone-200 border-stone-700'
                      }`}>
                        {scanResult.attendee.ticketType}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-stone-400 font-mono">
                      <span>Pass ID: {scanResult.attendee.qrId}</span>
                      <span>
                        Checked in: {new Date(scanResult.attendee.checkedInAt || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 max-w-sm text-sm text-stone-300">{scanResult.message}</p>
                )}

                {/* Action Buttons: Print Badge & Scan Next */}
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                  {scanResult.attendee && (
                    <button
                      onClick={() => openBadgePrint(scanResult.attendee!)}
                      className="glossy-btn-white flex-1 flex items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-base font-bold shadow-md cursor-pointer"
                    >
                      <Printer className="h-5 w-5" />
                      Print Badge Now
                    </button>
                  )}
                  <button
                    onClick={resetScan}
                    className="glossy-btn-dark flex-1 flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Scan Next Guest
                  </button>
                </div>

                {/* Live Handheld Scanner Status Banner */}
                <div className="glossy-card mt-4 flex items-center justify-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-stone-300 border border-white/10 shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Scanner is active — zap next badge anytime to proceed hands-free</span>
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
            <div className="glossy-panel mx-auto max-w-xl rounded-3xl p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-stone-300 mb-2">
                  <UserPlus className="h-3.5 w-3.5 text-stone-400" />
                  On-Site Guest Entry
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Manual Walk-In Registration</h2>
                <p className="text-xs text-stone-400 mt-1">
                  Type attendee info. They will be immediately checked in and ready for badge printing.
                </p>
              </div>

              {walkInError && (
                <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-300">
                  {walkInError}
                </div>
              )}

              <form onSubmit={handleWalkInSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Full Name <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan Lee"
                      value={walkInForm.name}
                      onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })}
                      className="glossy-input w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-stone-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Organization / Company <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Tech Inc."
                      value={walkInForm.company}
                      onChange={(e) => setWalkInForm({ ...walkInForm, company: e.target.value })}
                      className="glossy-input w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-stone-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Email Address <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="email"
                      required
                      placeholder="jordan@example.com"
                      value={walkInForm.email}
                      onChange={(e) => setWalkInForm({ ...walkInForm, email: e.target.value })}
                      className="glossy-input w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-stone-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Ticket Type <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Ticket className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <select
                      required
                      value={walkInForm.ticketType}
                      onChange={(e) => setWalkInForm({ ...walkInForm, ticketType: e.target.value })}
                      className="glossy-input w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white"
                    >
                      <option value="General" className="bg-[#0C0E14] text-white">General Admission</option>
                      <option value="VIP" className="bg-[#0C0E14] text-white">VIP All-Access</option>
                      <option value="Speaker" className="bg-[#0C0E14] text-white">Speaker</option>
                      <option value="Staff" className="bg-[#0C0E14] text-white">Staff</option>
                      <option value="Press" className="bg-[#0C0E14] text-white">Press / Media</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingWalkIn}
                  className="glossy-btn-white mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-slate-950 disabled:opacity-40 cursor-pointer"
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
            <div className="glossy-panel mx-auto max-w-xl rounded-3xl p-6 sm:p-8 shadow-xl animate-in fade-in zoom-in-95 duration-200 border border-white/10">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white mb-3 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-stone-300">
                  Walk-In Checked In
                </span>
                <h2 className="text-3xl font-extrabold text-white mt-1">Ready for Badge Printing!</h2>

                <div className="glossy-card mt-5 w-full rounded-2xl p-5 text-left border border-white/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-2xl font-bold text-white">{walkInResult.name}</div>
                      {walkInResult.company && (
                        <div className="text-sm font-medium text-stone-400 mt-0.5">
                          {walkInResult.company}
                        </div>
                      )}
                      {walkInResult.email && (
                        <div className="text-xs text-stone-500 mt-0.5">{walkInResult.email}</div>
                      )}
                    </div>
                    <span className={`rounded-md px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider border ${
                      walkInResult.ticketType.toLowerCase() === 'vip'
                        ? 'bg-white text-slate-950 border-white font-black shadow-xs'
                        : walkInResult.ticketType.toLowerCase() === 'speaker'
                        ? 'bg-white/15 text-white border-white/25'
                        : 'bg-stone-800 text-stone-200 border-stone-700'
                    }`}>
                      {walkInResult.ticketType}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-stone-400 font-mono">
                    <span>Generated Pass: {walkInResult.qrId}</span>
                    <span className="text-emerald-400 font-bold">Pass Generated & Ready</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-stone-300 font-medium">
                  Security Policy: Badges are limited to one print upon on-site registration.
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full">
                  <button
                    disabled={hasWalkInPrinted}
                    onClick={() => openBadgePrint(walkInResult)}
                    className={`flex-1 flex items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-base font-bold shadow-md transition ${
                      hasWalkInPrinted
                        ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 cursor-not-allowed opacity-85'
                        : 'glossy-btn-white cursor-pointer'
                    }`}
                  >
                    {hasWalkInPrinted ? (
                      <>
                        <Check className="h-5 w-5 text-emerald-400" />
                        Badge Printed (1 Issue Limit)
                      </>
                    ) : (
                      <>
                        <Printer className="h-5 w-5" />
                        Print Badge Now
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetWalkIn}
                    className="glossy-btn-white flex-1 flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold shadow-md cursor-pointer"
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
