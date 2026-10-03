import { NextRequest, NextResponse } from 'next/server';

/**
 * Staff gate for the volunteer scanner (/scan), the organizer dashboard
 * (/dashboard) and the staff APIs (/api/checkin, /api/visitors).
 *
 * Staff open /scan?key=<ADMIN_KEY> or /dashboard?key=<ADMIN_KEY> once;
 * a persistent httpOnly cookie keeps that device authorized for 30 days.
 * Everyone else gets a 401. API routes get JSON, pages get a small HTML page.
 *
 * ADMIN_KEY must be set in the environment (locally in .env.local, and in
 * Vercel's Environment Variables for the deployed app). If it is missing,
 * everything stays locked — never open.
 */
const COOKIE_NAME = 'staff_auth';

function getAdminKey(): string | undefined {
  return process.env.ADMIN_KEY;
}

function isAuthorized(req: NextRequest): boolean {
  const adminKey = getAdminKey();
  if (!adminKey) return false;
  if (req.nextUrl.searchParams.get('key') === adminKey) return true;
  return req.cookies.get(COOKIE_NAME)?.value === '1';
}

export function middleware(req: NextRequest) {
  const isApi = req.nextUrl.pathname.startsWith('/api/');

  if (isAuthorized(req)) {
    const res = NextResponse.next();
    // Remember this device for 30 days so staff don't re-enter the key.
    res.cookies.set(COOKIE_NAME, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  if (isApi) {
    return NextResponse.json(
      { error: 'Unauthorized — staff key required' },
      { status: 401 }
    );
  }

  const configured = Boolean(getAdminKey());
  const title = configured ? 'Staff only' : 'Not configured';
  const detail = configured
    ? 'This area is restricted. Ask the organizer for the staff link.'
    : 'ADMIN_KEY is not set. Add it in Environment Variables and redeploy.';
  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;margin-top:20vh;color:#e2e8f0;background:#020617"><h1>${title}</h1><p>${detail}</p></body></html>`,
    { status: 401, headers: { 'content-type': 'text/html' } }
  );
}

export const config = {
  matcher: [
    '/scan',
    '/scan/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/api/checkin',
    '/api/visitors',
  ],
};
