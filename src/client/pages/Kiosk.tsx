import React, { useState } from 'react';
import {
  Camera,
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
  Maximize,
  Minimize,
  QrCode,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { ScannerView } from '../components/ScannerView.js';
import { PrintBadgeModal } from '../components/PrintBadgeModal.js';
import { useHardwareScanner, playScannerTone } from '../hooks/useHardwareScanner.js';
import type { Attendee, CheckInResult } from '../../shared/types.js';

export function Kiosk() {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // =========================================================================
  // Option A Handlers & Global Hardware Scanner
  // =========================================================================
  const handleScan = async (qrId: string) => {
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
    }
  };

  // Always listening for handheld barcode/QR gun scans on Kiosk
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
  };

  // =========================================================================
  // Badge Printing Trigger
  // =========================================================================
  const openBadgePrint = (attendee: Attendee) => {
    setBadgeAttendee(attendee);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="min-h-screen calm-canvas-bg text-slate-800 flex flex-col justify-between selection:bg-stone-200 selection:text-slate-900">
      {/* Top Kiosk Bar */}
      <header className="relative z-10 border-b border-stone-200/80 bg-white/90 backdrop-blur-md px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-slate-800 font-bold border border-stone-200 shadow-sm">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                <span className="font-extrabold tracking-tight text-slate-900 text-base">
                  EventPass Kiosk
                </span>
                <span className="hidden sm:inline-block rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-stone-600 border border-stone-200">
                  Entrance Station
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium hidden sm:block">
                Global Innovators Summit 2026 • Self & Staff Check-In Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition shadow-sm cursor-pointer text-xs font-semibold"
              title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Kiosk'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-center">
        {/* Big Mode Switcher */}
        <div className="mx-auto w-full max-w-xl mb-6">
          <div className="grid grid-cols-2 p-1.5 rounded-2xl border border-stone-200 bg-white shadow-sm gap-1.5">
            <button
              onClick={() => {
                setActiveTab('scan');
                resetScan();
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition cursor-pointer ${
                activeTab === 'scan'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-slate-900 hover:bg-stone-50'
              }`}
            >
              <Camera className="h-4 w-4" />
              <span>Scan QR Pass</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('manual');
                resetWalkIn();
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-slate-900 hover:bg-stone-50'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>On-Site Walk-In</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            OPTION A: SCANNER VIEW (Scan QR on phone or paper pass)
            ===================================================================== */}
        {activeTab === 'scan' && (
          <div className="mx-auto w-full max-w-xl">
            {!scanResult ? (
              <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="text-center mb-5">
                  <h2 className="text-xl font-bold text-slate-900">Scan Event Pass</h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Scan your pass with the handheld scanner gun, or enter ID manually below.
                  </p>
                </div>

                <ScannerView onScan={handleScan} isProcessing={isProcessingScan} />
              </div>
            ) : (
              /* Outcome Card */
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
                      ? 'Already Checked In'
                      : 'Invalid Pass'}
                  </span>
                  <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                    {scanResult.status === 'valid'
                      ? 'Check-In Complete!'
                      : scanResult.status === 'duplicate'
                      ? 'Pass Already Used'
                      : 'Pass Not Found'}
                  </h2>

                  {/* Attendee Details */}
                  {scanResult.attendee ? (
                    <div className="mt-6 w-full rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
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
                        </div>
                        <span
                          className={`rounded-md px-3 py-1 font-mono text-xs font-bold uppercase border ${
                            scanResult.attendee.ticketType.toLowerCase() === 'vip'
                              ? 'bg-[#FDF3E7] text-[#6D4C2F] border-[#F2DECA]'
                              : scanResult.attendee.ticketType.toLowerCase() === 'speaker'
                              ? 'bg-[#EEF3F8] text-[#2B4C6F] border-[#D4E0EE]'
                              : scanResult.attendee.ticketType.toLowerCase() === 'press'
                              ? 'bg-[#FBF0F1] text-[#6E333B] border-[#F0D5D8]'
                              : 'bg-[#EFF5F0] text-[#2D5538] border-[#D4E5D7]'
                          }`}
                        >
                          {scanResult.attendee.ticketType} Pass
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-mono">
                        <span>Pass ID: {scanResult.attendee.qrId}</span>
                        <span>
                          {scanResult.status === 'valid' ? 'Checked in just now' : 'Previous check-in'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 max-w-sm text-sm text-stone-600">{scanResult.message}</p>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full">
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
                      Scan Next Attendee
                    </button>
                  </div>

                  {/* Live Handheld Scanner Status Banner */}
                  <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-stone-100/90 border border-stone-200/80 px-4 py-1.5 text-xs font-semibold text-stone-600 shadow-2xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Scanner active — point at next badge to check in hands-free</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            OPTION B: MANUAL WALK-IN ENTRY (On-Site Registration)
            ===================================================================== */}
        {activeTab === 'manual' && (
          <div className="mx-auto w-full max-w-xl">
            {!walkInResult ? (
              <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">On-Site Walk-In Registration</h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Enter attendee details to automatically check them in and print their badge.
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
              /* Walk-In Result Card */
              <div className="rounded-3xl border border-[#D4E5D7] bg-[#F7FAF8] p-6 sm:p-8 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0EA] text-[#2D5538] mb-3 border border-[#D4E5D7]">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>

                  <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#2D5538]">
                    Walk-In Registered
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
                      <span
                        className={`rounded-md px-3 py-1 font-mono text-xs font-bold uppercase border ${
                          walkInResult.ticketType.toLowerCase() === 'vip'
                            ? 'bg-[#FDF3E7] text-[#6D4C2F] border-[#F2DECA]'
                            : walkInResult.ticketType.toLowerCase() === 'speaker'
                            ? 'bg-[#EEF3F8] text-[#2B4C6F] border-[#D4E0EE]'
                            : walkInResult.ticketType.toLowerCase() === 'press'
                            ? 'bg-[#FBF0F1] text-[#6E333B] border-[#F0D5D8]'
                            : 'bg-[#EFF5F0] text-[#2D5538] border-[#D4E5D7]'
                        }`}
                      >
                        {walkInResult.ticketType} Pass
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
      </main>

      {/* Kiosk Footer */}
      <footer className="relative z-10 border-t border-stone-200/80 bg-white/60 py-3 text-center text-xs text-stone-500">
        Entrance Station Terminal • EventPass Rapid Credentialing
      </footer>

      {/* Embedded Badge Printing Modal */}
      <PrintBadgeModal
        attendee={badgeAttendee}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
}
