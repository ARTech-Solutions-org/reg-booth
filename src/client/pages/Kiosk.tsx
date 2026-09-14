import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Maximize,
  Minimize,
  HelpCircle,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { ScannerView } from '../components/ScannerView.js';
import { BadgeCard } from '../components/BadgeCard.js';
import { PrintBadgeModal } from '../components/PrintBadgeModal.js';
import { useHardwareScanner, playScannerTone } from '../hooks/useHardwareScanner.js';
import { generateQrDataUrl } from '../lib/qr-utils.js';
import type { Attendee, CheckInResult } from '../../shared/types.js';

export function Kiosk() {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Option A (Scan) States
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanResult, setScanResult] = useState<CheckInResult | null>(null);

  // Auto-Print & Instant Badge Dispatch States
  const [activePrintingAttendee, setActivePrintingAttendee] = useState<Attendee | null>(null);
  const [printQrDataUrl, setPrintQrDataUrl] = useState<string>('');
  const [autoReturnCountdown, setAutoReturnCountdown] = useState<number | null>(null);
  const autoReturnTimerRef = useRef<any>(null);

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

  // Badge Print Modal State (for manual walk-in or reprints)
  const [badgeAttendee, setBadgeAttendee] = useState<Attendee | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Clean up auto-return timer on unmount
  useEffect(() => {
    return () => {
      if (autoReturnTimerRef.current) clearInterval(autoReturnTimerRef.current);
    };
  }, []);

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

  // Synchronous lock to prevent parallel network requests from duplicate key events
  const isScanningRef = useRef(false);

  // Trigger instant silent print or window.print with zero clicks
  const triggerInstantPrint = async (attendee: Attendee) => {
    try {
      const qr = await generateQrDataUrl(attendee.qrId, 450);
      setPrintQrDataUrl(qr);
      setActivePrintingAttendee(attendee);

      // Brief tick to allow createPortal to render into document.body
      setTimeout(() => {
        if ((window as any).electronAPI && typeof (window as any).electronAPI.silentPrint === 'function') {
          (window as any).electronAPI.silentPrint();
        } else {
          window.print();
        }
      }, 140);
    } catch (err) {
      console.error('Instant badge auto-print failed:', err);
    }
  };

  // =========================================================================
  // Option A Handlers & Global Hardware Scanner
  // =========================================================================
  const handleScan = async (qrId: string) => {
    if (isScanningRef.current || isProcessingScan) return;
    isScanningRef.current = true;
    setIsProcessingScan(true);

    // Clear any previous countdown
    if (autoReturnTimerRef.current) clearInterval(autoReturnTimerRef.current);
    setAutoReturnCountdown(null);

    try {
      const result = await api.checkIn(qrId);
      setScanResult(result);

      if (result.status === 'valid' && result.attendee) {
        playScannerTone('success');
        // Instantly trigger silent print with zero intermediate clicks
        await triggerInstantPrint(result.attendee);

        // 4-second auto-reset countdown to return to scanner
        setAutoReturnCountdown(4);
        autoReturnTimerRef.current = setInterval(() => {
          setAutoReturnCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(autoReturnTimerRef.current);
              resetScan();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (result.status === 'duplicate') {
        playScannerTone('warning');
        // 6-second auto-reset countdown so the station is ready for next attendee
        setAutoReturnCountdown(6);
        autoReturnTimerRef.current = setInterval(() => {
          setAutoReturnCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(autoReturnTimerRef.current);
              resetScan();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        playScannerTone('warning');
        // 5-second countdown for unrecognized pass
        setAutoReturnCountdown(5);
        autoReturnTimerRef.current = setInterval(() => {
          setAutoReturnCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(autoReturnTimerRef.current);
              resetScan();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      playScannerTone('warning');
      setScanResult({
        status: 'invalid',
        message: err.message || 'Check-in request failed. Please try again.',
        attendee: null,
      });
      setAutoReturnCountdown(5);
      autoReturnTimerRef.current = setInterval(() => {
        setAutoReturnCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(autoReturnTimerRef.current);
            resetScan();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setIsProcessingScan(false);
      setTimeout(() => {
        isScanningRef.current = false;
      }, 1000);
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
    if (autoReturnTimerRef.current) clearInterval(autoReturnTimerRef.current);
    setAutoReturnCountdown(null);
    setScanResult(null);
    setActivePrintingAttendee(null);
    setPrintQrDataUrl('');
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
    <div className="min-h-screen calm-canvas-bg text-stone-100 flex flex-col justify-between selection:bg-white/20 selection:text-white">
      {/* Top Kiosk Bar */}
      <header className="relative z-10 border-b border-white/10 bg-[#0C0E14]/80 backdrop-blur-xl px-6 py-4 shadow-xl">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img
              src="/brand-logo-mark.png"
              alt="ARTECH Logo"
              className="h-10 w-10 object-contain drop-shadow-[0_0_16px_rgba(255,255,255,0.3)]"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-extrabold tracking-[0.2em] text-white text-base uppercase">
                  ARTECH KIOSK
                </span>
                <span className="hidden sm:inline-block rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-stone-300 border border-white/15">
                  Station Online
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium hidden sm:block tracking-wide">
                ARTECH • Live the Experience | Rapid Credentialing Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="glossy-btn-dark flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
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
          <div className="glossy-panel grid grid-cols-2 p-1.5 rounded-2xl gap-1.5">
            <button
              onClick={() => {
                setActiveTab('scan');
                resetScan();
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition cursor-pointer ${
                activeTab === 'scan'
                  ? 'glossy-btn-white text-slate-950 shadow-md'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Scan className="h-4 w-4" />
              <span className="tracking-wide">Scan Pass</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('manual');
                resetWalkIn();
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition cursor-pointer ${
                activeTab === 'manual'
                  ? 'glossy-btn-white text-slate-950 shadow-md'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span className="tracking-wide">On-Site Walk-In</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            OPTION A: SCANNER VIEW (Scan QR on phone or paper pass)
            ===================================================================== */}
        {activeTab === 'scan' && (
          <div className="mx-auto w-full max-w-xl">
            {!scanResult ? (
              <div className="glossy-panel rounded-3xl p-6 sm:p-8">
                <div className="text-center mb-5">
                  <h2 className="text-xl font-bold tracking-tight text-white uppercase">Scan Event Pass</h2>
                  <p className="text-xs text-stone-400 mt-1">
                    Scan attendee pass with the handheld scanner gun, or enter ID manually below.
                  </p>
                </div>

                <ScannerView onScan={handleScan} isProcessing={isProcessingScan} />
              </div>
            ) : scanResult.status === 'valid' && scanResult.attendee ? (
              /* =============================================================
                 1. ACTIVE PRINTING SCREEN (Instant Silent Auto-Print on Scan)
                 ============================================================= */
              <div className="glossy-panel rounded-3xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 border border-white/20 shadow-2xl">
                <div className="flex flex-col items-center text-center">
                  {/* Animated Printer Icon with Specular Ring */}
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-black mb-4 shadow-[0_0_35px_rgba(255,255,255,0.35)]">
                    <Printer className="h-10 w-10 animate-bounce" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 mb-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Printing In Progress
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase font-display">
                    Printing Your Badge...
                  </h2>
                  <p className="mt-1.5 text-sm text-stone-300 max-w-md">
                    Your official event credential is being printed automatically. Please collect it from the badge dispenser.
                  </p>

                  {/* Attendee Details Card */}
                  <div className="glossy-card mt-6 w-full rounded-2xl p-5 text-left border border-white/10">
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
                      </div>
                      <span className="rounded-md px-3.5 py-1 font-mono text-xs font-black uppercase tracking-widest bg-white text-black border border-white">
                        {scanResult.attendee.ticketType} ACCESS
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-stone-400 font-mono">
                      <span>Pass ID: {scanResult.attendee.qrId}</span>
                      <span className="text-emerald-400 font-bold">Authorized & Dispatched</span>
                    </div>
                  </div>

                  {/* Countdown & Progress bar */}
                  <div className="mt-6 w-full flex flex-col items-center gap-2">
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-white h-full rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${((autoReturnCountdown ?? 4) / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-stone-400">
                      Ready for next guest in {autoReturnCountdown ?? 0}s...
                    </span>
                  </div>

                  <button
                    onClick={resetScan}
                    className="glossy-btn-dark mt-4 flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-stone-300 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Scan Next Guest Immediately
                  </button>
                </div>
              </div>
            ) : scanResult.status === 'duplicate' ? (
              /* =============================================================
                 2. DUPLICATE PASS / ALREADY PRINTED SCREEN
                 ============================================================= */
              <div className="glossy-panel rounded-3xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 border border-amber-500/40 shadow-amber-950/30">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)] mb-3">
                    <AlertCircle className="h-9 w-9" />
                  </div>

                  <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
                    Credential Already Issued
                  </span>
                  <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white font-display">
                    Badge Already Printed
                  </h2>
                  <p className="mt-1.5 text-sm text-stone-300 max-w-md">
                    This attendee pass has already been scanned and its official credential was previously printed.
                  </p>

                  {/* Attendee Details */}
                  {scanResult.attendee && (
                    <div className="glossy-card mt-5 w-full rounded-2xl p-5 text-left border border-white/10">
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
                        </div>
                        <span className="rounded-md px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider border border-white/20 text-stone-300 bg-white/5">
                          {scanResult.attendee.ticketType} Pass
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-stone-400 font-mono">
                        <span>Pass ID: {scanResult.attendee.qrId}</span>
                        <span className="text-amber-400 font-bold">Previously Checked In</span>
                      </div>
                    </div>
                  )}

                  {/* Dedicated Event Support Help Box */}
                  <div className="mt-5 w-full rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-left backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white mt-0.5">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                          Need a Replacement Badge?
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-stone-300">
                          If you have misplaced your printed badge or believe this is an error, please visit the <b>ARTECH Event Support & Help Desk</b> for staff assistance and badge re-issuance.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full">
                    <button
                      onClick={resetScan}
                      className="glossy-btn-white flex-1 flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold shadow-md cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Scan Next Pass
                    </button>
                  </div>

                  {autoReturnCountdown !== null && (
                    <span className="mt-3 text-xs font-mono text-stone-400">
                      Returning to scanner in {autoReturnCountdown}s...
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* =============================================================
                 3. UNRECOGNIZED PASS / INVALID SCREEN
                 ============================================================= */
              <div className="glossy-panel rounded-3xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 border border-rose-500/40 shadow-rose-950/30">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)] mb-3">
                    <XCircle className="h-9 w-9" />
                  </div>

                  <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-rose-400">
                    Unrecognized Credential
                  </span>
                  <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white font-display">
                    Pass Not Found
                  </h2>
                  <p className="mt-1.5 text-sm text-stone-300 max-w-md">
                    This QR code is not registered for ARTECH • LIVE THE EXPERIENCE.
                  </p>

                  {/* Dedicated Event Support Help Box */}
                  <div className="mt-5 w-full rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-left backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white mt-0.5">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                          Assistance Required
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-stone-300">
                          Please proceed to the <b>ARTECH Event Registration & Support Desk</b> to verify your invitation or complete an on-site registration.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3 w-full">
                    <button
                      onClick={resetScan}
                      className="glossy-btn-white flex-1 flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold shadow-md cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Scan Next Pass
                    </button>
                  </div>

                  {autoReturnCountdown !== null && (
                    <span className="mt-3 text-xs font-mono text-stone-400">
                      Returning to scanner in {autoReturnCountdown}s...
                    </span>
                  )}
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
              <div className="glossy-panel rounded-3xl p-6 sm:p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white tracking-tight">On-Site Walk-In Registration</h2>
                  <p className="text-xs text-stone-400 mt-1">
                    Enter attendee details to automatically check them in and print their badge.
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
              /* Walk-In Result Card */
              <div className="glossy-panel rounded-3xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 border border-white/10">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white mb-3 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>

                  <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-stone-300">
                    Walk-In Registered
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
                      <span
                        className={`rounded-md px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider border ${
                          walkInResult.ticketType.toLowerCase() === 'vip'
                            ? 'bg-white text-slate-950 border-white font-black shadow-xs'
                            : walkInResult.ticketType.toLowerCase() === 'speaker'
                            ? 'bg-white/15 text-white border-white/25'
                            : 'bg-stone-800 text-stone-200 border-stone-700'
                        }`}
                      >
                        {walkInResult.ticketType} Pass
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-stone-400 font-mono">
                      <span>Generated Pass: {walkInResult.qrId}</span>
                      <span className="text-emerald-400 font-bold">Pass Generated & Ready</span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full">
                    <button
                      onClick={() => openBadgePrint(walkInResult)}
                      className="glossy-btn-white flex-1 flex items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-base font-bold shadow-md cursor-pointer"
                    >
                      <Printer className="h-5 w-5" />
                      Print Official Badge
                    </button>
                    <button
                      onClick={resetWalkIn}
                      className="glossy-btn-dark flex-1 flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold cursor-pointer"
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
      <footer className="relative z-10 border-t border-white/10 bg-[#08090C]/80 py-3.5 text-center text-xs text-stone-400 tracking-[0.25em] uppercase font-mono">
        ARTECH • LIVE THE EXPERIENCE • Entrance Terminal Station
      </footer>

      {/* Embedded Badge Printing Modal (for manual walk-in or reprints) */}
      <PrintBadgeModal
        attendee={badgeAttendee}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Hidden Portal for Instant / Silent Badge Printing on Scan */}
      {typeof document !== 'undefined' && activePrintingAttendee && createPortal(
        <div id="print-badge-container">
          <BadgeCard attendee={activePrintingAttendee} isPrintable={true} qrDataUrl={printQrDataUrl} />
        </div>,
        document.body
      )}
    </div>
  );
}
