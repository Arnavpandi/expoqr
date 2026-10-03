import { Suspense } from 'react';
import LiveView from './LiveView';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Live at the gate — Expo QR',
  description:
    'Live registration and entry counts from the Expo QR system. Aggregate numbers only — no personal data.',
};

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 p-4 text-slate-100">
          <p className="mt-8 text-center text-slate-400">Loading live stats…</p>
        </main>
      }
    >
      <LiveView />
    </Suspense>
  );
}
