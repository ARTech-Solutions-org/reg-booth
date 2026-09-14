import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, Sparkles, RefreshCw } from 'lucide-react';
import type { Attendee } from '../../shared/types.js';
import { BadgeCard } from './BadgeCard.js';
import { downloadAttendeeTicket, generateQrDataUrl } from '../lib/qr-utils.js';

interface PrintBadgeModalProps {
  attendee: Attendee | null;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export function PrintBadgeModal({
  attendee,
  isOpen,
  onClose,
  title = 'Print Event Badge',
  subtitle = 'Badge ready for lanyard or credential pocket',
}: PrintBadgeModalProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isQrReady, setIsQrReady] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (attendee && isOpen) {
      setIsQrReady(false);
      generateQrDataUrl(attendee.qrId, 450)
        .then((url) => {
          setQrUrl(url);
          setIsQrReady(true);
        })
        .catch(() => setIsQrReady(true));
    }
  }, [attendee?.qrId, isOpen]);

  if (!isOpen || !attendee) return null;

  const handlePrint = () => {
    if (!isQrReady) return;
    if ((window as any).electronAPI && typeof (window as any).electronAPI.silentPrint === 'function') {
      (window as any).electronAPI.silentPrint();
    } else {
      window.print();
    }
  };

  const handleDownload = () => {
    downloadAttendeeTicket(attendee);
  };

  return (
    <>
      {/* On-Screen Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xl">
        <div className="relative flex w-full max-w-xl flex-col items-center rounded-3xl glossy-panel p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 text-stone-100">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full p-2 text-stone-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-stone-300 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-stone-400" />
              Lanyard Ready Format
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl font-display">
              {title}
            </h2>
            <p className="mt-1 text-sm text-stone-400">
              {subtitle}
            </p>
          </div>

          {/* Live Badge Preview */}
          <div className="my-2 flex justify-center">
            <BadgeCard attendee={attendee} qrDataUrl={qrUrl} />
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex w-full flex-col sm:flex-row gap-3">
            <button
              onClick={handlePrint}
              disabled={!isQrReady}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl glossy-btn-white py-3.5 text-base font-bold shadow-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isQrReady ? (
                <>
                  <Printer className="h-5 w-5" />
                  Print Badge Now
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Preparing Badge...
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 rounded-xl glossy-btn-dark px-5 py-3.5 text-base font-semibold transition active:scale-[0.98] cursor-pointer"
            >
              <Download className="h-5 w-5" />
              Save Image
            </button>
          </div>

          {/* Help tip */}
          <p className="mt-4 text-center text-xs text-stone-400">
            Tip: For thermal badge or label printers, set margins to "None" in the print dialog.
          </p>
        </div>
      </div>

      {/* Dedicated Print Portal for @media print */}
      {typeof document !== 'undefined' &&
        isOpen &&
        createPortal(
          <div id="print-badge-container">
            <BadgeCard attendee={attendee} isPrintable={true} qrDataUrl={qrUrl} />
          </div>,
          document.body
        )}
    </>
  );
}
