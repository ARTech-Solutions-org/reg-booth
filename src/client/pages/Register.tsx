import React, { useState } from 'react';
import { Sparkles, Download, CheckCircle2, ArrowRight, User, Mail, Building, Ticket, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';
import { generateQrDataUrl, downloadAttendeeTicket } from '../lib/qr-utils.js';
import type { Attendee } from '../../shared/types.js';

export function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    ticketType: 'General',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredAttendee, setRegisteredAttendee] = useState<Attendee | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!formData.company.trim()) {
      setError('Please enter your organization or company.');
      return;
    }
    if (!formData.ticketType.trim()) {
      setError('Please select a ticket type.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.publicRegister(formData);
      setRegisteredAttendee(res.attendee);
      const url = await generateQrDataUrl(res.attendee.qrId, 450);
      setQrDataUrl(url);
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (registeredAttendee) {
      downloadAttendeeTicket(registeredAttendee);
    }
  };

  const resetForm = () => {
    setRegisteredAttendee(null);
    setQrDataUrl('');
    setFormData({
      name: '',
      email: '',
      company: '',
      ticketType: 'General',
    });
  };

  return (
    <div className="min-h-screen calm-canvas-bg text-stone-100 flex flex-col justify-between selection:bg-white/20 selection:text-white">
      {/* Header Bar */}
      <header className="relative z-10 border-b border-white/10 bg-[#0C0E14]/80 backdrop-blur-xl px-6 py-4 shadow-xl">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/brand-logo-mark.png"
              alt="ARTECH Mark"
              className="h-9 w-9 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
            />
            <div>
              <span className="font-extrabold tracking-[0.22em] text-white text-base uppercase">ARTECH</span>
              <span className="text-xs text-stone-400 font-mono ml-2.5 hidden sm:inline tracking-wider uppercase">
                Official Access Portal
              </span>
            </div>
          </div>
          <div className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.25em] font-semibold">
            Live The Experience
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-center">
        {!registeredAttendee ? (
          /* =================================================================
             REGISTRATION FORM
             ================================================================= */
          <div className="mx-auto w-full max-w-lg">
            {/* Title & Introduction */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-stone-300 mb-3 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-stone-400" />
                <span className="tracking-wide">ARTECH • Live the Experience</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Get Your Official Pass
              </h1>
              <p className="mt-2 text-sm text-stone-400">
                Register below to receive your personalized digital entrance pass immediately.
              </p>
            </div>

            {/* Form Card */}
            <div className="glossy-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
              {error && (
                <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Full Name <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="glossy-input w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-stone-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Email Address <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="glossy-input w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-stone-500"
                    />
                  </div>
                </div>

                {/* Organization / Company */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Organization / Company <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corp / Tech Lab"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="glossy-input w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-stone-500"
                    />
                  </div>
                </div>

                {/* Ticket Type */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Ticket Type <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Ticket className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <select
                      required
                      value={formData.ticketType}
                      onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
                      className="glossy-input w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white"
                    >
                      <option value="General" className="bg-[#0C0E14] text-white">General Admission</option>
                      <option value="VIP" className="bg-[#0C0E14] text-white">VIP All-Access Pass</option>
                      <option value="Speaker" className="bg-[#0C0E14] text-white">Speaker Pass</option>
                      <option value="Press" className="bg-[#0C0E14] text-white">Press / Media</option>
                    </select>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glossy-btn-white mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-slate-950 disabled:opacity-40 transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating Your Pass...
                    </>
                  ) : (
                    <>
                      Complete Registration & Get Pass
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* =================================================================
             SUCCESS CONFIRMATION & QR CODE VIEW (GLOSSY MONOCHROMATIC)
             ================================================================= */
          <div className="mx-auto w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white mb-3 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                You're Registered!
              </h2>
              <p className="mt-1 text-sm text-stone-400">
                Here is your official ARTECH digital entrance pass.
              </p>
            </div>

            {/* Ticket Pass Card */}
            <div className="glossy-panel relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
              <div className="text-center border-b border-white/10 pb-4 pt-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-400 font-semibold">
                  ARTECH • LIVE THE EXPERIENCE
                </p>
                <h3 className="mt-1.5 text-2xl font-bold text-white tracking-tight">
                  {registeredAttendee.name}
                </h3>
                {registeredAttendee.company && (
                  <p className="text-sm font-medium text-stone-400 mt-0.5">{registeredAttendee.company}</p>
                )}
                <div className="mt-2.5">
                  <span className={`inline-block rounded-md px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider border ${
                    registeredAttendee.ticketType.toLowerCase() === 'vip'
                      ? 'bg-white text-slate-950 border-white font-black shadow-xs'
                      : registeredAttendee.ticketType.toLowerCase() === 'speaker'
                      ? 'bg-white/15 text-white border-white/25'
                      : 'bg-stone-800 text-stone-200 border-stone-700'
                  }`}>
                    {registeredAttendee.ticketType} Pass
                  </span>
                </div>
              </div>

              {/* QR Code Presentation */}
              <div className="my-6 flex flex-col items-center justify-center">
                <div className="rounded-2xl bg-white p-4 shadow-xl border border-stone-200">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={registeredAttendee.qrId}
                      className="h-52 w-52 object-contain"
                    />
                  ) : (
                    <div className="h-52 w-52 animate-pulse bg-stone-100 rounded-xl" />
                  )}
                </div>
                <p className="mt-3 font-mono text-sm font-bold tracking-widest text-white">
                  {registeredAttendee.qrId}
                </p>
              </div>

              {/* Instructions */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center text-xs text-stone-300 font-medium">
                Show this QR pass at the ARTECH entrance desk for instant check-in and lanyard badge printing.
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  onClick={handleDownload}
                  className="glossy-btn-white flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-slate-950 shadow-md transition cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Save Pass Image
                </button>
                <button
                  onClick={resetForm}
                  className="glossy-btn-dark flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold cursor-pointer"
                >
                  Register Another Attendee
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#08090C]/80 py-4 text-center text-xs text-stone-400 font-mono tracking-[0.2em] uppercase">
        © 2026 ARTECH • LIVE THE EXPERIENCE • Entrance Credentials & Access
      </footer>
    </div>
  );
}
