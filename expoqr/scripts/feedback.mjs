#!/usr/bin/env node
/**
 * Post-event feedback script (Phase 5).
 *
 * Sends a WhatsApp feedback message to every visitor that checked in:
 *   "Hi [Name], thanks for visiting our expo! Reply with a number from 1 to 5
 *    to rate your experience."
 *
 * Behaviour:
 * - Reads visitors where checked_in = true from Supabase (service-role key).
 * - Random 3–6 s delay between sends to mimic human behaviour and avoid
 *   WhatsApp spam flags.
 * - Sends via WAHA: POST /api/sendText { session, chatId: "<digits>@c.us", text }
 *
 * Env (export these or put them in .env.local and run with a loader):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   WAHA_URL, WAHA_API_KEY, WAHA_SESSION (default "default")
 *
 * Usage:
 *   node scripts/feedback.mjs
 *
 * To run with variables from .env.local:
 *   set -a && source .env.local && set +a && node scripts/feedback.mjs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WAHA_URL = (process.env.WAHA_URL || '').replace(/\/+$/, '');
const WAHA_API_KEY = process.env.WAHA_API_KEY;
const WAHA_SESSION = process.env.WAHA_SESSION || 'default';

for (const [key, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  WAHA_URL,
  WAHA_API_KEY,
}) ) {
  if (!value) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Random delay between 3000 and 6000 ms. */
const humanDelay = () => 3000 + Math.floor(Math.random() * 3001);

async function fetchCheckedInVisitors() {
  const url =
    `${SUPABASE_URL}/rest/v1/visitors` +
    '?select=id,name,phone&checked_in=eq.true';
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(
      `Supabase fetch failed (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`
    );
  }
  return res.json();
}

async function sendText(phoneDigits, text) {
  const res = await fetch(`${WAHA_URL}/api/sendText`, {
    method: 'POST',
    headers: {
      'X-Api-Key': WAHA_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: WAHA_SESSION,
      chatId: `${phoneDigits}@c.us`,
      text,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `WAHA sendText failed (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`
    );
  }
}

const visitors = await fetchCheckedInVisitors();
console.log(`Found ${visitors.length} checked-in visitor(s).`);

let sent = 0;
let failed = 0;

for (let i = 0; i < visitors.length; i++) {
  const v = visitors[i];
  const text =
    `Hi ${v.name}, thanks for visiting our expo! ` +
    `Reply with a number from 1 to 5 to rate your experience.`;
  try {
    await sendText(v.phone, text);
    sent++;
    console.log(`[${i + 1}/${visitors.length}] sent → ${v.phone}`);
  } catch (e) {
    failed++;
    console.error(`[${i + 1}/${visitors.length}] FAILED → ${v.phone}: ${e.message}`);
  }
  if (i < visitors.length - 1) {
    const delay = humanDelay();
    console.log(`  …waiting ${(delay / 1000).toFixed(1)}s`);
    await sleep(delay);
  }
}

console.log(`Done. Sent: ${sent}, failed: ${failed}.`);
process.exit(failed > 0 ? 1 : 0);
