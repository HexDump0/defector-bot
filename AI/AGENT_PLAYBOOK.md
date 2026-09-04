# Agent playbook

Use this workflow whenever an agent is asked to create, modify, or evaluate a
Defector bot.

## 1. Establish the current target

Before changing strategy:

1. Read every file in this directory.
2. Check the upstream runner, sandbox, scoring schema, selector, and leaderboard
   query for changes since the verification date.
3. Record the active payoff matrix.
4. State the metric being optimized: mean per-battle points per round.
5. Identify whether the task is logic design, simulation, parameter tuning,
   robustness, or population analysis.

Never begin from an old Elo-based description.

## 2. Preserve experimental discipline

For each proposed strategy change, write down:

- hypothesis;
- precise rule or parameter changed;
- expected gains by opponent archetype;
- expected failure modes;
- baseline being compared;
- evaluation population and weights;
- random seeds or number of Monte Carlo repetitions;
- acceptance criterion.

Do not mix multiple strategic changes into one experiment unless the interaction
is the hypothesis.

## 3. Required correctness tests

A candidate must pass all of these before strategic evaluation:

- returns exactly two elements on round 0;
- move is always exactly `"C"` or `"D"`;
- handles initial `memory === null`;
- handles 100, 120, 160, and 500+ rounds;
- memory survives JSON serialization after every move;
- source is self-contained and has a callable default export;
- no runtime imports, network calls, Node/Bun APIs, or async return;
- no input mutation is required for correctness;
- every branch returns a tuple;
- no unbounded loop or recursion;
- no growth of memory proportional to history unless explicitly justified;
- execution remains comfortably below 10 ms in QuickJS;
- heap and stack stay comfortably below 1 MB.

Test invalid or unusual incoming memory locally even though the tournament
normally threads the bot's own previous return. Robust initialization prevents
one bad internal transition from cascading.

## 4. Required strategy evaluation

Run repeated randomized-length battles against:

- AllC;
- AllD;
- TFT;
- suspicious TFT;
- grudger;
- forgiving TFT variants;
- random policies at several cooperation probabilities;
- detector/probe strategies;
- all available public active-bot models;
- adversarially generated counters.

Include self-play. A strategy that cannot sustain a strong self-play score can
perform poorly when multiple similar bots are active.

Report:

```text
candidate name/version
source hash
payoff matrix
round-length model
opponent corpus version
mixture weights
number of battles
mean per-battle score
confidence interval or standard error
per-opponent scores
opponent scores and differentials
failure rate
runtime and memory measurements
```

## 5. Selection rule

Prefer a candidate only when:

- primary mean score improves on held-out opponents or plausible population
  mixtures;
- it does not introduce a severe common-counter vulnerability;
- the result is larger than simulation noise;
- runtime safety margins remain large;
- the behavior remains valid if match length exceeds 100 substantially.

Win rate alone is never an acceptance criterion.

## 6. Code design rules

- Keep the exported function thin.
- Use pure helper functions in the same file.
- Represent strategy as a small explicit state machine.
- Keep tunable constants together and document their experimental origin.
- Return a new small memory object when practical.
- Use history for verification and memory for incremental statistics.
- Do not include opponent names/IDs or private data.
- Do not rely on public-source secrecy, timing channels, engine bugs, globals,
  or denial-of-service behavior.
- Add a short header comment with strategy version and assumptions.

## 7. When using public tournament data

Public bot source and battle moves are legitimate observable inputs for offline
analysis. For reproducibility:

- save the bot ID and observation timestamp;
- distinguish exact source models from behavior inferred only from traces;
- do not assume an inactive bot remains relevant;
- calculate matchmaking weights from lifetime battle counts;
- avoid overfitting to bot names or one short battle;
- remember every deployed counter becomes public in turn.

## 8. Change handoff format

An agent completing bot work should provide:

1. files changed;
2. short strategy description;
3. exact contract assumptions;
4. tests and simulations run;
5. primary and secondary results versus baseline;
6. known weaknesses;
7. parameters worth tuning next;
8. whether upstream rules were re-verified and on what date.

If simulation infrastructure is missing, build that before making claims about
strategy quality. A plausible story is not evidence of a better ladder score.

## 9. Upstream re-verification checklist

Inspect these exact areas:

- `engine/runner.ts`: round count, state threading, call order
- `engine/sandbox.ts`: runtime, time/heap/stack limits, validation
- `engine/selectBots.surql`: active pool and selection weights
- `src/lib/server/init.surql`: matrix, forfeit scores, rolling window
- `leaderboardBots.surql`: threshold, sort, result limit
- bot creation/transpilation handler: source length and compile behavior
- bot and battle public pages: information available to competitors

If any fact changes, update the relevant document and the verification date in
`AI/README.md` before optimizing against the new rules.
