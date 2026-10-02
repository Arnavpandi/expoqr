'use client';

import { useState, type FormEvent } from 'react';
import QRCode from 'react-qr-code';

type ApiSuccess = { qr_token: string; name: string };
type ApiError = { error: string };

type State = 'form' | 'submitting' | 'badge';

const inputCls =
  'w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none';

export default function RegistrationPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [occupation, setOccupation] = useState('');
  const [state, setState] = useState<State>('form');
  const [error, setError] = useState<string | null>(null);
  const [badge, setBadge] = useState<ApiSuccess | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setState('submitting');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, company, occupation }),
      });
      const data = (await res.json()) as ApiSuccess & ApiError;
      if (!res.ok) {
        setError(data.error ?? 'Registration failed. Please try again.');
        setState('form');
        return;
      }
      setBadge({ qr_token: data.qr_token, name: data.name });
      setState('badge');
    } catch {
      setError('Network error. Please check your connection and try again.');
      setState('form');
    }
  };

  if (state === 'badge' && badge) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-sm text-center">
          <div className="rounded-3xl border border-emerald-500/40 bg-slate-900 p-8 shadow-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
              You're in, {badge.name}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-100">
              Your Expo Badge
            </h1>
            <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-4">
              <QRCode value={badge.qr_token} size={220} />
            </div>
            <p className="mt-6 text-sm font-semibold text-amber-300">
              Take a screenshot to show at the gate.
            </p>
            <p className="mt-2 break-all font-mono text-xs text-slate-500">
              {badge.qr_token}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-slate-100">Expo Registration</h1>
          <p className="mt-1 text-sm text-slate-400">
            Fill this in and get your digital entry badge instantly.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-300">
                Full name *
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
                required
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-300">
                WhatsApp number *
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="919876543210"
                inputMode="tel"
                autoComplete="tel"
                required
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-500">
                With country code, digits only — e.g. 919876543210. We verify it
                live on WhatsApp.
              </p>
            </div>

            <div>
              <label htmlFor="company" className="mb-1 block text-sm font-medium text-slate-300">
                Company
              </label>
              <input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Corp"
                autoComplete="organization"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="occupation" className="mb-1 block text-sm font-medium text-slate-300">
                Occupation
              </label>
              <input
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Product Manager"
                autoComplete="organization-title"
                className={inputCls}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/50 bg-red-950 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={state === 'submitting'}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              {state === 'submitting' ? 'Verifying WhatsApp number…' : 'Get My Badge'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
