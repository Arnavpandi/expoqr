'use client';

import { useEffect, useRef, useState } from 'react';

type Tone = 'green' | 'amber' | 'red';
type ScanResult = { tone: Tone; title: string; detail?: string };

const TONE_CLASSES: Record<Tone, string> = {
  green: 'border-emerald-500 bg-emerald-950 text-emerald-100',
  amber: 'border-amber-500 bg-amber-950 text-amber-100',
  red: 'border-red-500 bg-red-950 text-red-100',
};

function beep(freq: number, secs: number) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + secs);
    osc.stop(ctx.currentTime + secs);
  } catch {
    // Audio unavailable — result is still shown.
  }
}

export default function ScanPage() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [checkins, setCheckins] = useState(0);
  const processingRef = useRef(false);

  useEffect(() => {
    let scanner: {
      stop: () => Promise<void>;
      clear: () => void;
    } | null = null;
    let cancelled = false;

    (async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (cancelled) return;
      const s = new Html5Qrcode('qr-reader');
      scanner = s;
      try {
        await s.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText: string) => {
            void handleScan(decodedText);
          },
          () => {}
        );
      } catch (e) {
        console.error('camera start failed', e);
        setCameraError(
          'Camera unavailable. Allow camera access and reload this page.'
        );
      }
    })();

    return () => {
      cancelled = true;
      (async () => {
        try {
          if (scanner) {
            await scanner.stop();
            scanner.clear();
          }
        } catch {
          // ignore cleanup errors
        }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = async (decodedText: string) => {
    // One scan at a time — the camera keeps firing while the page processes.
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: decodedText.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        already_checked_in?: boolean;
        name?: string;
        error?: string;
      };

      if (res.ok && data.ok) {
        if (data.already_checked_in) {
          setResult({
            tone: 'amber',
            title: 'ALREADY CHECKED IN',
            detail: data.name ? `${data.name} is already inside.` : undefined,
          });
          beep(330, 0.25);
        } else {
          setResult({
            tone: 'green',
            title: 'CHECKED IN ✓',
            detail: data.name ? `Welcome, ${data.name}.` : undefined,
          });
          setCheckins((c) => c + 1);
          beep(880, 0.15);
        }
      } else {
        setResult({
          tone: 'red',
          title: res.status === 404 ? 'UNKNOWN BADGE' : 'SCAN ERROR',
          detail: data.error,
        });
        beep(220, 0.3);
      }
    } catch (e) {
      setResult({
        tone: 'red',
        title: 'SCAN ERROR',
        detail: e instanceof Error ? e.message : 'Unknown error',
      });
      beep(220, 0.3);
    } finally {
      // Small cooldown so the same badge doesn't double-fire.
      setTimeout(() => {
        processingRef.current = false;
        setProcessing(false);
      }, 1200);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gate Scanner</h1>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-200">
            {checkins} checked in
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Point the camera at a visitor's badge.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
          <div id="qr-reader" className="w-full" />
        </div>

        {cameraError && (
          <div className="mt-4 rounded-xl border border-red-500/50 bg-red-950 px-4 py-3 text-sm text-red-200">
            {cameraError}
          </div>
        )}
        {processing && (
          <p className="mt-2 text-center text-sm text-slate-400">Checking in…</p>
        )}

        {result && (
          <div
            role="status"
            className={`mt-4 rounded-2xl border px-4 py-6 text-center ${TONE_CLASSES[result.tone]}`}
          >
            <p className="text-2xl font-bold">{result.title}</p>
            {result.detail && <p className="mt-2">{result.detail}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
