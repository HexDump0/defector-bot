# Defector Lab

A fast, deterministic local replica of Defector's tournament engine, written in
Rust and powered by [Boa](https://boajs.dev/). It loads the public bot snapshot,
transpiles TypeScript with Oxc, runs each battle in fresh isolated JavaScript
realms, and maintains the same leaderboard state as the official platform.

The optimization metric is **mean per-battle points per round**. This is not an
Elo simulator and win rate is only a secondary statistic.

## Rules reproduced

- payoff matrix: C/C `2:2`, C/D `0:3`, D/C `3:0`, D/D `1:1`;
- hidden length `floor(100 - 20 * ln(1 - random()))`;
- simultaneous moves with per-bot `{ history, memory }` state;
- fresh sandbox and `memory: null` for every battle;
- exact two-element tuple and uppercase move validation;
- whole-battle forfeit scoring (`0:3`, `3:0`, or `0:0`);
- matchmaking weight `max(1 / (lifetimeBattles + 1), 0.05)`;
- distinct weighted opponent selection;
- latest 200 current-matrix battle scores per bot;
- leaderboard eligibility at 10 lifetime battles, sorted by score then name.

Randomness is seeded for reproducible research. Every sandbox gets an
independent deterministic `Math.random()` stream.

## Build

```bash
cargo build --release
```

The first optimized build is substantial because Boa and the embedded
TypeScript frontend are compiled into one binary. Use the release binary for
experiments:

```bash
./target/release/defector-lab info
./target/release/defector-lab validate
./target/release/defector-lab battle goatbotv1.6 "Always Defect" --seed 7
./target/release/defector-lab evaluate bots/candidate.ts \
  --name candidate-v3 --repetitions 50 --seed 20260904
./target/release/defector-lab tournament --battles 10000 --seed 20260904 \
  --candidate bots/candidate.ts --candidate-name candidate-v3
./target/release/defector-lab benchmark --battles 1000 --seed 42
```

Add `--json` to any reporting command for machine-readable output. Use global
`--threads N` to control parallelism and global `--snapshot PATH` to load a
different scrape.

## Commands

- `info`: imported population and live top 20;
- `validate`: compile and smoke-run every scraped source;
- `battle`: deterministic head-to-head replay with a move preview;
- `evaluate`: repeated candidate battles against all active scraped bots,
  including weighted score, confidence interval, percentiles, failures, and
  every per-opponent result;
- `tournament`: continue the imported snapshot through locally simulated,
  officially weighted battles and print the resulting top 20;
- `benchmark`: measure transpilation and real-corpus battle throughput.

## Sandbox fidelity

Boa is intentionally used instead of the production QuickJS runtime, so tiny
engine-specific differences are possible. The game, state, scoring, scheduler,
and leaderboard semantics are reproduced. JSON values cross the host boundary
on every call. Runtime imports are rejected.

Boa does not expose QuickJS's exact 1 MB heap limiter or deadline interrupt.
The replica therefore enforces the 50,000-byte source limit, 1 MB serialized
state/memory boundary, bounded loop/recursion/stack limits, and a 10 ms
per-thread CPU budget measured around every bot call. Infinite loops are stopped
by Boa's loop limit; a CPU overrun is mapped to the official timeout forfeit.

The shipped [`bots/candidate.ts`](bots/candidate.ts) is a population-tuned
candidate, not a universal game-theoretic optimum. Re-evaluate it whenever the
active population or matrix changes.

See [`BENCHMARKS.md`](BENCHMARKS.md) for reproducible performance and strategy
results.
