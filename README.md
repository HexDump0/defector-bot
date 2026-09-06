# Defector Bots

Bots for [Defector](https://defector.hackclub.com/guide/writing-a-bot) a Hack Club YSWS based on an iterated Prisoner's Dilemma tournament.
The latest bots score >1.85 consistently by learning the live population and exploiting them

# Local engine

A fast, deterministic local replica of Defector's tournament engine, written in
Rust and powered by Boa.js for benchmarking and fuzzing strategies  

## Build

```bash
cargo build --release
```

```bash
./target/release/defector-lab info
./target/release/defector-lab validate
./target/release/defector-lab evaluate bots/candidate.ts \
  --name candidate-v3 --repetitions 50 --seed 20260904
./target/release/defector-lab tournament --battles 10000 --seed 20260904 \
  --candidate bots/candidate.ts --candidate-name candidate-v3
./target/release/defector-lab benchmark --battles 1000 --seed 42
```

## Limitations

Boa is intentionally used instead of the production QuickJS runtime, so tiny
engine-specific differences are possible. The game, state, scoring, scheduler,
and leaderboard semantics are reproduced. JSON values cross the host boundary
on every call. Runtime imports are rejected.

Boa does not expose QuickJS's exact 1 MB heap limiter or deadline interrupt.
The engine therefore enforces the 50,000-byte source limit, 1 MB memory boundary and a 10 ms
per-thread CPU budget. But exact compatibility cannot be guaranteed   