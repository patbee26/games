# Market data

The one part of the stack not yet chosen. It is also the part the settlement engine will be
written against, so it should be pinned before that work starts.

---

## 1. What the game actually needs

The next-open fill model makes this requirement list far shorter than a trading app's.

| Need | Purpose | Frequency |
|---|---|---|
| **Daily opening price** | The fill price. Correctness-critical. | Once per session, ~40 symbols |
| **Daily closing price** | Equity curve snapshot | Once per session, ~40 symbols |
| Delayed intraday quotes | Dashboard display only | Every few minutes while open |
| Crypto spot | Live marks, including weekends | Every few minutes |
| Splits and dividends | Ledger correctness | Daily check |
| Exchange calendar | Seeding `trading_days` | Once, then annually |

**Only the opening price is transactional.** Everything else is informational — if a
displayed quote is fifteen minutes stale, nothing breaks, because no fill depends on it.
This is the whole payoff of the fill-model decision from
[game-design.md §3](game-design.md#3-the-daily-clock), and it is what lets a free tier
carry this game.

Volume is tiny: five players holding perhaps 40 distinct instruments between them, two
authoritative price fetches per day.

## 2. Equities and ETFs

Candidates worth evaluating on free tiers. **Verify current limits and terms directly** —
these change frequently and free tiers have been trimmed repeatedly across the industry.

| Provider | Why it might fit | What to check |
|---|---|---|
| **Tiingo** | Good daily OHLC, generous free tier historically, split/dividend adjusted data | Daily call limit, unique-symbol limit per hour |
| **Twelve Data** | Daily bars plus quotes, crypto in the same API | Calls per day and per minute |
| **Finnhub** | Free US quotes, company news endpoint useful for the brief | Rate limits, whether daily OHLC is on the free plan |
| **Polygon** | High data quality | Free tier is end-of-day only and heavily rate-limited |
| **Alpha Vantage** | Long-standing, simple | Free tier has become very restrictive |

### Selection criteria, in priority order

1. **Reliable daily open and close.** This is the fill price. Nothing else matters as much.
2. **Corporate actions available** — split and dividend endpoints, or adjusted series.
3. **Call limits comfortably above ~100/day** with headroom for retries.
4. **Terms permit a private, non-commercial, invite-only league.** Most providers forbid
   redistribution; five family members behind auth is a different thing from a public site,
   but read the terms rather than assume.
5. Crypto in the same API is a convenience, not a requirement.

### A note on "the opening price"

Decide explicitly which number is the fill price and document it: the official opening
auction print, or the first trade of the regular session. They differ, particularly on
volatile mornings. Whichever is chosen, use it consistently — and store it in `daily_marks`
so a later provider change cannot retroactively alter historical fills.

## 3. Crypto

Genuinely free and unrestricted, with no licensing complications:

- **Coinbase** or **Kraken** public APIs — spot prices, no key needed for public endpoints.
- **CoinGecko** — broad coverage, generous free tier, also the player-facing research link.

Crypto is marked at the same session boundaries as equities for settlement purposes, but
quoted live at all times for display. The weekend behaviour — positions moving while
trading is frozen — is a deliberate feature, not an artefact.

## 4. Corporate actions

**This is the most likely source of silent, compounding corruption in the ledger.**

A 4:1 split on a held position, if unhandled, quarters that player's apparent portfolio
value overnight. Worse, it corrupts every `portfolio_snapshots` row from that day forward,
so the equity curve lies permanently and nobody can tell when it started.

Required from day one:

- **Splits.** On the ex-date, adjust `positions.quantity` and `cost_basis_cents` together.
  Apply splits **before** processing fills in the settlement transaction, so the day's
  trades happen against correct quantities.
- **Cash dividends.** Credit cash on the pay date, write a `cash_ledger` row with reason
  `dividend`, and surface it in the activity feed. Receiving a dividend is a small pleasant
  event and worth showing.
- **Reverse splits, spin-offs, mergers, delistings.** Rare and fiddly. At this scale a
  manual admin path is entirely reasonable: detect that something happened, notify, and fix
  by hand. Do not build machinery for cases that may never occur — but do detect them, so
  they cannot pass unnoticed.

A daily reconciliation check is cheap insurance: if a held instrument's price moved more
than, say, 25% overnight, flag it for a human look before settling. Most such flags will be
real market moves; the occasional one will be an unhandled split, caught before it poisons
the ledger.

## 5. Exchange calendar

`trading_days` needs seeding with real session dates including holidays and half days.

- **Half days** (the sessions closing at 1:00 pm ET around some holidays) affect the close
  snapshot time, not the open, so their impact is limited — but `close_at` must be correct
  or the snapshot job fires against a market that already shut.
- The calendar is stable and published well in advance. Seeding a year at a time, with a
  reminder to extend it, is sufficient. A missing calendar year means settlement silently
  stops, so the seed job should warn when it is running low on future sessions.

## 6. Caching and fallback

- **Persist every authoritative price** in `daily_marks` at settlement. Never re-derive a
  historical fill from a live API later; the fill price is a fact about the game, not a
  fact about the market.
- **Cache display quotes** server-side for a few minutes. Five players refreshing a
  dashboard should not multiply into the provider's rate limit.
- **If the price fetch fails at settlement**, do not fill at a stale or guessed price. Leave
  the session unsettled, alert, and let the idempotent job retry — a settlement delayed by
  fifteen minutes is a minor annoyance, a settlement at a wrong price is a corrupted ledger
  and an argument at dinner.
