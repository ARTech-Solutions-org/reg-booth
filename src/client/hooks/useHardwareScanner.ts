import { useEffect, useRef, useState } from 'react';

// Map physical key codes (e.code) to ASCII characters regardless of OS keyboard layout (e.g. Arabic, Cyrillic)
const CODE_MAP: Record<string, { normal: string; shift: string }> = {
  KeyA: { normal: 'a', shift: 'A' },
  KeyB: { normal: 'b', shift: 'B' },
  KeyC: { normal: 'c', shift: 'C' },
  KeyD: { normal: 'd', shift: 'D' },
  KeyE: { normal: 'e', shift: 'E' },
  KeyF: { normal: 'f', shift: 'F' },
  KeyG: { normal: 'g', shift: 'G' },
  KeyH: { normal: 'h', shift: 'H' },
  KeyI: { normal: 'i', shift: 'I' },
  KeyJ: { normal: 'j', shift: 'J' },
  KeyK: { normal: 'k', shift: 'K' },
  KeyL: { normal: 'l', shift: 'L' },
  KeyM: { normal: 'm', shift: 'M' },
  KeyN: { normal: 'n', shift: 'N' },
  KeyO: { normal: 'o', shift: 'O' },
  KeyP: { normal: 'p', shift: 'P' },
  KeyQ: { normal: 'q', shift: 'Q' },
  KeyR: { normal: 'r', shift: 'R' },
  KeyS: { normal: 's', shift: 'S' },
  KeyT: { normal: 't', shift: 'T' },
  KeyU: { normal: 'u', shift: 'U' },
  KeyV: { normal: 'v', shift: 'V' },
  KeyW: { normal: 'w', shift: 'W' },
  KeyX: { normal: 'x', shift: 'X' },
  KeyY: { normal: 'y', shift: 'Y' },
  KeyZ: { normal: 'z', shift: 'Z' },
  Digit0: { normal: '0', shift: ')' },
  Digit1: { normal: '1', shift: '!' },
  Digit2: { normal: '2', shift: '@' },
  Digit3: { normal: '3', shift: '#' },
  Digit4: { normal: '4', shift: '$' },
  Digit5: { normal: '5', shift: '%' },
  Digit6: { normal: '6', shift: '^' },
  Digit7: { normal: '7', shift: '&' },
  Digit8: { normal: '8', shift: '*' },
  Digit9: { normal: '9', shift: '(' },
  Numpad0: { normal: '0', shift: '0' },
  Numpad1: { normal: '1', shift: '1' },
  Numpad2: { normal: '2', shift: '2' },
  Numpad3: { normal: '3', shift: '3' },
  Numpad4: { normal: '4', shift: '4' },
  Numpad5: { normal: '5', shift: '5' },
  Numpad6: { normal: '6', shift: '6' },
  Numpad7: { normal: '7', shift: '7' },
  Numpad8: { normal: '8', shift: '8' },
  Numpad9: { normal: '9', shift: '9' },
  Minus: { normal: '-', shift: '_' },
  NumpadSubtract: { normal: '-', shift: '-' },
  Equal: { normal: '=', shift: '+' },
  NumpadAdd: { normal: '+', shift: '+' },
  BracketLeft: { normal: '[', shift: '{' },
  BracketRight: { normal: ']', shift: '}' },
  Backslash: { normal: '\\', shift: '|' },
  Semicolon: { normal: ';', shift: ':' },
  Quote: { normal: "'", shift: '"' },
  Comma: { normal: ',', shift: '<' },
  Period: { normal: '.', shift: '>' },
  NumpadDecimal: { normal: '.', shift: '.' },
  Slash: { normal: '/', shift: '?' },
  NumpadDivide: { normal: '/', shift: '/' },
  NumpadMultiply: { normal: '*', shift: '*' },
  Space: { normal: ' ', shift: ' ' },
};

// Pure Web Audio API tone synthesis (No external asset dependency)
export function playScannerTone(type: 'success' | 'warning' | 'beep') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      // Crisp, positive high chime (880Hz -> 1320Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'warning') {
      // Low dual warning buzz (320Hz -> 240Hz)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(240, now + 0.1);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    } else {
      // Short neutral scan pulse
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch {
    // Audio context may fail if user hasn't interacted with document yet
  }
}

// Module-level deduplication guard: Prevents multiple mounted listeners or rapid burst triggers from firing duplicate API calls
let lastGlobalScanTime = 0;
let lastGlobalScanCode = '';

export function canProcessGlobalScan(code: string, minIntervalMs = 1500): boolean {
  const now = Date.now();
  if (code === lastGlobalScanCode && now - lastGlobalScanTime < minIntervalMs) {
    return false;
  }
  lastGlobalScanTime = now;
  lastGlobalScanCode = code;
  return true;
}

interface UseHardwareScannerOptions {
  onScan: (qrCode: string) => void;
  enabled?: boolean;
  minChars?: number;
  maxIntervalMs?: number;
}

export function useHardwareScanner({
  onScan,
  enabled = true,
  minChars = 3,
  maxIntervalMs = 65,
}: UseHardwareScannerOptions) {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const bufferRef = useRef<{ char: string; time: number }[]>([]);
  const timerRef = useRef<any>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys alone
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isTypingInWalkInForm =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        !activeEl.classList.contains('scanner-manual-input');

      // Decode physical key code to handle Arabic/foreign keyboard layouts automatically
      let char: string | null = null;
      if (CODE_MAP[e.code]) {
        char = e.shiftKey ? CODE_MAP[e.code].shift : CODE_MAP[e.code].normal;
      } else if (e.key.length === 1) {
        char = e.key;
      }

      const now = performance.now();

      // Check if Enter key was received (Hardware scanners append Enter by default)
      if (e.key === 'Enter') {
        const buffer = bufferRef.current;
        if (buffer.length >= minChars) {
          // Calculate average character interval
          let totalInterval = 0;
          for (let i = 1; i < buffer.length; i++) {
            totalInterval += buffer[i].time - buffer[i - 1].time;
          }
          const avgInterval = buffer.length > 1 ? totalInterval / (buffer.length - 1) : 0;

          // If fast burst (< maxIntervalMs) or user wasn't typing in an unrelated form field:
          const isFastBurst = avgInterval < maxIntervalMs || buffer.length >= 8;
          if (isFastBurst || !isTypingInWalkInForm) {
            e.preventDefault();
            e.stopPropagation();

            const fullCode = buffer.map((b) => b.char).join('').trim();
            bufferRef.current = [];
            clearTimeout(timerRef.current);

            if (fullCode.length >= minChars) {
              if (!canProcessGlobalScan(fullCode)) {
                return;
              }
              setLastScanned(fullCode);
              setIsScanning(true);
              playScannerTone('beep');
              onScanRef.current(fullCode);
              setTimeout(() => setIsScanning(false), 500);
            }
            return;
          }
        }
        // Reset buffer on Enter if not valid barcode
        bufferRef.current = [];
        return;
      }

      if (!char) return;

      // Reset buffer if too much time has passed since last key (indicates human typing, not scanner)
      if (bufferRef.current.length > 0) {
        const lastTime = bufferRef.current[bufferRef.current.length - 1].time;
        if (now - lastTime > 180 && isTypingInWalkInForm) {
          bufferRef.current = [];
        }
      }

      bufferRef.current.push({ char, time: now });

      // Fallback timer: Some scanners omit Enter or use Tab
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const buf = bufferRef.current;
        if (buf.length >= minChars + 3) {
          let totalInt = 0;
          for (let i = 1; i < buf.length; i++) {
            totalInt += buf[i].time - buf[i - 1].time;
          }
          const avg = buf.length > 1 ? totalInt / (buf.length - 1) : 0;
          if (avg < maxIntervalMs && !isTypingInWalkInForm) {
            const fullCode = buf.map((b) => b.char).join('').trim();
            bufferRef.current = [];
            if (fullCode.length >= minChars) {
              if (!canProcessGlobalScan(fullCode)) {
                return;
              }
              setLastScanned(fullCode);
              setIsScanning(true);
              playScannerTone('beep');
              onScanRef.current(fullCode);
              setTimeout(() => setIsScanning(false), 500);
            }
          }
        }
        bufferRef.current = [];
      }, 140);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      clearTimeout(timerRef.current);
    };
  }, [enabled, minChars, maxIntervalMs]);

  return { lastScanned, isScanning };
}
