# Fast local bot benchmarking

Use the Rust `defector-lab` whenever creating, modifying, or comparing a bot.
It runs the complete scraped active population with Boa and reports the actual
leaderboard objective: mean per-battle points per round under the `2/3/1/0`
matrix.

## One-time build

From the repository root:

```bash
cargo build --release
```

Always use `target/release/defector-lab` for simulations. `cargo run` defaults
to a debug binary and gives misleading throughput and timeout measurements.

The default input is:

```text
data/scraped_bots_2026-09-04/bots.json
```

Pass `--snapshot path/to/bots.json` before the subcommand when using a newer
scrape.

## Fast workflow

### 1. Check the corpus

```bash
./target/release/defector-lab info
./target/release/defector-lab validate
```

The 2026-09-04 corpus has one genuinely invalid active bot named `copycat`.
Its invalid move is expected and becomes a forfeit in tournaments. Do not
"fix" public opponent source.

### 2. Smoke-test a candidate

Use three battles per opponent while iterating:

```bash
./target/release/defector-lab evaluate bots/candidate.ts \
  --name candidate-dev --repetitions 3 --seed 101
```

This exercises all 62 opponents. Check:

- weighted mean score (primary);
- candidate failures (must be zero);
- worst per-opponent scores;
- maximum move CPU time (must stay below 10 ms);
- self-play separately if the candidate is not already in the corpus.

### 3. Compare one change against a baseline

Change only one rule or parameter. Use the same repetitions and seed for both:

```bash
./target/release/defector-lab evaluate bots/baseline.ts \
  --name baseline --repetitions 10 --seed 20260904 --json > /tmp/baseline.json

./target/release/defector-lab evaluate bots/candidate.ts \
  --name candidate --repetitions 10 --seed 20260904 --json > /tmp/candidate.json

jq '{score:.weightedMeanScore, ci:.confidence95, failures, byOpponent}' \
  /tmp/baseline.json /tmp/candidate.json
```

Ten repetitions means 620 battles per strategy and is the normal iteration
tier. Use `--repetitions 50` or more with a new held-out seed before accepting
a strategy change.

If investigating strategy outcomes rather than the production 10 ms budget,
temporarily use `--timeout-ms 100`; Boa is a different interpreter from the
official QuickJS runtime and garbage-collection timing can otherwise add
engine noise. The final acceptance run must use the default 10 ms limit.

### 4. Inspect exact interactions

Both scraped names/IDs and local source paths are accepted:

```bash
./target/release/defector-lab battle bots/candidate.ts goatbotv1.6 \
  --rounds 160 --seed 7

./target/release/defector-lab battle bots/candidate.ts "Always Defect" \
  --rounds 500 --seed 7
```

Run at least 100, 120, 160, and 500 rounds during robustness work. The official
random distribution is used when `--rounds` is omitted.

### 5. Reproduce the rolling leaderboard

This imports every bot's scraped lifetime counters and current score window,
then continues official weighted matchmaking locally:

```bash
./target/release/defector-lab tournament \
  --battles 10000 \
  --seed 20260904 \
  --candidate bots/candidate.ts \
  --candidate-name candidate-v3
```

A fresh candidate begins at zero battles, receives the same new-bot selection
weight as production, becomes leaderboard-eligible after 10 battles, and uses
only its latest 200 scores.

### 6. Measure engine speed

```bash
./target/release/defector-lab benchmark --battles 1000 --seed 42
```

The workload uses real scraped sources and official random battle lengths. Do
not substitute a native mock benchmark when reporting platform throughput.

## Parallelism and reproducibility

Independent battles run in parallel. Rayon uses the machine default; override
it globally when comparing scaling:

```bash
./target/release/defector-lab --threads 1 benchmark --battles 1000 --seed 42
./target/release/defector-lab --threads 8 benchmark --battles 1000 --seed 42
```

The scheduler and every bot's `Math.random()` stream derive from `--seed`, so
identical source, snapshot, seed, thread count, and binary should reproduce the
same strategic scores. Timing will still vary with system load.

## What to record in an experiment

Record candidate name/version, transpiled source hash, snapshot timestamp,
matrix, seed, repetitions, weighted mean, confidence interval, per-opponent
scores, both sides' failures, maximum move time, and the exact command. Keep
the JSON output for accepted comparisons.

The lab intentionally does not claim byte-for-byte QuickJS equivalence. Its
game state, scoring, scheduling, and rolling leaderboard match production;
Boa-specific sandbox limitations are documented in the root `README.md`.

