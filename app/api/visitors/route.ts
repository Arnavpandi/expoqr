import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { hasValidKey } from '@/lib/auth';

/**
 * GET /api/visitors?key=SECRET
 * Staff-only live feed for the organizer dashboard.
 * Returns every visitor with check-in state, newest first.
 *
 * Caching is fully disabled (dynamic + force-no-store): the dashboard polls
 * this every 3 seconds and must see each scan immediately.
 */
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  if (!hasValidKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const supabase = getServiceClient();
    const WITH_TS =
      'id, name, phone, company, occupation, checked_in, checked_in_at, created_at';
    const WITHOUT_TS =
      'id, name, phone, company, occupation, checked_in, created_at';

    let { data, error } = await supabase
      .from('visitors')
      .select(WITH_TS)
      .order('created_at', { ascending: false });

    // Resilience: if the checked_in_at migration hasn't been run yet
    // (Postgres 42703 = undefined column), serve the list without
    // timestamps instead of failing — the dashboard stays live.
    if (error && (error as { code?: string }).code === '42703') {
      console.warn(
        'checked_in_at column missing — serving visitors without timestamps'
      );
      const retry = await supabase
        .from('visitors')
        .select(WITHOUT_TS)
        .order('created_at', { ascending: false });
      if (retry.error) throw retry.error;
      data = (retry.data ?? []).map((v) => ({ ...v, checked_in_at: null }));
      error = null;
    }

    if (error) throw error;
    return NextResponse.json({ visitors: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('visitors error:', msg);
    return NextResponse.json(
      { error: 'Failed to load visitors' },
      { status: 500 }
    );
  }
}
