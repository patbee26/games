# Build plan

Nothing here is built. This is the order to build it in, and the decisions still open.

---

## 1. Open questions

These need answers before or during the phases they affect. The first two are quick
ratifications of recommendations already made; the third is real design work.

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| 1 | Shorting, margin, options? | **No.** Long-only cash accounts. Keeps the ledger trivial and the game legible to beginners. | Phase 1 |
| 2 | Enforce the 25% position cap? | **Yes.** Without it the optimal strategy is everything into one volatile name. | Phase 1 |
| 3 | What does day one look like? | Undesigned. $100k cash, no positions, no curve, no history — the screen that decides whether anyone plays a second day. | Phase 6 |
| 4 | Email the brief, or in-app only? | **Email.** Resend free tier, ~5 messages/day. Highest-leverage engagement feature in the design. | Phase 5 |
| 5 | Which market data provider? | Undecided. Shortlist and criteria in [market-data.md](market-data.md). | Phase 3 |
| 6 | Front-end framework? | **Vite + React SPA.** All logic lives in Supabase; SSR buys nothing here. | Phase 6 |
| 7 | One AI player or several? | **One** at launch. A slate of personalities is a good later addition and costs linearly. | Phase 4 |

## 2. Phases

The ordering principle: **the ledger is the game.** Everything else is a view onto it, so it
gets built first, tested hardest, and never touched casually afterwards.

### Phase 1 — Schema and security

Supabase project, tables, constraints, and every RLS policy from
[data-model.md](data-model.md). Seed `trading_days` from a real exchange calendar. Create
five players including MERIDIAN.

**Done when:** a signed-in test user can read the league, read their own queued orders, and
**cannot** read anyone else's queued orders or write to `positions`, `cash_ledger`, or
`portfolio_snapshots` — verified by trying, from a browser console, not by inspection.

The sealed-order policy is a game mechanic implemented in SQL. Test it like one.

### Phase 2 — The settlement engine, against fake prices

The transaction described in
[data-model.md](data-model.md#settlement-as-a-transaction), driven by a **synthetic price
source** so the ledger can be tested exhaustively without burning API quota or waiting for
real mornings.

Cases that must pass before real money-shaped numbers touch it:

- Buy and sell fill correctly; cash and positions reconcile to the cent.
- Sells process before buys, so same-morning rotations work.
- Insufficient cash → rejected with a reason, not a negative balance.
- An order breaching the 25% cap → rejected at queue time.
- **Running settlement twice for one session is a no-op.**
- A 4:1 split applied before fills leaves quantity, cost basis, and P&L correct.
- A dividend credits cash and writes a ledger row.
- A mid-transaction failure rolls back completely — no half-settled league.

Synthetic prices only. Never test against real historical dates
([ai-player.md](ai-player.md#rule-2--live-dates-only-never-replay-history)).

### Phase 3 — Real market data

Choose the provider, then wire daily open and close into `daily_marks`, delayed quotes for
display, crypto spot, and the corporate-actions check. Add the >25% overnight move flag as
a split tripwire.

Move the scheduler to the idempotent 15-minute poll from
[architecture.md](architecture.md#scheduling). Verify it survives a deliberately killed run
and settles on the next tick.

**Done when:** the league settles itself correctly, unattended, for a full week — including
across a weekend, with crypto marked live but frozen for trading.

### Phase 4 — MERIDIAN

The evening Edge Function: assemble context, decide, **validate against the same rules a
human order faces**, write orders and journal sealed to the next open.

**Done when:** the journal is provably unreadable before the bell — checked by querying it
as another player — and an invalid AI order is dropped rather than written.

### Phase 5 — The brief

Generation from the published source list, the three movements, contextual links, storage,
and email delivery. Then MERIDIAN reads the real brief rather than a stub.

**Done when:** a brief lands every evening for a week without intervention, and a
deliberately failed generation leaves the order window open with an honest message rather
than an empty card.

### Phase 6 — The interface

Last, because [interface.md](interface.md) already settles what it looks like and the
mockup is committed. Build against real data rather than fixtures.

Order within the phase: auth and invites → the empty state (question 3) → dashboard, chart,
positions → order ticket and queued orders → brief and journal with reactions and comments
→ leaderboard and research desk.

### Phase 7 — Play it before opening it

Run the full loop solo for a week — real data, real settlement, real briefs, MERIDIAN
trading — before inviting anyone. Every bug found here is one not found at a family dinner.

Then invite the four players, with the first brief explaining the clock.

## 3. Things it would be easy to get wrong

Collected from the design discussion, in rough order of how much damage each does.

1. **Writing settlement without idempotency.** A retried job that double-fills every order
   corrupts the ledger and every snapshot after it. Guard on `trading_days.settled_at`.
2. **Treating sealed orders as a UI state.** The front end queries Postgres directly; if
   the policy is not in the database, the mechanic does not exist.
3. **Scheduling against a fixed UTC time.** Breaks twice a year, silently.
4. **Ignoring splits and dividends.** Silent, compounding, and invisible until someone's
   curve is obviously wrong and nobody can say when it started.
5. **Ever running the game on historical dates.** MERIDIAN would look supernatural while
   merely remembering.
6. **Personalising the brief's market content.** Different players, different information,
   game over.
7. **Putting the Anthropic key anywhere near the client bundle.** It is a personal card.
8. **Storing money as floats.** Integer cents throughout.
9. **Storing computed returns.** Derive from `portfolio_snapshots`, so a corrected price
   retroactively fixes everything downstream.
10. **Shipping without backups.** Settlement is destructive and irreversible; a nightly
    backup is what turns a bad settlement into an inconvenience.

## 4. Deliberately deferred

Not in scope, and each would change the game's character:

- Shorting, margin, options, leverage.
- Limit and stop orders. There is one price per day; they mean little until intraday fills
  exist, which is not a direction this game is going.
- Intraday or real-time trading. The whole design rests on one settlement per day.
- Seasons and resets. The game is perpetual; the rolling 30-day metric does that work.
- International equities. US equities and crypto only.
- Multiple AI personalities. Good later; one is enough to prove the idea.
- Public or multi-league hosting. Five invited people, one league. Scaling to strangers
  would change auth, hosting cost, and the entire cheating threat model.
- **Any entry fee or cash prize.** This would alter the game's legal character
  ([game-design.md §9](game-design.md#9-legal-framing)). Not a feature to add casually.
