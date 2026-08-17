# The Portfolio

A private investing league for five players: four family members and one AI.

Everyone starts with **$100,000** of play money and invests it in real US equities and
crypto at real market prices. Every evening a market brief lands, based on actual news.
Orders can be queued at any hour, but **every order in the game fills at the same moment
— the next market open** — and nobody can see anyone else's order until it executes.

One of the five players is an AI. It reads the same brief, uses the same research sources,
faces the same deadline, and publishes its reasoning every morning. Beating it is the point.

> **Status: design complete, not yet built.** Nothing in this repository executes. These
> documents record every decision made so far and the reasoning behind each one, so that
> implementation can begin without relitigating the design.

---

## Documents

| Document | What it covers |
|---|---|
| [Game design](docs/game-design.md) | The rules. Money, the daily clock, fills, scoring, fairness, legal framing. |
| [Architecture](docs/architecture.md) | Netlify + Supabase + Anthropic. What runs where, and why. Includes costs. |
| [Data model](docs/data-model.md) | Full schema and the Row Level Security policies that enforce sealed orders. |
| [AI player](docs/ai-player.md) | MERIDIAN — how it decides, what it may read, and the rules that keep it fair. |
| [Daily brief](docs/daily-brief.md) | What the brief contains, when it publishes, how it reaches people. |
| [Interface](docs/interface.md) | Design system, screens, and the decisions the mockup encodes. |
| [Market data](docs/market-data.md) | What data the game needs, candidate providers, corporate actions. |
| [Build plan](docs/build-plan.md) | Implementation order, and the questions still open. |

**Interactive mockup:** <https://claude.ai/code/artifact/e711041d-7980-453e-a888-13bbdebce315>
A copy of the source is committed at [`design/dashboard-mockup.html`](design/dashboard-mockup.html).

---

## The five decisions that shape everything else

**1. Every order fills at the next open.** Not at the price on screen. This single choice
removes the delayed-quote arbitrage that would otherwise let a player trade against a stale
price, which in turn means free market data is good enough, which is why this game costs
about $10/month instead of $300. It also changes the genre: from day trading to portfolio
management.

**2. Crypto runs on the same clock as equities.** It settles at 9:30 ET on trading days only.
Crypto positions are still marked live all weekend — your number moves, you just cannot act
on it until Monday. Without this, whoever is awake at 3am wins.

**3. Orders are sealed.** No player sees another's queued order until it has executed. This
is enforced in the database, not the interface. It is what makes the sixteen-hour order
window fair rather than a race.

**4. The AI's sources are published.** MERIDIAN reads a fixed, public list of free research
sites — the same list given to the family. If the AI had data the humans didn't, winning
against it would mean nothing.

**5. Rolling 30-day return is the headline number.** All-time sits underneath it. The game
is perpetual with no resets, so someone having a bad year still needs a reason to open the
app tomorrow.

---

## Deliberately not in this game

No shorting, no margin, no options, no leverage. Long-only cash accounts.
No entry fee, no cash prizes, no real money at any point.
