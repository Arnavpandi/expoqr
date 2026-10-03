import { NextRequest } from 'next/server';

/**
 * Shared staff secret protecting /dashboard, /scan and the staff APIs
 * (/api/visitors, /api/checkin).
 *
 * Configure ADMIN_KEY in the environment (Vercel → Environment Variables).
 * Staff open links like /dashboard?key=SECRET or /scan?key=SECRET; the first
 * visit sets a 30-day httpOnly `staff_auth` cookie (see middleware.ts) so the key
 * doesn't need to stay in the URL. API routes also accept an `x-admin-key`
 * header.
 *
 * Fail-closed: if ADMIN_KEY is not configured, every check fails.
 */
const COOKIE_NAME = 'staff_auth';

export function hasValidKey(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return false;
  if (req.nextUrl.searchParams.get('key') === adminKey) return true;
  if (req.headers.get('x-admin-key') === adminKey) return true;
  return req.cookies.get(COOKIE_NAME)?.value === '1';
}
