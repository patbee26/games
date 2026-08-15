# Data model

Postgres on Supabase. Schema is illustrative rather than final — it is written out so that
the shape of the game, and particularly the security boundary, is concrete before any code
exists.

Two conventions throughout:

- **Money is stored in integer cents.** Never floats. `118624.37` is `11862437`.
- **Quantities are `numeric(20,8)`.** Crypto needs eight decimal places; equities use whole
  numbers in the same column.

---

## Tables

### `players`

```sql
create table players (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  display_name  text not null,
  initials      text not null,
  colour        text not null,              -- hex, drives their equity curve
  is_ai         boolean not null default false,
  cash_cents    bigint not null default 10000000,   -- $100,000.00
  joined_on     date not null default current_date,
  created_at    timestamptz not null default now(),
  constraint cash_never_negative check (cash_cents >= 0)
);
```

`auth_user_id` is nullable because MERIDIAN has no auth user. The `cash_never_negative`
constraint is the database-level guarantee that no long-only account can go short of cash;
it should never fire, and if it does, settlement has a bug worth finding immediately.

### `instruments`

```sql
create type instrument_kind as enum ('equity', 'etf', 'crypto');

create table instruments (
  id           uuid primary key default gen_random_uuid(),
  symbol       text not null unique,
  name         text not null,
  kind         instrument_kind not null,
  exchange     text,                        -- null for crypto
  provider_id  text,                        -- vendor's own identifier
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
```

### `trading_days`

The calendar that drives every scheduled job. Populated ahead of time from the exchange
calendar including holidays and half days. The nullable timestamps are the idempotency
guards described in [architecture.md](architecture.md#scheduling).

```sql
create table trading_days (
  session_date  date primary key,
  open_at       timestamptz not null,   -- absolute; DST already resolved
  close_at      timestamptz not null,
  brief_due_at  timestamptz not null,
  settled_at    timestamptz,            -- null until settlement completes
  closed_at     timestamptz,            -- null until close marks captured
  is_half_day   boolean not null default false
);
```

Storing absolute timestamps rather than local times is what makes the scheduler immune to
daylight saving. The conversion happens once, when the calendar is seeded.

### `orders`

The queue and its outcome. This table carries the sealed-order security boundary.

```sql
create type order_side   as enum ('buy', 'sell');
create type order_status as enum ('queued', 'filled', 'cancelled', 'rejected');

create table orders (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references players(id) on delete cascade,
  instrument_id  uuid not null references instruments(id),
  side           order_side not null,
  quantity       numeric(20,8) not null check (quantity > 0),
  status         order_status not null default 'queued',
  session_date   date not null references trading_days(session_date),
  queued_at      timestamptz not null default now(),
  fill_price_cents bigint,
  filled_at      timestamptz,
  reject_reason  text,
  constraint filled_has_price check (
    (status = 'filled') = (fill_price_cents is not null)
  )
);

create index on orders (session_date, status);
create index on orders (player_id, queued_at desc);
```

### `positions`

Current holdings. Rebuilt by the settlement job; never written by a client.

```sql
create table positions (
  player_id      uuid not null references players(id) on delete cascade,
  instrument_id  uuid not null references instruments(id),
  quantity       numeric(20,8) not null check (quantity >= 0),
  cost_basis_cents bigint not null,
  updated_at     timestamptz not null default now(),
  primary key (player_id, instrument_id)
);
```

### `cash_ledger`

Every cash movement, append-only. The audit trail that makes it possible to answer "why is
my balance this number" — and to reconstruct a corrupted balance.

```sql
create type cash_reason as enum
  ('opening_balance', 'buy', 'sell', 'dividend', 'adjustment');

create table cash_ledger (
  id            bigserial primary key,
  player_id     uuid not null references players(id) on delete cascade,
  amount_cents  bigint not null,          -- signed; negative is money leaving
  balance_after_cents bigint not null,
  reason        cash_reason not null,
  order_id      uuid references orders(id),
  note          text,
  occurred_at   timestamptz not null default now()
);
```

### `daily_marks`

Price history. One row per instrument per session.

```sql
create table daily_marks (
  instrument_id uuid not null references instruments(id),
  session_date  date not null references trading_days(session_date),
  open_cents    bigint,
  close_cents   bigint,
  primary key (instrument_id, session_date)
);
```

Crypto is marked at the same session boundaries as equities, per
[game-design.md §3](game-design.md#3-the-daily-clock). Live crypto quotes shown on the
dashboard between settlements are fetched on demand and are not persisted here.

### `portfolio_snapshots`

One row per player per session. Powers the equity curves and every return calculation.

```sql
create table portfolio_snapshots (
  player_id       uuid not null references players(id) on delete cascade,
  session_date    date not null references trading_days(session_date),
  cash_cents      bigint not null,
  positions_cents bigint not null,
  total_cents     bigint not null,
  primary key (player_id, session_date)
);
```

Returns are derived from this table, never stored. The 30-day figure is
`total_cents` today against `total_cents` thirty sessions ago; all-time is against the
player's first snapshot. Deriving rather than storing means a corrected price
retroactively fixes every figure that depends on it.

### `briefs` and `ai_journal`

```sql
create table briefs (
  session_date  date primary key references trading_days(session_date),
  headline      text not null,
  body_md       text not null,
  links         jsonb not null default '[]',   -- the "go and check" chips
  published_at  timestamptz not null default now()
);

create table ai_journal (
  session_date  date primary key references trading_days(session_date),
  rationale_md  text not null,
  model         text not null,
  created_at    timestamptz not null default now(),
  published_at  timestamptz not null    -- always the session's open_at
);
```

`ai_journal.published_at` is set to the session's open when the row is written the previous
evening. The row therefore exists, sealed, for sixteen hours before anyone can read it.
See the RLS policy below.

### `reactions` and `comments`

The social layer. For a five-person family league this is not decoration — it is the thing
that keeps the game alive past week three.

```sql
create type target_kind as enum ('brief', 'ai_journal');

create table reactions (
  id           bigserial primary key,
  target_type  target_kind not null,
  target_date  date not null,
  player_id    uuid not null references players(id) on delete cascade,
  emoji        text not null,
  created_at   timestamptz not null default now(),
  unique (target_type, target_date, player_id, emoji)
);

create table comments (
  id           bigserial primary key,
  target_type  target_kind not null,
  target_date  date not null,
  player_id    uuid not null references players(id) on delete cascade,
  body         text not null check (length(body) between 1 and 2000),
  created_at   timestamptz not null default now()
);
```

### `invite_allowlist`

```sql
create table invite_allowlist (
  email       text primary key,
  invited_at  timestamptz not null default now()
);
```

Magic-link sign-in is refused for any address not present here. Five rows, one table, no
invite-token machinery needed.

---

## Row Level Security

**Every table has RLS enabled.** These policies are the game's integrity, not a hardening
pass to be done later — the sealed-order rule in particular is a game mechanic that happens
to be implemented in SQL.

### The sealed-order policy

```sql
alter table orders enable row level security;

-- You can always see your own orders, at any status.
create policy orders_own_read on orders
  for select using (
    player_id in (select id from players where auth_user_id = auth.uid())
  );

-- You can see everyone else's orders only once they have executed.
create policy orders_others_read_filled on orders
  for select using (status = 'filled');

-- You may queue orders only for yourself, and only as 'queued'.
create policy orders_insert_own on orders
  for insert with check (
    player_id in (select id from players where auth_user_id = auth.uid())
    and status = 'queued'
    and fill_price_cents is null
  );

-- You may cancel your own order while it is still queued. Nothing else.
create policy orders_cancel_own on orders
  for update using (
    player_id in (select id from players where auth_user_id = auth.uid())
    and status = 'queued'
  );
```

Because MERIDIAN has no `auth_user_id`, no human session can ever match the first policy
against its rows — the AI's queued orders are invisible to everyone until filled, which is
exactly the intended symmetry.

Note that the `orders_cancel_own` update policy needs a `with check` clause in the real
implementation to prevent a player amending `status` or `fill_price_cents` directly. The
safest form restricts updates to setting `status = 'cancelled'` and nothing else.

### The sealed-journal policy

```sql
alter table ai_journal enable row level security;

create policy journal_read_published on ai_journal
  for select using (published_at <= now());
```

One line, and it is the entire "unseals at the bell" mechanic.

### Ledger tables are read-only to clients

```sql
alter table positions            enable row level security;
alter table cash_ledger          enable row level security;
alter table portfolio_snapshots  enable row level security;

-- Everyone can read everyone's holdings. This is a league; the leaderboard is the point.
create policy positions_read  on positions            for select using (true);
create policy snapshots_read  on portfolio_snapshots  for select using (true);

-- Your own cash history is yours alone.
create policy ledger_read_own on cash_ledger
  for select using (
    player_id in (select id from players where auth_user_id = auth.uid())
  );
```

No insert, update, or delete policies are defined on these tables at all. With RLS enabled
and no write policy, **every client write fails** — including from a compromised anon key.
Only Edge Functions holding the service-role key, which bypasses RLS, can write them.

This is the single most important line in the schema. If a player can write their own
`cash_cents`, there is no game.

### Reference data

```sql
create policy instruments_read   on instruments   for select using (true);
create policy trading_days_read  on trading_days  for select using (true);
create policy briefs_read        on briefs        for select using (true);
create policy players_read       on players       for select using (true);
```

`players` being world-readable is deliberate — the leaderboard needs names, colours, and
cash balances. It also means no private data may ever be added to that table; an email
address or an auth token belongs elsewhere.

---

## Settlement, as a transaction

The order of operations matters. All of it inside one transaction, keyed on a
`trading_days` row so it cannot run twice.

1. Lock the `trading_days` row for the session; abort if `settled_at` is already set.
2. Fetch opening prices for every instrument with a queued order, plus every instrument
   currently held; write them to `daily_marks`.
3. Apply any corporate actions effective today — splits before fills, so quantities and
   cost bases are correct before anything trades.
4. Process **sells first, then buys.** This is not arbitrary: selling first releases cash
   that a same-day buy may depend on, which is what a player intends when they rotate out
   of one holding into another on the same morning.
5. For each order in turn: validate cash and holdings, fill at the opening price, write the
   `cash_ledger` row, update `positions`, stamp the order `filled`. Anything that fails
   validation is stamped `rejected` with a reason rather than skipped silently.
6. Publish MERIDIAN's journal row for the session — it is already written and sealed; the
   policy releases it automatically once `published_at` passes.
7. Recompute `portfolio_snapshots` for all five players.
8. Stamp `settled_at`.

Rejections are part of normal operation, not errors. A player who queues a buy they cannot
afford should be told at the bell, in the interface, with the reason.
