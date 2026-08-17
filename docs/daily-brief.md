# The daily brief

One brief per trading day, published after the close, identical for every player.

It is the game's metronome. The order window opens when the brief lands and closes at the
bell, so the brief is not a nice-to-have around the edges of the game — it is the thing
that starts each round.

---

## 1. Timing

Published at **≈5:30 pm ET**, after the close, on every trading day.

Two reasons for the evening rather than the morning:

- **Fairness.** A brief published at 8am and orders filling at 9:30am the same day would
  advantage whoever happens to be free at breakfast. Publishing after the close gives every
  player the same sixteen hours with the same information.
- **It fits family life.** People read it in the evening or over breakfast, at their own
  pace, and place orders whenever suits.

On a Friday the brief covers the week and looks ahead to Monday. There is no brief on
weekends or market holidays, but the dashboard still shows live crypto marks throughout —
see [game-design.md §3](game-design.md#3-the-daily-clock).

## 2. What it contains

Three movements, roughly 250–350 words in total. Short enough to read over a coffee, which
is the actual constraint.

1. **What happened.** The session just closed. What moved, and whether it mattered.
2. **What happened while the market was shut.** Crypto, overnight news, anything that
   opened a gap. This section is where the weekend crypto drama gets narrated.
3. **What is ahead.** Earnings dates, economic releases, Fed events on the near calendar.

Plus **"Go and check"** — three or four links to primary sources for the specific things
the brief just mentioned. Not a generic bookmark list; links to *this* company's numbers,
*that* CPI series, the Fed's own calendar. The Research desk in the rail holds the standing
list; these are contextual, placed at the moment curiosity is created.

### Editorial rules

- **Reports, does not advise.** No recommendations, no price targets, no "consider buying".
- **Names its sources.** If a number is quoted, where it came from is one click away.
- **No hedging filler.** "Markets could go up or down" is worse than saying nothing.
- **Plain language.** At least one player is learning what a P/E ratio is; jargon that
  isn't explained is jargon that excludes.
- **Admits a quiet day.** "Nothing much happened and here is what to watch instead" is a
  legitimate brief and better than manufacturing drama.

The tone target, from the mockup:

> **The week that was.** Equities finished roughly where they started, which rather
> understates how they got there. A soft inflation print on Wednesday lifted the index
> almost a full percent before Friday handed most of it back on thin August volume. Nothing
> broke; nothing resolved.

## 3. The brief is identical for every player

**No personalisation of market content.** Everyone sees the same words.

The temptation is obvious — a brief tailored to your holdings would be more engaging. It
would also hand different players different information, which breaks the fairness that the
shared fill price and the sealed orders exist to protect. A player holding Nvidia should not
get a heads-up that a player holding Costco does not.

What *is* allowed alongside the brief, because it contains no information the player did
not already have:

- Your own positions' moves since the last session.
- Your own pending orders and the countdown to their fill.
- The league standings, which are public anyway.

The rule: **anything derived purely from your own account is fine; anything derived from
the news is shared.**

## 4. Delivery

In-app always. **Email is what makes the game survive.**

A brief that only exists inside the app is a brief that only gets read when someone
remembers to open the app, and for a family league that is the difference between playing
and drifting away. A short daily email with the headline, the first paragraph, and a link
into the dashboard is the single highest-leverage engagement feature in the whole design.

Resend's free tier covers five daily emails at no cost and calls cleanly from a Supabase
Edge Function. Alternatives — a WhatsApp or Telegram group post — would work as well or
better socially; email is simply the least infrastructure.

Every player should be able to turn it off without leaving the league.

## 5. Generation

Runs in the evening Edge Function, before MERIDIAN's turn — the AI reads the published
brief, so the brief must exist first.

```
1. Gather      retrieve current market news from the published source list
2. Write       three movements, plus three or four contextual links
3. Store       insert into briefs for the next session
4. Notify      send email to every player who has not opted out
5. Hand off    trigger MERIDIAN's turn
```

The brief is the cheaper of the two daily LLM calls and the more tolerant of a smaller
model — it is closer to summarisation than judgement. This is the first lever to pull if
the monthly bill needs reducing ([architecture.md §6](architecture.md#6-costs)).

### If generation fails

Publish nothing rather than publishing something wrong. A missing brief is visible and
recoverable; a brief containing invented numbers damages trust in every future brief.

The order window should open regardless — it is keyed to the close, not to the brief's
existence — so a failed brief costs the family its reading material for one evening but
does not stop the game. The dashboard should say plainly that the brief failed, not show
an empty card.
