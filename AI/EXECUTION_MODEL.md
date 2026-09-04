# Execution model

This file documents the current engine pipeline. Most of it is implementation
detail and should be mirrored in a local simulator, not exploited by a bot.

## 1. From source text to an active bot

1. The server accepts JavaScript or TypeScript source text.
2. `Bun.Transpiler({ loader: "ts" }).transformSync(code)` produces JavaScript.
3. The original source and transpiled source are stored together.
4. `codeHash` is the SHA-256 hash of the transpiled source.
5. Bot creation currently checks that transpilation succeeds, but does not run
   a complete sandboxed test battle.

Implication: successful creation does not prove that a default export exists,
that it is callable, or that all possible calls return valid tuples.

There is currently no code-update route in the UI. Each created bot has one
code entry; a materially new version is normally a new bot.

## 2. Battle scheduling

The engine is a single continuous loop:

1. Query two active bots.
2. Run and persist one battle.
3. Sleep for `BATTLE_INTERVAL_MS`.
4. Repeat.

The source default is 10,000 ms, but production can override it. The interval
is a delay after battle processing, not a strict start-to-start scheduler. When
fewer than two active bots exist, the iteration is skipped and the engine
sleeps again.

## 3. Sandbox construction

At battle start, the engine creates one separate QuickJS context per bot. The
two contexts do not share globals, heap, or module handles.

For each context, the engine:

1. sets a 1 MB maximum stack;
2. sets a 1 MB maximum heap;
3. evaluates the transpiled code as an ES module;
4. executes pending module jobs;
5. reads the module's `default` property as the bot function.

The same context and function handle are reused across every round of that
battle, then disposed at the end.

### Global-state caveat

The guide says global state should not be relied upon. The current persistent
per-battle context means a module global may happen to survive between rounds,
but it resets at the next battle and is outside the stable contract. Always use
returned `memory`. This also keeps a bot compatible with a future engine that
recreates the context per call.

## 4. Per-round call sequence

Host states begin as:

```js
[
  { history: [], memory: null },
  { history: [], memory: null },
]
```

For each round, the engine does the following:

```text
initialize moves as [C, C]
initialize memories as [null, null]

call bot 0 with its pre-round state
validate/dump bot 0's output

call bot 1 with its pre-round state
validate/dump bot 1's output

if either call failed: stop the battle
otherwise:
  store both returned memories
  append the simultaneous move pair to both histories
  append the move pair to persisted battle history
```

The host calls bot 0 and bot 1 sequentially, but they use different sandboxes
and both receive states from before the round. Bot 1 does not receive bot 0's
current move. The game is semantically simultaneous.

## 5. Boundary serialization

Before each call, the host creates the state value inside QuickJS by evaluating:

```js
`(${JSON.stringify(state)})`
```

After the function call, the engine dumps the returned QuickJS value into the
host and validates it.

Consequences:

- Incoming state is a value copy, not a live host object.
- Mutations to `history` persist only if separately encoded in returned memory.
- Returned memory must survive a dump followed by `JSON.stringify` next round.
- Non-finite numbers can change under JSON serialization.
- Large memory is copied every move and consumes time and heap.
- Circular memory can fail at the next boundary even if the original return
  appeared valid.

The 10 ms interrupt deadline is armed before the state is evaluated in the
sandbox, so state construction and the bot call share the move deadline.

## 6. Timeout and error mapping

The engine maps common QuickJS failures to these messages:

- `maximum execution time of 10 ms exceeded`
- `maximum memory limit of 1 MB exceeded`
- `maximum stack size of 1 MB exceeded`
- `must return a [move, memory] tuple, instead got ...`
- `returned invalid move ...`
- other exceptions become `bot error: ...`

If either bot fails in a round:

- that round is not appended to history;
- the battle loop stops immediately after both attempted calls for that round;
- prior successful rounds remain visible in the replay;
- scoring uses the forfeit result instead of the prior-round averages.

Forfeit scoring under the current matrix:

| Bot A error | Bot B error | Stored score |
|---|---|---|
| no | no | mean payoff from completed rounds |
| yes | no | `[0, 3]` |
| no | yes | `[3, 0]` |
| yes | yes | `[0, 0]` |

Thus a late crash discards the crashing bot's otherwise good performance.
Reliability has higher priority than small strategic gains.

## 7. Successful battle scoring

For every completed move pair `[a, b]`, the database looks up:

```text
scoreA = payoff[a][b]
scoreB = payoff[b][a]
```

It then stores each bot's arithmetic mean across that battle, not the point
sum. Both bots played the same number of rounds, so battle winner comparison is
equivalent under a sum or mean; leaderboard aggregation is not.

## 8. Performance engineering guidance

- Keep the decision rule synchronous and bounded.
- Prefer a small finite-state machine or counters in memory.
- Avoid copying the complete history into memory; history is already supplied.
- Avoid repeated full-history scans when an incremental count suffices.
- Avoid recursion and deep/nested data structures.
- Do not allocate large lookup tables per move. Put small constants at module
  scope, but keep strategic state in memory.
- Test rounds well beyond 100; do not assume exactly 100 calls.
- Treat every branch as capable of receiving `memory === null` during testing.
- Ensure every reachable branch returns a valid tuple.

## 9. Local simulator fidelity checklist

A high-fidelity test harness should reproduce:

- hidden random round count with the current formula;
- fresh `history: []` and `memory: null` each battle;
- two pre-round states and simultaneous history updates;
- JSON round-tripping of state/memory;
- exact two-element tuple validation;
- exact uppercase move validation;
- per-battle mean scoring;
- complete-battle forfeit scoring;
- ideally the same QuickJS runtime and its heap/stack/time limits.

Running strategies directly in Node is useful for logic tests, but it does not
validate QuickJS compatibility, serialization, memory consumption, or the
10 ms limit.
