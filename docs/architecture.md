# Architecture

Netlify for the front end, Supabase for everything with state or a schedule, Anthropic for
the AI features. The organising principle is that **no secret ever reaches Netlify**.

---

## 1. What runs where

```
┌─────────────────────────────────────────────────────────────┐
│  Netlify — static hosting only                              │
│  Vite + React SPA. No server functions. No secrets.         │
│  Holds only the Supabase URL and anon key, both public.     │
└───────────────────────────┬─────────────────────────────────┘
                            │  supabase-js over HTTPS
                            │  every read filtered by RLS
┌───────────────────────────▼─────────────────────────────────┐
│  Supabase                                                   │
│                                                             │
│  Postgres      tables, RLS policies, the ledger             │
│  Auth          magic links, no passwords                    │
│  Cron          polls every 15 minutes                       │
│  Edge Fns      settlement, close snapshot, brief, AI turn   │
│                                                             │
│  Secrets live here and nowhere else:                        │
│    ANTHROPIC_API_KEY, MARKET_DATA_KEY,                      │
│    RESEND_API_KEY, SERVICE_ROLE_KEY                         │
└───────────┬──────────────────────────────┬──────────────────┘
            │                              │
┌───────────▼──────────┐      ┌────────────▼─────────────────┐
│  Anthropic API       │      │  Market data + email         │
│  brief, AI player    │      │  prices, OHLC, delivery      │
└──────────────────────┘      └──────────────────────────────┘
```

## 2. Why the scheduled work is not on Netlify

This game is a cron system with a dashboard attached. Three jobs run every trading day, and
one of them makes LLM calls that take 30–60 seconds.

Netlify's synchronous functions cut off at around 10 seconds. That is fine for settling
trades and wrong for generating a brief. Netlify background functions allow longer runs but
are plan-dependent.

Rather than work around that, **all scheduled work lives in Supabase Edge Functions**,
triggered by Supabase Cron. This has a second benefit that matters more than the first: the
Anthropic key, the market-data key, and the Postgres service-role key all stay inside
Supabase. Netlify serves static files and holds nothing worth stealing.

The Anthropic account being the user's own makes this material. A key leaked into a client
bundle is a personal credit card exposed to the internet. Designing it out structurally is
better than remembering to be careful.

> Treat all free-tier limits and timeouts in this document as things to verify against
> current provider documentation. They change.

## 3. Scheduling

### The rule: never schedule against a fixed UTC time

9:30 ET is 13:30 UTC under EDT and 14:30 UTC under EST. Cron runs on UTC. A hardcoded
schedule silently breaks twice a year.

### The pattern: poll frequently, act idempotently

A single cron entry runs **every 15 minutes**. On each run the job asks the database three
questions and acts on whichever is true:

```
Is there a trading day whose open has passed and which has settled_at IS NULL?
  → run settlement for that day, then stamp settled_at

Is there a trading day whose close has passed and which has closed_at IS NULL?
  → capture closing marks, write portfolio snapshots, stamp closed_at

Is there a trading day whose brief_due_at has passed with no brief row?
  → generate the brief, then run MERIDIAN's turn, then send email
```

Every job is keyed on a `trading_days` row and guarded by a nullable timestamp, which gives
three properties worth having:

- **DST-proof.** The job never needs to know what the UTC offset is today; the timestamps
  in `trading_days` are absolute.
- **Self-healing.** If a run fails, or Supabase is briefly unavailable, the next run picks
  the work up. A missed cron tick costs 15 minutes, not a day's trading.
- **Safe to retry.** Running settlement twice for the same day is a no-op, because the
  second run finds `settled_at` already stamped. Wrap each job in a transaction so a
  partial failure rolls back rather than half-settling the league.

The `trading_days` table is populated ahead of time from the exchange calendar, including
holidays and half days. See [data-model.md](data-model.md).

### Job inventory

| Job | Trigger condition | Rough duration |
|---|---|---|
| Settle | open passed, unsettled | 2–5s |
| Close snapshot | close passed, not captured | 2–5s |
| Brief + AI turn | brief due, none published | 30–90s |
| Quote refresh | every run, if market open | 1–2s |

## 4. Security model

### Sealed orders are a database rule

The front end is a static SPA querying Postgres with the anon key. Anything the browser can
ask for, a determined player can ask for from the console. So the sealed-order mechanic
cannot live in the UI — it lives in RLS policies:

- A player may read **their own** orders always.
- A player may read **another player's** orders only where `status = 'filled'`.
- MERIDIAN's journal rows are readable only where `published_at <= now()`.

Full policy SQL is in [data-model.md](data-model.md#row-level-security).

### Writes go through the server where they must

Queueing an order is a client write, validated by RLS plus a check constraint. But
**settlement is service-role only**: no client may ever write a fill price, a position
quantity, or a cash balance. Those tables deny all client writes and are only touched by
Edge Functions using the service-role key.

This matters more than it looks. If a player can write their own cash balance, the game has
no integrity at all.

### Auth

Supabase Auth with **magic links**. No passwords to manage, reset, or leak, and for five
family members the email-link flow is genuinely the nicest option. Invites are issued by
adding an address to an allowlist; anyone not on it cannot sign in.

## 5. Front end

**Vite + React, deployed to Netlify as static files.**

Since every piece of logic with a schedule or a secret lives in Supabase, the front end has
no server-side work to do. That makes SSR frameworks unnecessary overhead here — no
adapter, no server runtime, no cold starts, no build-time environment juggling. The client
reads through `supabase-js` and RLS decides what comes back.

Next.js remains a reasonable alternative if the larger ecosystem is wanted later; it buys
little for this application.

Design tokens, layout, and screen inventory are in [interface.md](interface.md).

## 6. Costs

Estimates. The only line that meaningfully varies is the Anthropic usage.

| Component | Plan | Estimated monthly |
|---|---|---|
| Netlify | Free tier | **$0** |
| Supabase | Free tier | **$0** |
| Market data | Free tier | **$0** |
| Email (Resend or similar) | Free tier | **$0** |
| Anthropic API | Pay as you go | **$8–12** |
| | | **≈ $10** |

Comfortably inside the $20/month target, and below the earlier $15–20 estimate because
Netlify and Supabase free tiers absorb five users without strain.

### Where the Anthropic cost comes from

Two calls per trading day — one brief, one AI trading decision — roughly 250 trading days a
year. Each involves a moderate amount of input context and a short written output, plus a
handful of web searches for news. Model choice is the main lever: running the brief on a
smaller, cheaper model roughly halves the bill and the brief is the less demanding of the
two tasks.

### Free-tier gotchas to check

- **Supabase pauses inactive free projects.** A daily cron job constitutes activity, so
  this should not bite — but confirm it, because a paused database on a Monday morning
  means a missed settlement.
- **Supabase free tier database size** is small but enormous relative to this game. Five
  players and a few years of daily snapshots is megabytes.
- **Netlify build minutes** are irrelevant at this scale.
- **Market data call limits** are the real constraint. See
  [market-data.md](market-data.md).

## 7. Environments

A single production project is defensible for a five-person family game, but a staging
Supabase project is strongly advised for one specific reason: **settlement is destructive
and irreversible**. A bug that mis-fills every order corrupts the ledger and every snapshot
downstream of it.

Recommended minimum:

- A local or staging Supabase project with a **fake price source** for developing the
  settlement engine.
- Every settlement wrapped in a transaction.
- Daily database backups retained for at least a fortnight, so a bad settlement can be
  restored rather than reconstructed.
