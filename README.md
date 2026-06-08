# TON-PASS 🔐

> Borderless private Twitter content monetization via TON blockchain

Creators share a payment link → Fans pay with TON → Creators manually approve follow requests → Zero friction, full control.

---

## How It Works

1. **Creator** sets up their page (TON wallet + price + private account)
2. **Creator** shares `tonpass.app/pay/yourname` anywhere (Twitter, Instagram, etc.)
3. **Fan** visits link → connects Twitter → pays TON
4. **Fan** sees the private account and sends a follow request
5. **Creator** opens dashboard → sees pending list → clicks [Approve] → done

**Fee: 5% added on top of subscription price (fan pays it)**

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React
- **Auth**: NextAuth.js with Twitter OAuth 2.0
- **Payments**: TON blockchain via TonConnect UI
- **DB**: Supabase (PostgreSQL)
- **Notifications**: Telegram Bot API
- **Cron**: cron-job.org (free tier)
- **Deploy**: Vercel

---

## Project Structure

```
ton-pass/
├── apps/fan/              # Main Next.js app
│   ├── src/app/
│   │   ├── pay/[slug]/    # Fan payment page
│   │   ├── dashboard/     # Creator dashboard
│   │   ├── creator/
│   │   │   ├── onboard/   # Creator setup
│   │   │   └── settings/  # Creator settings
│   │   └── api/
│   │       ├── auth/      # NextAuth
│   │       ├── fan/       # Fan-facing APIs
│   │       ├── creator/   # Creator APIs
│   │       └── cron/      # Cron endpoint
│   └── public/
│       └── tonconnect-manifest.json
├── packages/shared/       # Shared types & utils
└── supabase/migrations/   # DB schema
```

---

## Setup Guide

### 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste `supabase/migrations/001_initial_schema.sql` → Run
3. Copy your project URL, anon key, and service role key

### 2. Twitter Developer App

1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Create a Project → App
3. Enable OAuth 2.0 (User authentication)
4. Set callback URL: `https://YOUR_APP.vercel.app/api/auth/callback/twitter`
5. Request scopes: `tweet.read`, `users.read`
6. Copy Client ID and Client Secret

### 3. Telegram Bot

1. Open Telegram → [@BotFather](https://t.me/BotFather)
2. `/newbot` → follow prompts → copy token
3. `/newapp` → set Web App URL to your Vercel deployment
4. To get your Telegram Chat ID: message [@userinfobot](https://t.me/userinfobot)

### 4. TON Center API (optional but recommended)

1. Get a free API key at [toncenter.com](https://toncenter.com)
2. Increases rate limits for TX verification

### 5. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# From project root
vercel

# Set environment variables in Vercel dashboard
# or use vercel env add
```

Set all variables from `apps/fan/.env.example` in Vercel → Settings → Environment Variables.

### 6. Set Up Cron (cron-job.org)

1. Create account at [cron-job.org](https://cron-job.org) (free)
2. Create new job:
   - URL: `https://YOUR_APP.vercel.app/api/cron/check-expiry`
   - Schedule: Daily at 09:00 UTC
   - HTTP method: GET
   - Headers: `x-cron-secret: YOUR_CRON_SECRET`

### 7. Local Development

```bash
# Install deps
npm install

# Copy env file
cp apps/fan/.env.example apps/fan/.env.local
# Fill in all values

# Run dev server
cd apps/fan && npm run dev
# Open http://localhost:3000
```

---

## API Reference

### Fan APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fan/creator/[slug]` | Get creator info by slug |
| POST | `/api/fan/payment` | Create payment record |
| POST | `/api/fan/verify` | Verify TON transaction |

### Creator APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/creator/register` | Get/create creator profile |
| GET | `/api/creator/dashboard` | Dashboard data |
| POST | `/api/creator/approve` | Approve a payment |
| POST | `/api/creator/reject` | Reject + refund |
| POST | `/api/creator/expire` | Mark as expired |
| PATCH | `/api/creator/settings` | Update settings |

### Cron

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cron/check-expiry` | Auto-expire + send notifications |

---

## Payment Flow

```
Fan                  TON-PASS              Creator Wallet
 │                       │                      │
 │─ POST /api/fan/payment ─▶                    │
 │◀─ { paymentId, tonPayment } ─────────────────│
 │                       │                      │
 │─ TonConnect TX ────────────────────────────▶ │
 │                       │                      │
 │─ POST /api/fan/verify ─▶                     │
 │  (paymentId)          │─ Verify on-chain ─▶  │
 │                       │                      │
 │                       │─ Notify creator ────▶│
 │◀─ { privateAccountUrl } ──────────────────── │
 │                       │                      │
 │─ Visit + Follow ───▶ Twitter                 │
 │                       │                      │
                  Creator approves in dashboard
```

---

## Cron Job Logic (`/api/cron/check-expiry`)

Runs daily:
1. Auto-marks `approved` payments past `expires_at` as `expired`
2. Finds `approved` payments expiring in ≤3 days with `notification_sent = false`
3. Groups by creator → sends Telegram notification per creator
4. Sets `notification_sent = true`

---

## Security Notes

- All creator APIs require Twitter OAuth session
- Cron endpoint protected by `x-cron-secret` header
- Supabase RLS enabled (all access via service role in API routes)
- TON TX verification done server-side via TonCenter API
- No sensitive data stored client-side

---

## License

MIT
