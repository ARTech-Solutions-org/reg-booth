import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera, AlertTriangle, RefreshCw, QrCode, ArrowRight } from 'lucide-react';

interface ScannerViewProps {
  onScan: (qrId: string) => void;
  isProcessing?: boolean;
}

export function ScannerView({ onScan, isProcessing = false }: ScannerViewProps) {
  const [cameraState, setCameraState] = useState<'starting' | 'ready' | 'denied' | 'unsupported'>('starting');
  const [manualQr, setManualQr] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraActiveRef = useRef(false);
  const cameraStartedRef = useRef(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRafRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<any>(null);
  const scanLockedRef = useRef(false);

  const isIosDevice =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document));

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

    // Short debounce before allowing next detection
    setTimeout(() => {
      scanLockedRef.current = false;
    }, 1500);
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
        video: isIosDevice
          ? { facingMode: 'environment' }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
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

      // Native BarcodeDetector (Chrome Android hardware accelerated)
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
                // Ignore detector frame error
              }
            }
            if (cameraActiveRef.current) {
              cameraRafRef.current = requestAnimationFrame(loop);
            }
          };
          cameraRafRef.current = requestAnimationFrame(loop);
          return;
        } catch {
          // Fall through to ZXing if BarcodeDetector fails initialization
        }
      }

      // ZXing library fallback (iOS Safari / Firefox / Desktop)
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      codeReader.decodeFromVideoElement(video, (result, error) => {
        if (!cameraActiveRef.current) return;
        if (result && result.getText()) {
          handleDetectedCode(result.getText());
        }
      }).then((controls) => {
        zxingControlsRef.current = controls;
      }).catch((err) => {
        console.warn('ZXing scanner setup issue:', err);
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
    // On Android & desktop, auto-start camera immediately. On iOS, allow tap-to-start or auto.
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualQr.trim()) {
      handleDetectedCode(manualQr.trim());
      setManualQr('');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Video Viewport Container */}
      <div className="relative w-full aspect-square sm:h-[380px] sm:w-[380px] overflow-hidden rounded-3xl border border-stone-300/80 bg-neutral-900 shadow-md">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Subtle darkening overlay surrounding the scan window */}
        <div className="absolute inset-0 bg-black/25 pointer-events-none" />

        {/* Center Target Box - Clean Minimalist Viewfinder */}
        <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
          <div className="relative h-56 w-56 sm:h-64 sm:w-64 rounded-2xl border-2 border-white/60 bg-white/5 transition-all">
            {/* Corner accents */}
            <span className="absolute -left-1 -top-1 h-6 w-6 border-l-3 border-t-3 border-white rounded-tl-md" />
            <span className="absolute -right-1 -top-1 h-6 w-6 border-r-3 border-t-3 border-white rounded-tr-md" />
            <span className="absolute -bottom-1 -left-1 h-6 w-6 border-b-3 border-l-3 border-white rounded-bl-md" />
            <span className="absolute -bottom-1 -right-1 h-6 w-6 border-b-3 border-r-3 border-white rounded-br-md" />

            {/* Subtle center icon */}
            <QrCode className="absolute inset-0 m-auto h-16 w-16 text-white/20" />
          </div>
        </div>

        {/* State messages & overlays */}
        {cameraState === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 text-center p-6">
            <RefreshCw className="h-9 w-9 animate-spin text-stone-300 mb-3" />
            <p className="font-semibold text-stone-100">Connecting camera...</p>
            <p className="mt-1 text-xs text-stone-300">Please grant camera permissions when prompted.</p>
          </div>
        )}

        {cameraState === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/95 text-center p-6">
            <AlertTriangle className="h-10 w-10 text-amber-300 mb-3" />
            <p className="font-bold text-stone-100 text-base">Camera Access Needed</p>
            <p className="mt-1 text-xs text-stone-300 max-w-xs">
              Allow camera permissions in your browser or phone settings to scan passes.
            </p>
            <button
              onClick={() => {
                cameraStartedRef.current = false;
                startCamera();
              }}
              className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-white transition cursor-pointer"
            >
              <Camera className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}

        {cameraState === 'unsupported' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/95 text-center p-6">
            <Camera className="h-10 w-10 text-stone-400 mb-3" />
            <p className="font-bold text-stone-100">Camera Unavailable</p>
            <p className="mt-1 text-xs text-stone-400">
              You can manually enter attendee QR code IDs below.
            </p>
          </div>
        )}

        {/* iOS Manual Tap-to-Enable if blocked by browser policy */}
        {isIosDevice && cameraState !== 'ready' && cameraState !== 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/80 p-6">
            <button
              onClick={() => {
                cameraStartedRef.current = false;
                startCamera();
              }}
              className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900 shadow-md hover:bg-stone-100 transition cursor-pointer"
            >
              <Camera className="h-5 w-5" />
              Tap to Enable Camera
            </button>
            <p className="mt-2 text-xs text-stone-300 text-center">
              Tap to grant camera access for scanning
            </p>
          </div>
        )}
      </div>

      {/* Manual Input Fallback */}
      <form onSubmit={handleManualSubmit} className="mt-4 w-full flex gap-2">
        <input
          type="text"
          value={manualQr}
          onChange={(e) => setManualQr(e.target.value)}
          placeholder="or enter QR ID (e.g. EVT-7Q4M-001)..."
          className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 font-mono text-sm text-slate-800 placeholder:text-stone-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition shadow-sm"
        />
        <button
          type="submit"
          disabled={!manualQr.trim() || isProcessing}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer shadow-sm"
        >
          Check In
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
