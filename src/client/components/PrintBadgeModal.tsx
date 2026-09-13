import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, CheckCircle, Sparkles } from 'lucide-react';
import type { Attendee } from '../../shared/types.js';
import { BadgeCard } from './BadgeCard.js';
import { downloadAttendeeTicket } from '../lib/qr-utils.js';

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !attendee) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadAttendeeTicket(attendee);
  };

  return (
    <>
      {/* On-Screen Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
        <div className="relative flex w-full max-w-xl flex-col items-center rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-lg animate-in fade-in zoom-in-95 duration-200">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-1.5 text-xs font-semibold text-stone-700 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-stone-500" />
              Lanyard Ready Format
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              {subtitle}
            </p>
          </div>

          {/* Live Badge Preview */}
          <div className="my-2 flex justify-center">
            <BadgeCard attendee={attendee} />
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex w-full flex-col sm:flex-row gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-3.5 text-base font-bold text-white shadow-sm transition active:scale-[0.98] cursor-pointer"
            >
              <Printer className="h-5 w-5" />
              Print Badge Now
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-50 px-5 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-stone-100 shadow-sm cursor-pointer"
            >
              <Download className="h-5 w-5" />
              Save Image
            </button>
          </div>

          {/* Help tip */}
          <p className="mt-4 text-center text-xs text-slate-500">
            Tip: For thermal badge or label printers, set margins to "None" in the print dialog.
          </p>
        </div>
      </div>

      {/* Dedicated Print Portal for @media print */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="print-badge-container">
            <BadgeCard attendee={attendee} isPrintable={true} />
          </div>,
          document.body
        )}
    </>
  );
}
