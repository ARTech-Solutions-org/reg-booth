import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import {
  Camera,
  AlertTriangle,
  RefreshCw,
  QrCode,
  ArrowRight,
  Scan,
  CheckCircle,
  Laptop,
} from 'lucide-react';
import { useHardwareScanner } from '../hooks/useHardwareScanner.js';

interface ScannerViewProps {
  onScan: (qrId: string) => void;
  isProcessing?: boolean;
}

export function ScannerView({ onScan, isProcessing = false }: ScannerViewProps) {
  const [mode, setMode] = useState<'hardware' | 'camera'>('hardware');
  const [cameraState, setCameraState] = useState<'starting' | 'ready' | 'denied' | 'unsupported'>('starting');
  const [manualQr, setManualQr] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraActiveRef = useRef(false);
  const cameraStartedRef = useRef(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRafRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<any>(null);
  const scanLockedRef = useRef(false);

  // Global hardware scanner listener
  const { isScanning: isHardwareScanning, lastScanned } = useHardwareScanner({
    onScan: (code) => {
      handleDetectedCode(code);
    },
    enabled: true,
  });

  const handleDetectedCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || scanLockedRef.current || isProcessing) return;

    scanLockedRef.current = true;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(100);
      } catch {
        // Ignore vibration errors
      }
    }

    onScan(trimmed);

    setTimeout(() => {
      scanLockedRef.current = false;
    }, 1200);
  };

  const stopCamera = () => {
    cameraActiveRef.current = false;
    if (cameraRafRef.current !== null) {
      cancelAnimationFrame(cameraRafRef.current);
      cameraRafRef.current = null;
    }

    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {
        // Ignore stop error
      }
      zxingControlsRef.current = null;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    cameraStartedRef.current = false;
  };

  const startCamera = async () => {
    if (cameraStartedRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    cameraStartedRef.current = true;
    cameraActiveRef.current = true;
    setCameraState('starting');

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStreamRef.current = stream;

      if (!cameraActiveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      video.srcObject = stream;
      await video.play();

      if (!cameraActiveRef.current) return;
      setCameraState('ready');

      // Native BarcodeDetector (Chrome Android / Windows hardware accelerated)
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const loop = async () => {
            if (!cameraActiveRef.current) return;
            if (video.readyState >= 2) {
              try {
                const barcodes = await detector.detect(video);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  handleDetectedCode(barcodes[0].rawValue);
                }
              } catch {
                // Ignore frame detector error
              }
            }
            if (cameraActiveRef.current) {
              cameraRafRef.current = requestAnimationFrame(loop);
            }
          };
          cameraRafRef.current = requestAnimationFrame(loop);
          return;
        } catch {
          // Fall through to ZXing
        }
      }

      // ZXing library fallback
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      codeReader.decodeFromVideoElement(video, (result) => {
        if (!cameraActiveRef.current) return;
        if (result && result.getText()) {
          handleDetectedCode(result.getText());
        }
      }).then((controls) => {
        zxingControlsRef.current = controls;
      }).catch((err) => {
        console.warn('ZXing camera setup issue:', err);
      });
    } catch (err: any) {
      console.error('Camera access error:', err);
      cameraStartedRef.current = false;
      if (cameraActiveRef.current) {
        setCameraState('denied');
      }
    }
  };

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualQr.trim()) {
      handleDetectedCode(manualQr.trim());
      setManualQr('');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Mode Switcher: Handheld Scanner (Primary) vs Webcam Camera */}
      <div className="flex items-center justify-center gap-1.5 p-1 mb-4 rounded-xl bg-stone-100/90 border border-stone-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode('hardware')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
            mode === 'hardware'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-stone-600 hover:text-slate-900'
          }`}
        >
          <Scan className="h-3.5 w-3.5 text-emerald-600" />
          <span>USB / Handheld Scanner (Active)</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('camera')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
            mode === 'camera'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-stone-500 hover:text-slate-800'
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          <span>Laptop Webcam</span>
        </button>
      </div>

      {/* ===================================================================
          MODE 1: DEDICATED HARDWARE SCANNER STATION (DEFAULT)
          =================================================================== */}
      {mode === 'hardware' && (
        <div
          className={`relative w-full rounded-3xl border-2 transition-all p-8 flex flex-col items-center justify-center text-center overflow-hidden min-h-[320px] ${
            isHardwareScanning || isProcessing
              ? 'border-emerald-500 bg-emerald-50/40 shadow-md'
              : 'border-stone-300/90 bg-gradient-to-b from-stone-50/80 to-white shadow-xs'
          }`}
        >
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          {/* Live Pulsing Hardware Scanner Target */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-5">
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-3xl border transition-all duration-300 ${
                  isHardwareScanning || isProcessing
                    ? 'scale-110 bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                    : 'bg-white text-slate-800 border-stone-200 shadow-sm'
                }`}
              >
                {isHardwareScanning || isProcessing ? (
                  <RefreshCw className="h-10 w-10 animate-spin" />
                ) : (
                  <QrCode className="h-12 w-12 text-slate-800" />
                )}
              </div>

              {/* Ping ripple effect */}
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
              </span>
            </div>

            {/* Status Heading */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              Scanner Ready • Listening for Barcode
            </div>

            <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
              Point Scanner Gun & Pull Trigger
            </h3>
            <p className="mt-1.5 text-xs text-stone-600 max-w-xs leading-relaxed">
              Aim the handheld scanner at the attendee QR pass to check in instantly.
            </p>

            {lastScanned && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-100 border border-stone-200 px-3 py-1.5 font-mono text-xs text-slate-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>Last Scanned: {lastScanned}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          MODE 2: WEBCAM VIEW (OPTIONAL FALLBACK)
          =================================================================== */}
      {mode === 'camera' && (
        <div className="relative w-full aspect-square sm:h-[340px] sm:w-[340px] overflow-hidden rounded-3xl border border-stone-300/80 bg-neutral-900 shadow-md">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-black/25 pointer-events-none" />

          <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
            <div className="relative h-52 w-52 rounded-2xl border-2 border-white/60 bg-white/5">
              <span className="absolute -left-1 -top-1 h-6 w-6 border-l-3 border-t-3 border-white rounded-tl-md" />
              <span className="absolute -right-1 -top-1 h-6 w-6 border-r-3 border-t-3 border-white rounded-tr-md" />
              <span className="absolute -bottom-1 -left-1 h-6 w-6 border-b-3 border-l-3 border-white rounded-bl-md" />
              <span className="absolute -bottom-1 -right-1 h-6 w-6 border-b-3 border-r-3 border-white rounded-br-md" />
              <QrCode className="absolute inset-0 m-auto h-14 w-14 text-white/20" />
            </div>
          </div>

          {cameraState === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 text-center p-6">
              <RefreshCw className="h-8 w-8 animate-spin text-stone-300 mb-2" />
              <p className="font-semibold text-stone-100 text-sm">Starting Webcam...</p>
            </div>
          )}

          {cameraState === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/95 text-center p-6">
              <AlertTriangle className="h-9 w-9 text-amber-300 mb-2" />
              <p className="font-bold text-stone-100 text-sm">Camera Access Denied</p>
              <button
                type="button"
                onClick={() => {
                  cameraStartedRef.current = false;
                  startCamera();
                }}
                className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-900 hover:bg-white transition cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                Retry Camera
              </button>
            </div>
          )}

          {cameraState === 'unsupported' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/95 text-center p-6">
              <Laptop className="h-9 w-9 text-stone-400 mb-2" />
              <p className="font-bold text-stone-100 text-sm">Camera Not Available</p>
            </div>
          )}
        </div>
      )}

      {/* Manual Input Fallback (Always accessible below) */}
      <form onSubmit={handleManualSubmit} className="mt-4 w-full flex gap-2">
        <input
          type="text"
          value={manualQr}
          onChange={(e) => setManualQr(e.target.value)}
          placeholder="or enter QR ID manually (e.g. EVT-7Q4M-001)..."
          className="scanner-manual-input flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 font-mono text-sm text-slate-800 placeholder:text-stone-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition shadow-xs"
        />
        <button
          type="submit"
          disabled={!manualQr.trim() || isProcessing}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer shadow-xs"
        >
          Check In
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
