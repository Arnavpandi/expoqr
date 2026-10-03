# Expo QR Registration System

Frictionless, zero-cost expo registration: visitors scan a venue QR, register
on a mobile form, get their WhatsApp number live-verified via self-hosted
**WAHA**, receive an instant **QR badge**, get checked in by volunteers with a
camera-based web scanner, and get a post-event feedback message on WhatsApp.

Stack: Next.js 14 (App Router) + Tailwind CSS + Supabase (PostgreSQL) + WAHA.
No Meta APIs, no per-message costs.

## Prerequisites

- Node.js 18+ and npm
- A Supabase project (free tier is fine)
- WAHA running and linked to WhatsApp (see below)

## Setup

### 1. Clone / open the project

```bash
cd ~/workspace/expo-qr-registration
npm install
```

### 2. Create the database

In the Supabase dashboard → **SQL Editor**, paste and run the full contents of
[`supabase/schema.sql`](supabase/schema.sql). It creates the `visitors` table
with RLS enabled (service-role only — no direct row access for visitors).

### 3. Self-host WAHA (one-liner)

```bash
docker run -d --name waha -p 3000:3000 \
  -e WAHA_API_KEY=<pick-a-strong-key> \
  -v waha-sessions:/app/.sessions \
  devlikeapro/waha:latest
```

Then:
1. Open `http://<your-host>:3000/dashboard`
2. Start the `default` session
3. Scan the QR code with WhatsApp → **Settings → Linked Devices → Link a Device**
4. Session status should read `WORKING` (scan once; sessions persist in the volume)

WAHA is MIT-licensed — free, no per-message fees.

### 4. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key (secret!) |
| `WAHA_URL` | Your WAHA host, e.g. `http://localhost:3000` |
| `WAHA_API_KEY` | The key you set with `WAHA_API_KEY` in the docker run |
| `WAHA_SESSION` | `default` (unless you named your session differently) |

### 5. Run locally

```bash
npm run dev
```

- Visitor form: `http://localhost:3000/`
- Volunteer scanner: `http://localhost:3000/scan` (camera needs HTTPS or localhost)

### 6. Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. **Import** the repo in Vercel.
3. Add all the variables from `.env.local.example` under **Settings →
   Environment Variables** (same values as `.env.local`).
4. Deploy. `npm run build` is the build command, `.next` the output.

**Important:** Vercel must be able to reach your WAHA instance. If WAHA runs on
your laptop, Vercel can't see it — host WAHA on a small VPS (or any always-on
host) and set `WAHA_URL` to its public URL. On the VPS, restrict port 3000 to
Vercel IPs / a reverse proxy; the `X-Api-Key` header is the first line of
defence.

## How it works

| Route / script | What it does |
|---|---|
| `GET /` | Registration form → instant QR badge |
| `POST /api/register` | Validates payload → live WhatsApp check via WAHA `GET /api/contacts/check-exists` → inserts visitor → returns `qr_token` |
| `GET /scan` | Volunteer camera scanner (`html5-qrcode`) |
| `POST /api/checkin` | Sets `checked_in = true` for a `qr_token` (idempotent) |
| `scripts/feedback.mjs` | Messages all checked-in visitors over WhatsApp with 3–6 s human-like delays |

## Post-event feedback

```bash
set -a && source .env.local && set +a
npm run feedback   # or: node scripts/feedback.mjs
```

Sends: *"Hi [Name], thanks for visiting our expo! Reply with a number from 1 to
5 to rate your experience."* to every `checked_in = true` visitor.

## Project layout

```
app/page.tsx              Registration form + QR badge
app/scan/page.tsx         Volunteer camera scanner
app/api/register/route.ts Registration API (WAHA verify + Supabase insert)
app/api/checkin/route.ts  Check-in API (sets checked_in=true)
lib/supabase.ts           Service-role Supabase client (server only)
lib/waha.ts               WAHA client (check-exists, sendText)
supabase/schema.sql       visitors table + RLS
scripts/feedback.mjs      Post-event WhatsApp feedback script
PHASES.md                 Phase-by-phase walkthrough
```

## Security notes

- The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — it lives **only** in server
  code and the feedback script, never in the browser.
- `/scan`, `/dashboard`, `/api/checkin` and `/api/visitors` are gated by a
  shared staff secret (`middleware.ts`): staff open `/scan?key=<ADMIN_KEY>` or
  `/dashboard?key=<ADMIN_KEY>` once and a 30-day httpOnly cookie keeps that
  device authorized; everyone else gets 401. Set `ADMIN_KEY` in `.env.local`
  locally and in Vercel's Environment Variables (Production). The dashboard
  auto-refreshes every 3 seconds, so gate scans show up live.
- `/live` is the **public** proof page for organizer outreach: live aggregate
  counts (registered / checked in / awaiting) plus recent check-in times via
  `/api/live-stats`. It is deliberately NOT gated by `middleware.ts` and
  returns no names or phone numbers — the keyed staff dashboard stays private.
- Check-in writes go through `/api/checkin` with a strict UUID check; unknown
  tokens are rejected.
