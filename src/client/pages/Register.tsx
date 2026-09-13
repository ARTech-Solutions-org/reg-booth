import React, { useState } from 'react';
import { Sparkles, Download, CheckCircle2, QrCode, ArrowRight, User, Mail, Building, Ticket, RefreshCw } from 'lucide-react';
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
    <div className="min-h-screen calm-canvas-bg text-slate-800 flex flex-col justify-between selection:bg-stone-200 selection:text-slate-900">
      {/* Header Bar */}
      <header className="relative z-10 border-b border-stone-200/80 bg-white/85 backdrop-blur-md px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-slate-800 font-bold border border-stone-200">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-slate-900 text-base">EventPass</span>
              <span className="text-xs text-stone-500 font-mono ml-2 hidden sm:inline font-medium">Official Registration</span>
            </div>
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
              <div className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-stone-700 mb-3 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-stone-500" />
                Global Innovators Summit 2026
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Get Your Event Pass
              </h1>
              <p className="mt-2 text-sm text-stone-600">
                Register below to receive your personalized entrance pass immediately.
              </p>
            </div>

            {/* Form Card */}
            <div className="rounded-3xl border border-stone-200 bg-white/95 p-6 sm:p-8 shadow-sm backdrop-blur-xl">
              {error && (
                <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm font-medium text-rose-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Full Name <span className="text-stone-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="email"
                      placeholder="alex@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition"
                    />
                  </div>
                </div>

                {/* Organization / Company */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Organization / Company
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp / Stanford University"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition"
                    />
                  </div>
                </div>

                {/* Ticket Type */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Ticket Type
                  </label>
                  <div className="relative">
                    <Ticket className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <select
                      value={formData.ticketType}
                      onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition"
                    >
                      <option value="General">General Admission</option>
                      <option value="VIP">VIP All-Access Pass</option>
                      <option value="Speaker">Speaker Pass</option>
                      <option value="Press">Press / Media</option>
                    </select>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-3.5 text-base font-bold text-white shadow-sm active:scale-[0.98] disabled:opacity-40 transition cursor-pointer"
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
             SUCCESS CONFIRMATION & QR CODE VIEW (CALM PASTEL CARD)
             ================================================================= */
          <div className="mx-auto w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F0EA] text-[#2D5538] mb-3 border border-[#D4E5D7]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                You're Registered!
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Here is your official digital entrance pass.
              </p>
            </div>

            {/* Ticket Pass Card */}
            <div className="relative overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="text-center border-b border-stone-100 pb-4 pt-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500 font-semibold">
                  Global Innovators Summit 2026
                </p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  {registeredAttendee.name}
                </h3>
                {registeredAttendee.company && (
                  <p className="text-sm font-medium text-stone-600">{registeredAttendee.company}</p>
                )}
                <div className="mt-2.5">
                  <span className={`inline-block rounded-md px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider border ${
                    registeredAttendee.ticketType.toLowerCase() === 'vip'
                      ? 'bg-[#FDF3E7] text-[#6D4C2F] border-[#F2DECA]'
                      : registeredAttendee.ticketType.toLowerCase() === 'speaker'
                      ? 'bg-[#EEF3F8] text-[#2B4C6F] border-[#D4E0EE]'
                      : registeredAttendee.ticketType.toLowerCase() === 'press'
                      ? 'bg-[#FBF0F1] text-[#6E333B] border-[#F0D5D8]'
                      : 'bg-[#EFF5F0] text-[#2D5538] border-[#D4E5D7]'
                  }`}>
                    {registeredAttendee.ticketType} Pass
                  </span>
                </div>
              </div>

              {/* QR Code Presentation */}
              <div className="my-6 flex flex-col items-center justify-center">
                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
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
                <p className="mt-3 font-mono text-sm font-bold tracking-widest text-slate-800">
                  {registeredAttendee.qrId}
                </p>
              </div>

              {/* Instructions */}
              <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3 text-center text-xs text-stone-600 font-medium">
                Show this QR pass at the entrance station for check-in and lanyard badge printing.
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-3.5 text-sm font-bold text-white shadow-sm active:scale-[0.98] transition cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Save Pass Image
                </button>
                <button
                  onClick={resetForm}
                  className="flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-50 py-3 text-xs font-semibold text-slate-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  Register Another Attendee
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200/80 bg-white/60 py-4 text-center text-xs text-stone-500">
        © 2026 EventPass Systems. Entrance credentials & badge printing.
      </footer>
    </div>
  );
}
