import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

type CheckinBody = {
  qr_token?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/checkin
 * Body: { qr_token }
 * Sets visitors.checked_in = true for that token.
 * Idempotent: already-checked-in tokens return 200 with already_checked_in: true.
 */
export async function POST(req: NextRequest) {
  let body: CheckinBody;
  try {
    body = (await req.json()) as CheckinBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const qrToken = (body.qr_token ?? '').trim();
  if (!UUID_RE.test(qrToken)) {
    return NextResponse.json(
      { error: 'Invalid QR code — not a registration token' },
      { status: 400 }
    );
  }

  try {
    const supabase = getServiceClient();

    const { data: visitor, error: findError } = await supabase
      .from('visitors')
      .select('id, name, checked_in')
      .eq('qr_token', qrToken)
      .single();

    if (findError || !visitor) {
      return NextResponse.json(
        { error: 'Unknown badge — no visitor found for this QR code' },
        { status: 404 }
      );
    }

    if (visitor.checked_in) {
      return NextResponse.json({
        ok: true,
        already_checked_in: true,
        name: visitor.name,
      });
    }

    const { error: updateError } = await supabase
      .from('visitors')
      .update({ checked_in: true })
      .eq('id', visitor.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      already_checked_in: false,
      name: visitor.name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('Check-in error:', msg);
    return NextResponse.json(
      { error: 'Check-in failed. Please try again.' },
      { status: 500 }
    );
  }
}
