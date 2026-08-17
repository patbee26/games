# Game design

The rules of The Portfolio, and why each one is the way it is.

---

## 1. Players and money

- **Five players**: four family members plus one AI player, MERIDIAN.
- Each starts with **$100,000** in cash.
- Balances are **perpetual**. There are no seasons, no resets, no rebuys.
- All money is play money. There is no entry fee and no cash prize at any point.

New players joining later start with $100,000 on the day they join. Their all-time return
is measured from their own start date, which is why the rolling 30-day number matters
(see §5) — it is the only figure that compares everyone on equal footing.

## 2. What can be traded

**US equities and ETFs**, and **crypto**.

**Long-only cash accounts.** No shorting, no margin, no leverage, no options, no futures.

This keeps the ledger trivial — a position is a positive quantity and cash never goes
negative — and it keeps the game legible to family members who have never invested before.
It also means no margin calls, no liquidation logic, and no way to lose more than you have.

> **Open**: this is a recommendation, not yet ratified. See [build-plan.md](build-plan.md).

## 3. The daily clock

This is the core mechanic. The whole game runs on one heartbeat per trading day.

| Time (ET) | What happens |
|---|---|
| **9:30 am** | **Settlement.** Every queued order fills at the opening price. MERIDIAN's reasoning is published. Portfolios are revalued. |
| 4:00 pm | Closing prices captured. Equity curve gets its daily point. |
| **5:30 pm** | **The brief publishes** and is sent to all players. |
| 5:30 pm → 9:30 am | **The order window.** Anyone may queue, amend, or cancel orders. |

### Why orders fill at the open, not at the price you see

If orders filled at the displayed price, and the displayed price came from a free delayed
feed, a player could check the real price on their phone and trade against the game's stale
quote. That is free money, repeatable, and it would ruin the league.

Filling everything at a single daily reference price removes the exploit completely. The
consequences are all good:

- Free or near-free market data becomes adequate, since the displayed price is
  informational rather than transactional.
- The game becomes about conviction rather than reflexes.
- Nobody needs to be at a screen during the working day.

### Why the window is sixteen hours

The brief lands after the close and orders fill the following morning. Everyone gets the
same information, the same long evening to think about it, and the same fill price.

A shorter window — say, a brief at 8am and fills at 9:30am the same day — would advantage
whoever happens to be free at breakfast. A family spread across work, school, and possibly
timezones needs the long window.

A residual asymmetry remains: someone placing an order at 9:25am has seen more overnight
news than someone who placed at 6pm. This is unavoidable in any system with a long window
and is judged acceptable.

### Crypto uses the same clock

Crypto never closes, which would otherwise split this into two games — one about companies,
one about who is awake at 3am. So crypto **settles at 9:30 ET on equity trading days only**.

Crypto positions are still **marked live** at all times, including weekends. Your portfolio
value moves all weekend; you simply cannot act on it until the next open. This is a feature.
It produces genuine Monday-morning drama at no implementation cost.

### Handling daylight saving

9:30 ET is 13:30 UTC for part of the year and 14:30 UTC for the rest. **Never schedule
settlement at a fixed UTC time.** See [architecture.md](architecture.md#scheduling) for the
idempotent polling approach that solves this and makes the job self-healing.

## 4. Orders

- **Market orders only** at launch. There is one fill price per day, so limit orders have
  little meaning; they can be added later as "fill only if the open is below X".
- Orders may be **queued, amended, or cancelled** at any point in the window.
- An order that would breach the position cap (§6) is **rejected at queue time**, with the
  reason shown, rather than silently failing at settlement.
- An order that cannot fill at settlement — insufficient cash after other fills, a halted
  or delisted symbol — is **rejected and logged**, and the player is told why.

### Sealed orders

**No player can see another player's queued order until it has executed.**

This is not a UI preference. It is the mechanism that makes a sixteen-hour window fair: if
orders were visible, the last person to submit would simply copy the best one. It is
enforced by a Row Level Security policy in Postgres, so it holds even if someone opens
developer tools and queries the database directly. See
[data-model.md](data-model.md#row-level-security).

The same rule applies to MERIDIAN. Its orders and its written rationale are both sealed
until the bell.

## 5. Scoring

Two numbers, and which one leads matters.

- **Rolling 30-day return — the headline.** Shown largest, everywhere.
- **All-time return** — shown beneath it, smaller.

Plus a **monthly champion**: best return for the calendar month, marked on that player's
name until the next month ends. It resets; balances do not.

### Why 30-day leads

The game is perpetual. Without a rolling metric, one player has a good first quarter,
snowballs, and everyone else quietly stops opening the app. Disengagement is the realistic
failure mode for a five-person family league — not bugs.

A rolling window means a player down 25% overall can still be having the best month, and
that is the first thing they see when they open the app. It also gives late joiners a
number they can compete on immediately.

### Why not risk-adjusted scoring

Sharpe ratios and drawdown penalties were considered and rejected as too opaque for a
family game. The position cap (§6) addresses the same problem — stopping the winning
strategy from being "everything into one volatile name" — in a way that everyone can
understand at a glance.

## 6. Position cap

**No single position may exceed 25% of portfolio value**, measured at the moment an order
is queued.

Without a cap, the optimal strategy in a pure-return contest is to put the entire balance
into the most volatile thing available. That is a real game, but a dull one, and it stops
being about research.

Positions may drift above 25% through price appreciation — that is not a violation and
nothing is force-sold. The cap only blocks *new purchases* that would push a position over.

The interface shows the cap rather than merely enforcing it: every position's weight bar
carries a marker at 25%, and the order ticket shows post-fill weight before you commit.

> **Open**: the cap is a recommendation. See [build-plan.md](build-plan.md).

## 7. Corporate actions

**Splits and dividends must be handled from day one.** They are the most common way a
paper-trading ledger silently corrupts itself. A single 4:1 split applied to an unadjusted
position destroys that player's P&L and every historical snapshot derived from it.

- **Splits**: adjust quantity and cost basis on the ex-date.
- **Cash dividends**: credit cash on the pay date, log it in the cash ledger, and show it
  in the activity feed — receiving a dividend is a small pleasant event worth surfacing.
- **Crypto**: no corporate actions, but be aware of token migrations if any exotic asset
  is ever permitted.

## 8. Fairness and anti-cheat

The threats to this game are not malicious hackers; they are the ordinary asymmetries that
make a friendly league feel rigged. Each has a specific countermeasure.

| Risk | Countermeasure |
|---|---|
| Trading against a stale displayed price | Fills happen at the open, not the displayed price (§3) |
| Copying another player's order | Sealed orders, enforced by RLS (§4) |
| Being awake when others aren't | Single daily settlement; crypto on the same clock (§3) |
| The AI having better data | MERIDIAN's source list is fixed and published ([ai-player.md](ai-player.md)) |
| The AI knowing the future | The game never runs on historical dates ([ai-player.md](ai-player.md)) |
| Personalised briefs creating info asymmetry | The brief is identical for all players ([daily-brief.md](daily-brief.md)) |
| One lucky concentrated bet deciding everything | 25% position cap (§6) |

## 9. Legal framing

The game is deliberately kept clear of gambling and securities regulation:

- Play money only. No real money enters the game at any point.
- No entry fee, no buy-in, no stake.
- No cash prizes and no prizes of monetary value.
- Private and invite-only among family members.
- No investment advice is given. The brief reports news; MERIDIAN's journal is a game
  character's reasoning, not a recommendation.

Staying on this side of the line is a design constraint, not an afterthought. Adding an
entry fee or a cash prize later would change the game's legal character and should not be
done casually.

Separately, note that **most market data providers forbid redistribution** of their data.
A private league among five invited family members is a different thing from a public site,
but the chosen provider's terms should be read before launch, not after.
