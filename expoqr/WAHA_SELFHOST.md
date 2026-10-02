# WAHA on your own machine — no card needed

Expo QR Registration System · self-hosted WhatsApp API

**What you're setting up:** WAHA (the WhatsApp API our app uses) running in Docker
on your computer, exposed to the internet through Tailscale Funnel so the app
(hosted on Vercel) can reach it. 100% free. No credit card. No cloud signup.

**Time needed:** ~15 minutes, one time.

---

## Step 1 — Install Docker

- **Windows / Mac:** Install **Docker Desktop** from docker.com. Open it and wait
  until it says it's running.
- **Linux (Ubuntu/Debian):**
  `sudo apt update && sudo apt install -y docker.io && sudo systemctl enable --now docker`

## Step 2 — Install Tailscale (free plan, no card)

- **Windows / Mac:** Install from tailscale.com/download, then sign in
  (Google, GitHub, Microsoft — any of them; the free Personal plan is enough).
- **Linux:** `curl -fsSL https://tailscale.com/install.sh | sh`
  then `sudo tailscale up` and open the login link it prints.

## Step 3 — Start WAHA

Run this in a terminal (Command Prompt / PowerShell / Terminal):

```bash
docker run -d --restart always --name waha -p 3000:3000 -e WAHA_API_KEY=742884da918786c51cb24d8f67a70b59a263e38703fafaef2a7e5686ee68f5da devlikeapro/waha:latest
```

Check it's up: open **http://localhost:3000/dashboard** in your browser —
you should see the WAHA dashboard.

## Step 4 — Expose it to the internet

In a terminal, run:

```bash
tailscale funnel 3000
```

It will print a public URL like `https://your-machine.tail1234.ts.net`.
**That's your WAHA address.** Copy it.

## Step 5 — Send Muse the URL

Paste the funnel URL in chat (it's public by design, no need for the secure form).
Muse wires it into the app, deploys to Vercel, and runs the full live test.

## Step 6 — Pair WhatsApp (Muse will tell you when)

Open the funnel URL + `/dashboard` on your phone's browser, or use the pairing
QR Muse sends you. In WhatsApp: **Settings → Linked devices → Link a device**
and scan it.

---

## Keep-alive rules (important on event days)

- Keep the computer **plugged in, ON, and awake** — turn sleep off:
  - Windows: Settings → Power → "never sleep" when plugged in.
  - Mac: System Settings → Battery → "Prevent automatic sleeping on power adapter".
- If the computer restarts: Docker auto-restarts WAHA (`--restart always`
  handles it). Just re-run `tailscale funnel 3000`.
- If WAHA ever goes down mid-event: **gate check-ins keep working** (they talk
  to the database directly). Only new visitor registrations pause until it's back.

## Troubleshooting

- `docker: command not found` → Docker Desktop isn't running / install didn't finish.
- Dashboard doesn't load on localhost:3000 → wait 30 seconds (first start pulls
  the image), then `docker logs waha` to see what's happening.
- `tailscale funnel` says funnel not available → make sure you're logged into
  Tailscale (`tailscale status` should show "Logged in").
