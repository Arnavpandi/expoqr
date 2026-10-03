import { Suspense } from 'react';
import DashboardView from './DashboardView';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 p-4 text-slate-100">
          <p className="mt-8 text-center text-slate-400">Loading dashboard…</p>
        </main>
      }
    >
      <DashboardView />
    </Suspense>
  );
}
