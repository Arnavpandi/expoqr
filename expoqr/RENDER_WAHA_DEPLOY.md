# WAHA on Render (free tier) — deploy guide

Expo QR Registration System · WhatsApp engine on Render's free tier.
No card needed. ~10 minutes of clicking.

## 1. Sign up on Render

Go to **render.com** → sign up with **GitHub** (fastest). No credit card required
for free-tier services.

## 2. Create the web service

- Dashboard → **New +** → **Web Service**
- Choose **"Deploy an existing image from a registry"**
- Image URL: `devlikeapro/waha:latest`
- Name: `expo-waha`
- Region: **Singapore** (closest to India)
- Instance type: **Free**

## 3. Environment variables

Add these under **Environment** (Render injects `PORT=10000`, so WAHA must
listen on it; `NOWEB` is the lightweight no-browser engine — the right fit
for the free tier's 512 MB RAM):

| Key | Value |
|---|---|
| `WAHA_API_KEY` | *(the key Muse gave you in chat — keep it private)* |
| `WHATSAPP_API_PORT` | `10000` |
| `WHATSAPP_DEFAULT_ENGINE` | `NOWEB` |
| `WAHA_PRINT_QR` | `False` |
| `WAHA_DASHBOARD_USERNAME` | `admin` |
| `WAHA_DASHBOARD_PASSWORD` | *(dashboard password Muse gave you in chat — keep it private)* |
| `WHATSAPP_API_KEY_EXCLUDE_PATH` | `health,ping` |

> **Why the dashboard login?** Newer WAHA versions randomly generate the
> dashboard password on every boot unless you set it explicitly — that's why
> `/dashboard` asks for a username/password. The two `WAHA_DASHBOARD_*` vars
> above fix it permanently. `WHATSAPP_API_KEY_EXCLUDE_PATH` keeps `/health`
> public (no key needed) so Render health checks and keep-alive pings work.

- Health check path: `/health`
- Click **Create Web Service** and wait until the status is **Live**
  (first boot pulls the image — takes a few minutes).

## 4. Pair your WhatsApp

1. Open `https://<your-service>.onrender.com/dashboard`
2. Enter the `WAHA_API_KEY` when asked.
3. Start the **`default`** session.
4. Status goes `STARTING → SCAN_QR_CODE` — scan the QR from your phone:
   WhatsApp → **Settings → Linked devices → Link a device**.
   (QR codes refresh fast — first one lasts ~60s, later ones ~20s. Be quick,
   or hit refresh for a new one.)
5. Status should read **WORKING**. Done — WAHA is live.

## 5. Hand back to Muse

Paste your `https://....onrender.com` URL in chat. Muse then:
- wires `WAHA_URL` + `WAHA_API_KEY` into the app's `.env.local`,
- deploys the Next.js app to Vercel with the same env vars,
- runs the full live test (registration → WhatsApp check → badge → gate scan).

---

## ⚠️ Free-tier caveat (read this)

Render's **free tier has no persistent disk**. WAHA keeps the WhatsApp pairing
in `/app/.sessions`, which is wiped every time the service **sleeps** (after
15 min idle) or restarts. Consequence: **after every sleep you must re-scan
the pairing QR** (step 4 above, takes 30 seconds).

Mitigations:
- **Keep-alive:** ping `https://<service>.onrender.com/health` every ~10 min
  so it never sleeps. One always-on service fits inside the free 750 hrs/month
  quota. Muse can set this up once the URL exists — just say the word.
- Even with keep-alive, any Render **restart/redeploy wipes the session** →
  re-pair. Acceptable for demo/testing.
- **For the live event:** Render Pro + a **persistent disk mounted at
  `/app/.sessions`** — then the pairing survives restarts and the service
  never sleeps. That's the setup your Pro plan is for.
