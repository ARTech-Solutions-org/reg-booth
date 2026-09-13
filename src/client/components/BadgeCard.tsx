import React, { useEffect, useState } from 'react';
import type { Attendee } from '../../shared/types.js';
import { generateQrDataUrl } from '../lib/qr-utils.js';

interface BadgeCardProps {
  attendee: Attendee;
  eventName?: string;
  isPrintable?: boolean;
  qrDataUrl?: string;
}

export function BadgeCard({
  attendee,
  eventName = 'Global Innovators Summit 2026',
  isPrintable = false,
  qrDataUrl,
}: BadgeCardProps) {
  const [qrUrl, setQrUrl] = useState<string>(qrDataUrl || '');

  useEffect(() => {
    if (qrDataUrl) {
      setQrUrl(qrDataUrl);
      return;
    }
    let active = true;
    generateQrDataUrl(attendee.qrId, 450).then((url) => {
      if (active) setQrUrl(url);
    });
    return () => {
      active = false;
    };
  }, [attendee.qrId, qrDataUrl]);

  const tier = attendee.ticketType.toLowerCase();
  const tierColor =
    tier === 'vip'
      ? 'bg-[#FDF3E7] text-[#6D4C2F] border-[#F2DECA]'
      : tier === 'speaker'
      ? 'bg-[#EEF3F8] text-[#2B4C6F] border-[#D4E0EE]'
      : tier === 'press' || tier === 'staff'
      ? 'bg-[#FBF0F1] text-[#6E333B] border-[#F0D5D8]'
      : 'bg-[#EFF5F0] text-[#2D5538] border-[#D4E5D7]';

  return (
    <div
      className={`badge-card-printable relative flex flex-col items-center justify-between rounded-2xl bg-white p-6 text-slate-900 transition-all ${
        isPrintable
          ? 'w-[3.2in] h-[4.4in] shadow-none border border-stone-300'
          : 'w-[320px] sm:w-[350px] min-h-[460px] shadow-sm border border-stone-200'
      }`}
      style={{
        boxSizing: 'border-box',
      }}
    >
      {/* Top minimal header accent */}
      <div className="w-full h-1 rounded-full bg-stone-200 -mt-2 mb-2" />
      {/* Lanyard punch hole guide indicator */}
      <div className="flex flex-col items-center gap-1">
        <div className="h-2 w-10 rounded-full border border-dashed border-stone-400 bg-stone-100" />
      </div>

      {/* Header & Event Title */}
      <div className="w-full text-center mt-2 border-b border-slate-200 pb-2.5">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500">
          Official Event Credential
        </p>
        <h3 className="font-display text-sm font-extrabold tracking-tight text-slate-900 uppercase">
          {eventName}
        </h3>
      </div>

      {/* Attendee Name & Company */}
      <div className="w-full text-center my-auto py-2">
        <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-950 leading-tight break-words px-2">
          {attendee.name}
        </h2>
        {attendee.company && (
          <p className="mt-1 text-sm font-semibold text-slate-600 line-clamp-2 px-2">
            {attendee.company}
          </p>
        )}

        {/* Ticket Tier Pill */}
        <div className="mt-3 flex justify-center">
          <span
            className={`inline-block rounded-md px-3.5 py-1 font-mono text-xs font-black uppercase tracking-wider border ${tierColor}`}
          >
            {attendee.ticketType}
          </span>
        </div>
      </div>

      {/* QR Code Container (Crisp, High Contrast) */}
      <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200">
        {qrUrl ? (
          <img
            src={qrUrl}
            alt={attendee.qrId}
            className="h-32 w-32 object-contain"
          />
        ) : (
          <div className="h-32 w-32 animate-pulse bg-slate-200 rounded-lg" />
        )}
        <span className="mt-1 font-mono text-xs font-bold tracking-widest text-slate-700">
          {attendee.qrId}
        </span>
      </div>

      {/* Footer / Access Verification Bar */}
      <div className="w-full pt-3 mt-1 border-t border-slate-200 flex items-center justify-between text-[8px] font-mono text-slate-400 uppercase tracking-wider">
        <span>Station Access</span>
        <span>• Pass Valid •</span>
        <span>Entrance Auth</span>
      </div>
    </div>
  );
}
