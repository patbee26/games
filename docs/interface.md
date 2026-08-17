# Interface

**Mockup:** <https://claude.ai/code/artifact/e711041d-7980-453e-a888-13bbdebce315>
**Source:** [`design/dashboard-mockup.html`](../design/dashboard-mockup.html)

The mockup is a static page with sample data. Its countdown and market-status pill are
genuinely live — they compute the real next open in Eastern time, skipping weekends and
market holidays — because a fake clock would have hidden the one thing most worth testing.

---

## 1. Design direction

The distinctive thing about this game is that **nothing happens in real time**. Orders sit
sealed overnight; everyone waits for the bell. So the interface deliberately does not
imitate a frantic trading terminal. It is closer to an evening ritual — something read with
coffee — with one moment of drama at the open.

That reading drives every choice below.

## 2. Tokens

### Colour

The ground is deep blue-slate rather than black: the hour before the bell, not a terminal.
One accent, brass — the opening bell, a lamp in the evening.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0E1318` | `#E7EAEE` | Page ground |
| `--surface` | `#161C23` | `#FFFFFF` | Cards |
| `--surface-2` | `#1C232B` | `#F2F4F7` | Raised, hover, footers |
| `--line` | `#28313A` | `#D6DBE2` | Borders |
| `--ink` | `#E8EDF2` | `#161B21` | Primary text |
| `--ink-2` | `#98A5B2` | `#56606B` | Secondary text |
| `--ink-3` | `#68747F` | `#7C8792` | Labels, axes |
| `--brass` | `#D4A254` | `#8A6216` | **The only accent** |
| `--gain` | `#4FB286` | `#1C7A54` | P&L positive — semantic only |
| `--loss` | `#D8636B` | `#AE3542` | P&L negative — semantic only |

Player line colours: `--p1` brass (you), `--p2` blue, `--p3` violet, `--p4` dusty pink,
`--pai` neutral grey for MERIDIAN.

**Green and red are reserved exclusively for profit and loss.** They never appear as
decoration, never as a button, never as a status unrelated to money. The eye learns the
association in seconds and then reads the whole dashboard faster. This is why the accent had
to be something other than green.

### Type

Three roles, each mapping to something true about the content:

| Role | Stack | Where |
|---|---|---|
| **Prose** | `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, ui-serif, serif` | The brief, MERIDIAN's journal |
| **Data** | `ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace` | Every number, always with `tabular-nums` |
| **Chrome** | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Labels, buttons, table headers |

The serif/mono split is not decoration — the app genuinely has two halves, prose and
figures, and the typography says so. Section labels are uppercase, 10.5px, letterspaced
`.11em`.

System stacks are used rather than webfonts deliberately: the artifact CSP blocks font CDNs,
and a silent fallback would be worse than a well-chosen system face.

### Layout

Sticky header carrying the countdown. Full-width hero chart. Below it a two-column split at
≥940px — main column and a narrower rail — collapsing to a single column on mobile.

**Phone-first.** The real usage is someone reading the brief in bed and tapping two orders.
Desktop is the secondary case, not the other way round.

## 3. The hero

One chart: five equity curves since inception, your line in brass and thicker, the others
dimmed. It is the first thing on screen at every breakpoint, and every other screen is a
detail view of something visible in it.

Two decisions carry the game's mechanics into the visualisation itself:

**The bell line.** Every curve stops at a dashed brass vertical rule, and the region beyond
it is hatched — the unwritten day. The chart states the core rule before you read a word:
nothing is settled until the next open. The header countdown ticks toward that same moment.

**MERIDIAN is drawn, not labelled.** The AI's curve is dashed and neutral grey — colourless,
the machine among the coloured humans. You can tell which player is not human from form
alone, before reaching the legend.

Range toggles (1M / 3M / All) recompute from the same series. The chart re-renders at exact
pixel dimensions on resize rather than scaling a fixed viewBox, so strokes stay crisp and
labels stay legible on a phone.

## 4. Screens and components

### Stat strip

Portfolio value large, then **30-day return**, then all-time smaller, then the weekend move.
The ordering is the scoring policy made visible: the rolling number leads because the game
is perpetual ([game-design.md §5](game-design.md#5-scoring)).

### The brief

Serif, generous line height, capped near 64 characters. Below it the **"Go and check"**
strip — contextual links to exactly what the brief just discussed — then reactions, then
the comment thread.

The thread is not a nice-to-have. For a five-person family league this is a group chat with
a P&L attached, and the social layer will do more for engagement than any feature on the
trading side.

### MERIDIAN's card

Shows both states of the same component at once, which is what makes the mechanic legible:

- **Sealed** — a dashed-outline panel with a lock and a live countdown: tomorrow's orders
  are in, the reasoning unseals at the bell.
- **Published** — yesterday's rationale in serif, with reactions and replies already
  arguing with it.

### Positions table

Symbol and name, last price, change, quantity, value, weight, P&L. Numbers in mono with
`tabular-nums` so columns align. The table scrolls inside its own container; the page body
never scrolls sideways.

Two pieces of state encoded in form rather than words:

- **The weekend split.** Equity rows show the last session's change greyed with a small
  `Fri` tag; crypto rows show live marks with a pulsing dot. Your money moves all weekend
  and you cannot act on it — the table says so at a glance.
- **The position cap.** Every weight bar carries a brass tick at 25%. The cap is *shown*,
  not merely enforced, so players can see how close they are before an order is rejected.

Every ticker is a link out to research for that instrument.

### Queued orders

The component the fill model makes necessary. A player queues a trade and nothing happens
for hours — if the interface does not explain *when* and *at what unknown price*, it reads
as broken.

Pending rows get a dashed brass treatment, a `Sealed` chip, a fill price rendered as
**"at open"** rather than a number, and a countdown in the section header. Dashed rather
than solid throughout: provisional, not yet real.

### Order ticket

Buy/sell, symbol, quantity, estimated value at the last close, and **weight after fill** —
so the cap is visible before you commit rather than as a rejection afterwards.

The notice under it does the important work:

> **Fills at Monday's open.** You won't know your price until the bell, and nobody sees
> this order until it executes.

Both halves of the game's fairness model, stated where the decision is made.

### Leaderboard

30-day return large, all-time small beneath. A brass crown marks the monthly champion. The
AI carries an `AI` chip; your own row is tinted.

### Market clock

Equities open/closed with reason, crypto always trading with a note that it settles on the
equity clock, and the countdown to next settlement. This card explains the entire clock in
three rows, which matters for players who have never traded before.

### Research desk

Ten free sources grouped by task rather than brand — *Start here*, *Company research*,
*Crypto*, *The wider picture*. All free, none requiring an account. That was a hard filter:
a research list a fourteen-year-old cannot open is not a research list.

The footer states: **"MERIDIAN reads the same list."** This is the fairness guarantee made
visible, and it makes the source list a spec constraint on the AI implementation
([ai-player.md](ai-player.md#rule-3--a-fixed-published-source-list)).

Research appears in three places by design: contextual links under the brief for the moment
curiosity is created, ticker links in the positions table, and the standing list in the rail.

## 5. Research sources

| Group | Source | Why |
|---|---|---|
| Start here | [Investor.gov](https://www.investor.gov/) | The SEC's own plain-English basics |
| Start here | [StockAnalysis](https://stockanalysis.com/) | Every number on one clean page, no account |
| Company | [SEC EDGAR](https://www.sec.gov/edgar/search/) | The filings themselves |
| Company | [Finviz](https://finviz.com/) | Screener and one-glance snapshots |
| Company | [Yahoo Finance](https://finance.yahoo.com/) | Quotes, headlines, earnings calendar |
| Crypto | [CoinGecko](https://www.coingecko.com/) | Prices, supply, real volume |
| Crypto | [Messari](https://messari.io/) | Written protocol research |
| Wider | [FRED](https://fred.stlouisfed.org/) | Actual economic data, free |
| Wider | [Trading Economics](https://tradingeconomics.com/calendar) | What is scheduled and expected |
| Wider | [Reuters Markets](https://www.reuters.com/markets/) | Wire coverage, facts before opinions |

## 6. Theming and accessibility

Both themes are fully built. Tokens are defined dark-first on bare `:root`; light is
redefined under `@media (prefers-color-scheme: light)` guarded as
`:root:not([data-theme="dark"])`, and again under `:root[data-theme="light"]` so an explicit
toggle wins in both directions. No colour is ever declared only inside a media or
`[data-theme]` block.

- Visible focus rings on every interactive element.
- All animation respects `prefers-reduced-motion`.
- The chart carries a descriptive `aria-label` summarising the standings.
- Wide content scrolls inside its own container.

## 7. Still to design

- **The empty state.** What a player sees on day one: $100,000 in cash, no positions, no
  equity curve, no history. Arguably the most important screen in the application, since it
  decides whether anyone plays a second day. Nothing exists for it yet.
- **Invite and onboarding.** Magic-link sign-in, first-run explanation of the clock.
- **Order rejected.** How a player learns at the bell that their buy failed, and why.
- **Activity feed.** Fills, dividends, splits, someone overtaking someone else.
- **Player profile.** Trade history, a single player's curve, their record against MERIDIAN.
