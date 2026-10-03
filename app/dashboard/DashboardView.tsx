'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Visitor = {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  occupation: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
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

function fmtClock(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardView() {
  const key = useSearchParams().get('key');
  const [visitors, setVisitors] = useState<Visitor[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Access is gated by proxy.ts (?key= or staff cookie). Attempt the fetch;
    // a 401 means this device isn't authorized.
    const url = key
      ? `/api/visitors?key=${encodeURIComponent(key)}`
      : '/api/visitors';
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.status === 401) {
        setDenied(true);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { visitors?: Visitor[] };
      setVisitors(data.visitors ?? []);
      setDenied(false);
      setError(null);
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [key]);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      void load();
    }, 3000);
    return () => clearInterval(t);
  }, [load]);

  if (denied) {
    return (
      <main className="min-h-screen bg-slate-950 p-4 text-slate-100">
        <div className="mx-auto mt-16 max-w-md rounded-2xl border border-amber-500/50 bg-amber-950 px-6 py-8 text-center">
          <p className="text-xl font-bold text-amber-100">Restricted area</p>
          <p className="mt-2 text-sm text-amber-200/80">
            This dashboard needs a staff link. Ask your organizer for the
            correct URL.
          </p>
        </div>
      </main>
    );
  }

  const total = visitors?.length ?? 0;
  const inside = visitors?.filter((v) => v.checked_in).length ?? 0;
  const pending = total - inside;
  const recent = (visitors ?? [])
    .filter((v) => v.checked_in && v.checked_in_at)
    .sort(
      (a, b) =>
        new Date(b.checked_in_at ?? 0).getTime() -
        new Date(a.checked_in_at ?? 0).getTime()
    )
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Event Dashboard</h1>
          <span className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            LIVE
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Auto-refreshes every 3 seconds
          {updatedAt ? ` · updated ${updatedAt}` : ''}
          {error ? ` · ⚠ ${error}` : ''}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard label="Registered" value={total} tone="slate" />
          <StatCard label="Checked in" value={inside} tone="green" />
          <StatCard label="Awaiting entry" value={pending} tone="amber" />
        </div>

        {recent.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold">Latest check-ins</h2>
            <ul className="mt-2 space-y-2">
              {recent.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5"
                >
                  <div>
                    <p className="font-medium">{v.name}</p>
                    <p className="text-xs text-slate-400">{v.company ?? '—'}</p>
                  </div>
                  <span className="text-sm text-emerald-300">
                    {timeAgo(v.checked_in_at)} ✓
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <h2 className="text-lg font-semibold">All visitors</h2>
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-400">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Phone</th>
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">
                    Company
                  </th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">
                    In at
                  </th>
                </tr>
              </thead>
              <tbody>
                {(visitors ?? []).map((v) => (
                  <tr key={v.id} className="border-t border-slate-800/60">
                    <td className="px-4 py-2.5 font-medium">{v.name}</td>
                    <td className="px-4 py-2.5 text-slate-300">{v.phone}</td>
                    <td className="px-4 py-2.5 text-slate-400 hidden sm:table-cell">
                      {v.company ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {v.checked_in ? (
                        <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-800">
                          IN ✓
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-950 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-800">
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 hidden sm:table-cell">
                      {fmtClock(v.checked_in_at)}
                    </td>
                  </tr>
                ))}
                {visitors !== null && visitors.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No registrations yet — they&apos;ll appear here live.
                    </td>
                  </tr>
                )}
                {visitors === null && !error && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'green' | 'amber';
}) {
  const tones = {
    slate: 'border-slate-800 bg-slate-900 text-slate-100',
    green: 'border-emerald-800 bg-emerald-950 text-emerald-100',
    amber: 'border-amber-800 bg-amber-950 text-amber-100',
  } as const;
  return (
    <div className={`rounded-2xl border px-4 py-4 ${tones[tone]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide opacity-70">{label}</p>
    </div>
  );
}
