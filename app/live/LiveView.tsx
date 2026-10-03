'use client';

import { useCallback, useEffect, useState } from 'react';

type LiveStats = {
  registered: number;
  checkedIn: number;
  awaiting: number;
  recentCheckins: string[];
};

function timeAgo(iso: string): string {
  const s = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center">
      <div className={`text-4xl font-bold ${accent}`}>{value}</div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </div>
  );
}

/**
 * Public proof page for the organizer outreach: live aggregate counts only.
 * No visitor names or phone numbers — the staff dashboard stays behind the key.
 * Deliberately NOT gated by middleware.ts; the feed comes from /api/live-stats.
 */
export default function LiveView() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/live-stats', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStats((await res.json()) as LiveStats);
      setError(null);
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <div className="mt-8 flex items-center justify-center gap-3">
          <h1 className="text-2xl font-bold">Live at the gate</h1>
          <span className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            LIVE
          </span>
        </div>
        <p className="mt-1 text-center text-sm text-slate-400">
          Expo QR registration, happening right now
        </p>

        {error && <p className="mt-6 text-center text-amber-400">{error}</p>}

        {stats && (
          <>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <Stat
                label="Registered"
                value={stats.registered}
                accent="text-sky-400"
              />
              <Stat
                label="Checked in"
                value={stats.checkedIn}
                accent="text-emerald-400"
              />
              <Stat
                label="Awaiting"
                value={stats.awaiting}
                accent="text-amber-400"
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-300">
                Latest check-ins
              </h2>
              {stats.recentCheckins.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No check-ins yet — gates open soon.
                </p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {stats.recentCheckins.map((t) => (
                    <li key={t} className="flex justify-between">
                      <span>Visitor checked in ✓</span>
                      <span className="text-slate-500">
                        {fmtClock(t)} · {timeAgo(t)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {updatedAt && (
          <p className="mt-6 text-center text-xs text-slate-600">
            Updated {updatedAt} · refreshes automatically
          </p>
        )}
      </div>
    </main>
  );
}
