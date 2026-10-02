# Expo QR Registration System — Plan

## What
A frictionless, zero-cost expo registration system: visitor scans a venue QR → registers on a mobile Next.js form → phone number is live-verified against WhatsApp via self-hosted WAHA → visitor gets a scannable QR badge on screen → volunteers check people in with a camera-based web scanner → post-event feedback script messages checked-in visitors over WhatsApp.

## Out of scope
- Payments / Razorpay (no ticketing sale — free expo).
- HMAC-signed QR payloads (plain `qr_token` UUID per the brief).
- Official Meta Cloud API (WAHA only, zero cost).
- Multi-event support (single-event MVP; extendable).

## Stack
- Next.js 14 (App Router) + React 18 + TypeScript, Tailwind CSS 3
- Supabase (PostgreSQL) for `visitors`
- WAHA self-hosted (MIT) for WhatsApp verification + messaging
- `react-qr-code` for badge rendering, `html5-qrcode` for gate scanner
- Deploy target: Vercel; feedback script runs locally (`node scripts/feedback.mjs`)

## Data model
`visitors`: `id uuid PK`, `created_at timestamptz`, `name text NOT NULL`,
`phone text UNIQUE NOT NULL` (E.164 digits, no `+`), `company text`, `occupation text`,
`qr_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid()`, `checked_in boolean DEFAULT false`.

RLS: enabled; no public/anon grants; only service-role bypasses RLS (all writes from server routes + script).

## Endpoints / routes
- `GET /` — registration form → on success shows QR badge
- `POST /api/register` — payload validation → WAHA `GET /api/contacts/check-exists?phone=…&session=…` → 400 if `numberExists=false` → insert → 201 `{ qr_token, name }`; 409 on duplicate phone
- `GET /scan` — camera scanner
- `POST /api/checkin` — `{ qr_token }` → sets `checked_in=true`; idempotent (already-checked-in → 200 with flag)
- `scripts/feedback.mjs` — selects `checked_in=true`, 3–6 s random delay between sends, `POST /api/sendText { session, chatId, text }`

## Milestones
1. Scaffold + SQL schema
2. `/api/register` + WAHA lib
3. `/` registration page + badge
4. `/scan` + `/api/checkin`
5. `scripts/feedback.mjs`
6. README + PHASES.md
7. `npm install` + `npm run build` green, VERIFY.md
