# MERIDIAN — the AI player

MERIDIAN is the fifth player. It is also the reason anyone will show this game to a friend.

The design principle throughout: **MERIDIAN must be beatable, and visibly fair.** An AI
that wins because it has better data is not a competitor, it is a house edge. Everything
below exists to make "I beat the robot" mean something.

---

## 1. What makes it a player rather than a feature

MERIDIAN plays under the identical constraints as everyone else:

- $100,000 starting cash, long-only, no margin.
- Subject to the same 25% position cap.
- Orders queued during the same window, sealed the same way, filled at the same open.
- Reads the same brief.
- Restricted to the same published research sources.
- No live data feed, no market access, no execution advantage of any kind.

It differs from the humans in exactly two ways, both deliberate:

1. It never forgets to place an order.
2. It publishes its reasoning every single morning.

## 2. The four rules that keep it fair

### Rule 1 — Same information, same clock

MERIDIAN's turn runs in the evening, after the brief is generated, in the same window the
family gets. It receives the brief text, its own portfolio, the league standings, and
whatever it retrieves from the published source list. Nothing else.

It does **not** receive: other players' positions in real time beyond what is publicly
visible in the game, anyone's queued orders, or any market data the humans cannot reach.

### Rule 2 — Live dates only. Never replay history.

This is the one that would silently destroy the game.

A model trained on historical data knows what happened on past dates. If the league were
ever backtested, seeded, or demoed against historical sessions, MERIDIAN would appear
supernaturally skilled while actually just remembering. The effect is total — it would win
every historical session and nobody would understand why.

**The game runs on live dates only.** No seeded history, no replayed weeks, no "let's test
it on last March." Test the settlement engine with synthetic prices
(see [build-plan.md](build-plan.md)) and never with real historical dates that the model
could recognise.

### Rule 3 — A fixed, published source list

MERIDIAN may read the sources listed in [interface.md](interface.md#research-desk) and
nothing else. That same list is shown to every player in the Research desk, with a line
stating plainly that the AI reads it too.

This turns a UI element into the fairness guarantee. It also means the source list is a
**specification constraint on the implementation**, not just a design flourish: the AI's
turn must be built against those sources, with no broader web crawl and no private feed.

### Rule 4 — Reasoning published, orders sealed

MERIDIAN writes its rationale at decision time, in the evening. The row is stored
immediately with `published_at` set to the next open, and an RLS policy keeps it unreadable
until then ([data-model.md](data-model.md#the-sealed-journal-policy)).

So at any given moment the family can see *that* MERIDIAN has decided, and a countdown to
when they will learn what it decided — but never the content in time to copy it.

## 3. The turn

Once per trading day, in the evening job, after the brief exists:

```
1. Assemble context
     the brief just published
     MERIDIAN's cash, positions, and current weights
     league standings (public information only)
     its own last few journal entries, for continuity of reasoning
     retrieved material from the published source list

2. Decide
     zero or more orders, each with side, symbol, quantity
     a written rationale

3. Validate before writing
     every order passes the same checks a human order would:
     cash sufficiency, 25% cap, tradable instrument, positive quantity
     invalid orders are dropped and the drop is logged

4. Write, sealed
     orders  → status 'queued', session_date = next session
     journal → published_at = next session's open_at
```

Step 3 is not optional. The AI's output is untrusted input like any other; it must not be
able to write an order a human could not.

## 4. Voice

MERIDIAN's journal is the entertainment. It should read like a fund manager writing a short
note to investors — specific, unhedged, willing to say "I don't know", and never
promotional. The tone target, from the mockup:

> I trimmed Nvidia from 26% of the book to 19%. Not on a view about the print — I don't
> have one worth acting on — but because a single name at a quarter of the portfolio turns
> the next four weeks into a referendum on one earnings call. I would rather be less right
> and less wrong. The proceeds sit in cash. I looked for somewhere to put them and found
> nothing I liked enough to own into a Fed week.

What makes this work: it explains the decision rather than the market, it admits the limits
of its own view, and it is short enough to read over coffee. It is also, usefully, wrong
often enough to argue with.

**Not advice.** The journal is a game character's reasoning. It should never be framed as
a recommendation to the family, and the interface should not invite copying it — though of
course players will, and that is part of the fun.

## 5. Strategy and personality

At launch, one AI player with a single consistent temperament — risk-aware, willing to hold
cash, unexcited by momentum. This makes it beatable in a rising market, which is the right
default for a family league.

**Later, if the game survives:** a slate of AI players rather than one. A momentum bot, a
value bot, and a contrarian bot are barely more implementation work than a single AI and
make the leaderboard considerably more interesting — the family is then competing in a
field rather than against a single opponent. Costs scale linearly with the number of AI
turns, so this is a budget decision as much as a design one.

## 6. Model choice and cost

The two daily calls are the game's only real running cost
([architecture.md §6](architecture.md#6-costs)).

- **The AI turn** is the more demanding task — it needs judgement, portfolio awareness, and
  a coherent written argument. Worth the better model.
- **The brief** is closer to summarisation and can run on something cheaper. This is the
  main lever if the monthly bill needs cutting.

Store the model identifier on every `ai_journal` row. When MERIDIAN's behaviour changes
because the model changed, it should be possible to see that from the data rather than
guess at it.

## 7. Failure handling

If the AI turn fails — API error, timeout, malformed output that fails validation:

- **Do not retry blindly into the settlement window.** A late order that fills at the same
  open as everyone else's is fine; an order written *after* settlement has begun is a
  correctness bug.
- If no valid decision exists by the bell, MERIDIAN **does nothing that day** and its
  journal records exactly that. A missed turn is a legitimate game event, not an error to
  paper over.
- Silent failure is the thing to avoid. If MERIDIAN quietly stops trading for a week and
  nobody notices, the game has lost its centrepiece.
