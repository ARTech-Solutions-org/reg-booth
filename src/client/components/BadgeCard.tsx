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
  eventName = 'ARTECH • LIVE THE EXPERIENCE',
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
      ? 'bg-black text-white border-black'
      : tier === 'speaker'
      ? 'bg-neutral-800 text-white border-neutral-800'
      : tier === 'press' || tier === 'staff'
      ? 'bg-neutral-600 text-white border-neutral-600'
      : 'bg-neutral-100 text-neutral-900 border-neutral-300';

  return (
    <div
      className={`badge-card-printable relative flex flex-col items-center justify-between rounded-2xl bg-white p-6 text-slate-900 transition-all ${
        isPrintable
          ? 'w-[3.2in] h-[4.4in] shadow-none border border-neutral-300'
          : 'w-[320px] sm:w-[350px] min-h-[460px] shadow-xl border border-neutral-200'
      }`}
      style={{
        boxSizing: 'border-box',
      }}
    >
      {/* Top minimal header accent */}
      <div className="w-full h-1 rounded-full bg-neutral-900 -mt-2 mb-2" />
      {/* Lanyard punch hole guide indicator */}
      <div className="flex flex-col items-center gap-1">
        <div className="h-2 w-10 rounded-full border border-dashed border-neutral-400 bg-neutral-100" />
      </div>

      {/* Header & Event Title with Brand Mark */}
      <div className="w-full text-center mt-2 border-b border-neutral-200 pb-2.5 flex flex-col items-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <img
            src="/brand-logo-mark.png"
            alt="ARTECH"
            className="h-4 w-4 object-contain filter invert opacity-90"
          />
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-500">
            Official Credential
          </p>
        </div>
        <h3 className="font-display text-xs font-black tracking-wider text-black uppercase">
          {eventName}
        </h3>
      </div>

      {/* Attendee Name & Company */}
      <div className="w-full text-center my-auto py-2">
        <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-black leading-tight break-words px-2">
          {attendee.name}
        </h2>
        {attendee.company && (
          <p className="mt-1 text-sm font-semibold text-neutral-600 line-clamp-2 px-2">
            {attendee.company}
          </p>
        )}

        {/* Ticket Tier Pill */}
        <div className="mt-3 flex justify-center">
          <span
            className={`inline-block rounded-md px-4 py-1 font-mono text-xs font-black uppercase tracking-widest border ${tierColor}`}
          >
            {attendee.ticketType} ACCESS
          </span>
        </div>
      </div>

      {/* QR Code Container (Crisp, High Contrast) */}
      <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white border border-neutral-200 shadow-sm">
        {qrUrl ? (
          <img
            src={qrUrl}
            alt={attendee.qrId}
            className="h-32 w-32 object-contain"
          />
        ) : (
          <div className="h-32 w-32 animate-pulse bg-neutral-200 rounded-lg" />
        )}
        <span className="mt-1 font-mono text-xs font-bold tracking-widest text-black">
          {attendee.qrId}
        </span>
      </div>

      {/* Footer / Access Verification Bar */}
      <div className="w-full pt-3 mt-1 border-t border-neutral-200 flex items-center justify-between text-[8px] font-mono text-neutral-400 uppercase tracking-wider">
        <span>ARTECH Station</span>
        <span>• Pass Valid •</span>
        <span>Auth Entrance</span>
      </div>
    </div>
  );
}
