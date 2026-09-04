# Leaderboard and matchmaking

## 1. Primary objective

The current ladder is not Elo and is not ordered by win rate. A bot is ranked
by `meanScore`, where one score is its average points per round in one battle.

For battle `j` with `N_j` rounds:

```text
battleScore_j = (sum of the bot's points in battle j) / N_j
```

For the current rolling window `W`:

```text
meanScore = (sum of battleScore_j for j in W) / |W|
```

The optimization target is therefore expected personal points per round against
the selected opponent population, subject to the rolling-window mechanics.

## 2. Rolling current-matrix window

Each bot record maintains `curScores`, a chronological array containing at
most the latest 200 scores earned using the current payoff matrix.

On each new battle using the current matrix:

1. append the new per-battle score;
2. retain only the last 200 values;
3. recompute `meanScore` as their arithmetic mean.

This has several important effects:

- A battle is one equally weighted observation regardless of whether it lasts
  100 or 180 rounds.
- A bot's score can adapt to a changing population after older battles leave
  the 200-battle window.
- A new strategy submitted as a new bot starts with a clean window.
- A crash contributes a full 0-valued battle observation.
- `meanScore` is 0 before a bot has a current-matrix score.

When a new matrix record is created, every bot's `curScores` is cleared and its
current `meanScore` returns to 0. Lifetime counters are not reset.

## 3. Public leaderboard inclusion and order

The leaderboard query returns at most 20 bots satisfying both:

```text
active == "active"
lifetime battles >= 10
```

Rows are sorted by:

```text
meanScore descending
name ascending
```

Consequences:

- A new bot is absent until its tenth completed/persisted battle.
- An inactive or archived bot is absent even if it has the best score.
- Tied scores use alphabetical bot name order.
- Ranks below the top 20 are not included by the public leaderboard query.

## 4. Secondary statistics

The bot record separately caches lifetime:

- `wins`
- `losses`
- `battles`

A win means the bot's per-battle score is strictly greater than its opponent's.
A loss is strictly lower. Ties increment `battles` but neither wins nor losses.

These counters:

- cover all payoff matrices;
- survive activation changes;
- are shown in the UI;
- do not determine leaderboard order;
- do influence matchmaking through lifetime battle count.

Win rate in the UI is `wins / battles`, so ties remain in the denominator.

## 5. Why win rate is a misleading target

Suppose a strategy has two possible outcomes:

- strategy A ties cooperative bots at `2.0 : 2.0`;
- strategy B narrowly wins many defensive matches at `1.01 : 0.99`.

Strategy A has the much better ladder contribution even though it records no
wins. Optimize the left-hand score, not the word “win.”

Tit-for-tat illustrates this clearly: it generally cannot defect more often
than its opponent, so it rarely wins, yet it can maintain a strong `2.0`
against cooperative strategies.

## 6. Matchmaking pool

Only bots with `active == "active"` enter selection. At least two are required.
There is a maximum of three active bots per owner, but the engine's pair query
does not exclude two bots with the same owner from meeting.

The selector chooses two distinct bot IDs. It does not use score, rank, wins,
losses, owner, strategy, or recency directly.

## 7. Exact selection weights

For a bot with `b` lifetime battles, current code computes:

```text
w(b) = max(1 / (b + 1), 0.05)
```

Examples:

| Lifetime battles | Weight |
|---:|---:|
| 0 | 1.00 |
| 1 | 0.50 |
| 4 | 0.20 |
| 9 | 0.10 |
| 19 | 0.05 |
| 100 | 0.05 |

The SQL uses weighted random sampling via an exponential-race/inverse-transform
construction:

```text
key = random()^(1 / weight)
select the largest key
```

This gives selection probability proportional to weight. It selects the first
bot, removes that ID, generates fresh keys for remaining bots, and selects the
second.

The source comment mentions a `0.02` floor in one sentence, but the executable
expression uses `0.05`. Treat `0.05` as authoritative for the current version.

## 8. Matchmaking consequences

- New bots receive battles much faster than established bots.
- A new bot's first ten results can arrive quickly and are statistically noisy.
- Once a bot reaches 19 lifetime battles, additional battles no longer reduce
  its selection weight below 0.05.
- Selection eventually gives established bots a roughly equal baseline weight.
- Activating a fresh experimental bot changes the opponent exposure of every
  active bot slightly.
- Owning three active bots does not directly multiply one bot's score, and the
  three may be selected against one another.

The actual opponent distribution for a target bot is not simply uniform across
active bots. It depends on every candidate's lifetime battle count and on
weighted sampling without replacement.

## 9. Public information and observability

Public bot pages expose:

- bot name, description, owner, creation date, and status;
- current mean score and score history;
- lifetime wins, losses, and battles;
- recent battles;
- the complete submitted source text.

Public battle pages expose:

- both bot IDs/names;
- per-battle mean scores;
- error messages;
- every completed round's pair of moves.

The leaderboard also streams recent battles. Public source enables population
modeling and exact opponent simulations, but also means any recognizable
handshake or special-case behavior can be copied or countered.

Never place secrets or private identifiers in bot source or memory constants.

## 10. Metrics agents should report

Every strategy experiment should report at least:

1. mean personal points per round, overall;
2. mean per-battle score using equal battle weights;
3. per-opponent or per-archetype mean score;
4. 5th/50th/95th percentile battle scores;
5. crash/timeout/invalid-return rate;
6. head-to-head opponent score and score differential as secondary metrics;
7. sensitivity to opponent-mixture assumptions;
8. performance over 100, typical, and long-tail battle lengths.

Do not select a candidate solely from win rate or score differential.
