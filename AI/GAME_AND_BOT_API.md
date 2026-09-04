# Game and bot API

## 1. Per-round game

Each round is simultaneous. Both bots choose one move without seeing the other
bot's move for that round:

- `"C"`: cooperate
- `"D"`: defect

The current symmetric payoff matrix is:

| Your move | Opponent move | Your points | Opponent points |
|---|---|---:|---:|
| C | C | 2 | 2 |
| C | D | 0 | 3 |
| D | C | 3 | 0 |
| D | D | 1 | 1 |

The values satisfy the Prisoner's Dilemma relationships:

```text
T = 3 > R = 2 > P = 1 > S = 0
2R = 4 > T + S = 3
```

There is no move noise in the current runner. A valid returned move is appended
to history unchanged. The payoff matrix is stored as tournament data and may be
replaced later. Agents must not hard-code assumptions that are unnecessary for
the strategy.

## 2. Battle length

The implementation samples the number of rounds once, before round 0:

```js
const rounds = Math.floor(100 - 20 * Math.log(1 - Math.random()))
```

Equivalently:

```text
N = 100 + floor(X), where X ~ Exponential(mean = 20)
```

Consequences:

- `N >= 100`.
- `E[N] = 100 + 1 / (exp(1/20) - 1) ~= 119.504`.
- Median length is roughly 113 rounds.
- The 95th percentile is roughly 159 rounds.
- The distribution has no finite upper bound.
- The bot is not given `N`; there is no reliable final-round indicator.

The source comment and public contract guarantee only “at least 100 rounds.”
Treat the exact distribution as an implementation detail and test sensitivity
to it.

## 3. Canonical function contract

```ts
type Move = "C" | "D"

type Match = {
  you: Move
  opponent: Move
}

type Memory = unknown

type State = {
  history: Match[]
  memory: Memory
}

type Bot = (state: State) => [Move, Memory]
```

A submission must expose the function as the module's default export:

```js
export default function bot({ history, memory }) {
  if (history.length === 0) return ["C", { seenDefections: 0 }]

  const last = history[history.length - 1]
  const nextMemory = {
    seenDefections:
      (memory?.seenDefections ?? 0) +
      (last.opponent === "D" ? 1 : 0),
  }

  return [last.opponent, nextMemory]
}
```

Function naming is irrelevant. `export default` and the return shape are not.

## 4. State semantics

### Initial call

```js
state.history === []
state.memory === null
```

### History

After each successful round, one element is appended from that bot's
perspective:

```js
{
  you: "C" | "D",
  opponent: "C" | "D"
}
```

For the same physical round `[moveA, moveB]`:

```js
botA.history.push({ you: moveA, opponent: moveB })
botB.history.push({ you: moveB, opponent: moveA })
```

Therefore:

- `history.length` is the zero-based current round number.
- `history.at(-1)` is the most recently completed round.
- Current-round opponent behavior is never present yet.
- Mutating the supplied history is not a supported persistence mechanism.

### Memory

The second return element becomes the bot's `memory` on the next call. Memory
is reset to `null` for every new battle.

Although the public type is `unknown`, the engine crosses the host/sandbox
boundary by dumping values and later injecting state through JSON text. Use
JSON-safe values only:

- safe: `null`, booleans, finite numbers, strings, arrays, plain objects
- risky/invalid: circular references, functions, symbols, `BigInt`, class
  instances, host handles, very deep structures, and huge values

Keep memory small. The entire module, incoming state, temporary allocations,
and returned memory share a 1 MB sandbox heap.

## 5. Information not provided to a bot

The bot does not receive:

- opponent ID, name, owner, or source
- its own bot ID or name
- current or previous leaderboard position
- current total points as a separate field
- the payoff matrix as a parameter
- expected or actual final round
- battle ID or timestamp
- any state from previous battles

Points can be reconstructed from history if needed, using the current known
matrix. Do not spend time reconstructing them unless the strategy uses them.

## 6. Return-value validation

The return must be a synchronous array of exactly two elements:

```js
[move, memory]
```

The move must be exactly `"C"` or `"D"`.

Invalid examples:

```js
return "C"
return ["C"]
return ["C", memory, metadata]
return ["cooperate", memory]
return ["c", memory]
return Promise.resolve(["C", memory])
```

An `async` function returns a Promise, not the required tuple, and should be
treated as invalid.

## 7. Resource contract

Current limits:

| Resource | Limit |
|---|---:|
| Execution | 10 ms per move |
| QuickJS heap | 1 MB per bot sandbox |
| QuickJS stack | 1 MB per bot sandbox |
| Submitted source | 50,000 characters |
| Runtime files/modules | One self-contained module |

Unavailable or unsupported facilities include:

- `fetch` and networking
- Node/Bun APIs such as `process` and `fs`
- runtime package imports
- external files
- `eval`/dynamic code generation according to the public contract

TypeScript is transpiled to JavaScript, not bundled. A normal import that still
exists at runtime has no module resolver and must not be used. Define required
types and helpers in the submitted file.

## 8. Minimal robust baseline

```js
export default function bot({ history, memory }) {
  const m = memory ?? { opponentDefections: 0 }
  const last = history[history.length - 1]

  if (!last) return ["C", m]

  const next = {
    opponentDefections:
      m.opponentDefections + (last.opponent === "D" ? 1 : 0),
  }

  // Tit-for-tat behavior; replace this decision rule during research.
  return [last.opponent, next]
}
```

This demonstrates the correct boundary behavior. It is a baseline, not a claim
of optimality.
