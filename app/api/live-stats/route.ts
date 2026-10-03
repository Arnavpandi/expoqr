import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// Never statically prerender: this feed must reflect the table on every hit.
export const dynamic = 'force-dynamic';
// And never serve the DB read from Next's Data Cache either.
export const fetchCache = 'force-no-store';

/**
 * GET /api/live-stats
 * PUBLIC proof page feed: aggregate counts only — no names, no phone numbers.
 * Powers the public /live page that goes in the organizer outreach.
 * Deliberately NOT in the staff-gate matcher (middleware.ts), so it stays open.
 */
export async function GET() {
  try {
    const supabase = getServiceClient();
    const WITH_TS = 'checked_in, checked_in_at';
    const WITHOUT_TS = 'checked_in';

    let { data, error } = await supabase.from('visitors').select(WITH_TS);

    // Resilience: if the checked_in_at migration hasn't been run yet
    // (Postgres 42703 = undefined column), fall back to counts only.
    if (error && (error as { code?: string }).code === '42703') {
      const retry = await supabase.from('visitors').select(WITHOUT_TS);
      if (retry.error) throw retry.error;
      data = (retry.data ?? []).map((v) => ({ ...v, checked_in_at: null }));
      error = null;
    }
    if (error) throw error;

    const rows = (data ?? []) as {
      checked_in: boolean;
      checked_in_at: string | null;
    }[];
    const registered = rows.length;
    const checkedInRows = rows.filter((r) => r.checked_in);
    const checkedIn = checkedInRows.length;
    const recentCheckins = checkedInRows
      .map((r) => r.checked_in_at)
      .filter((t): t is string => Boolean(t))
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, 8);

    // Public proof numbers must never be cached by browsers or CDNs.
    return NextResponse.json(
      {
        registered,
        checkedIn,
        awaiting: registered - checkedIn,
        recentCheckins,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('live-stats error:', msg);
    return NextResponse.json(
      { error: 'Failed to load live stats' },
      { status: 500 }
    );
  }
}
