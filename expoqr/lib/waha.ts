/**
 * Minimal WAHA (WhatsApp HTTP API) client.
 *
 * Verified against the WAHA docs (https://waha.devlike.pro/docs):
 * - GET /api/contacts/check-exists?phone=<digits>&session=<session>
 *   → { numberExists: boolean, chatId: string | null }
 * - POST /api/sendText  { session, chatId: "<digits>@c.us", text }
 *   → message object with `id.fromMe: true` on success
 * Auth: `X-Api-Key: <WAHA_API_KEY>` header on every request.
 */

function wahaBase(): string {
  const url = process.env.WAHA_URL;
  if (!url) throw new Error('Missing WAHA_URL environment variable');
  return url.replace(/\/+$/, '');
}

function wahaSession(): string {
  return process.env.WAHA_SESSION || 'default';
}

function wahaHeaders(): Record<string, string> {
  const key = process.env.WAHA_API_KEY;
  if (!key) throw new Error('Missing WAHA_API_KEY environment variable');
  return { 'X-Api-Key': key, 'Content-Type': 'application/json' };
}

export type CheckExistsResult = {
  numberExists: boolean;
  chatId: string | null;
};

/**
 * Strip a phone number down to digits only (E.164, no "+").
 * WhatsApp requires country code + no spaces/dashes.
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Check whether a phone number is registered on WhatsApp.
 * Returns { numberExists, chatId }.
 */
export async function checkNumberExists(
  phoneDigits: string
): Promise<CheckExistsResult> {
  const url =
    `${wahaBase()}/api/contacts/check-exists?` +
    new URLSearchParams({ phone: phoneDigits, session: wahaSession() });

  const res = await fetch(url, { headers: wahaHeaders(), cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `WAHA check-exists failed (HTTP ${res.status}): ${body.slice(0, 200)}`
    );
  }
  const data = (await res.json()) as { numberExists?: boolean; chatId?: string | null };
  return { numberExists: data.numberExists === true, chatId: data.chatId ?? null };
}

/**
 * Send a plain-text WhatsApp message. chatId is "<digits>@c.us".
 */
export async function sendTextMessage(
  phoneDigits: string,
  text: string
): Promise<void> {
  const res = await fetch(`${wahaBase()}/api/sendText`, {
    method: 'POST',
    headers: wahaHeaders(),
    body: JSON.stringify({
      session: wahaSession(),
      chatId: `${phoneDigits}@c.us`,
      text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `WAHA sendText failed (HTTP ${res.status}): ${body.slice(0, 200)}`
    );
  }
}
