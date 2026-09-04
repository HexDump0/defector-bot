# Defector bot research

This directory is the technical handoff for agents working on Defector bots.
It intentionally excludes account, login, reward, and submission-form guidance.

Verified against the live site and `Heliodex/Defector` `main` branch on
2026-09-04. The upstream project is active, so re-check the linked source before
depending on an implementation detail.

## Reading order

1. [GAME_AND_BOT_API.md](GAME_AND_BOT_API.md) — payoff model, rounds, state,
   return value, and hard limits.
2. [EXECUTION_MODEL.md](EXECUTION_MODEL.md) — exact transpile/sandbox/call
   pipeline and failure behavior.
3. [LEADERBOARD_AND_MATCHMAKING.md](LEADERBOARD_AND_MATCHMAKING.md) — the real
   optimization target, rolling window, visibility threshold, and opponent
   selection.
4. [STRATEGY_NOTES.md](STRATEGY_NOTES.md) — consequences of the rules and a
   research agenda for stronger strategies.
5. [LOCAL_RUST_LAB.md](LOCAL_RUST_LAB.md) — fast commands for benchmarking,
   candidate comparison, and local leaderboard replay.
6. [AGENT_PLAYBOOK.md](AGENT_PLAYBOOK.md) — required workflow and validation
   checklist for agents changing a bot.

## Facts to keep top of mind

- The live ladder is **not Elo**. It ranks by mean points per round.
- A ladder score is an unweighted mean of at most the last 200 per-battle
  average scores on the current payoff matrix.
- Battles have a hidden random length: at least 100 rounds, about 119.5 rounds
  on average, and no finite configured maximum.
- A bot receives only `{ history, memory }`; it receives no opponent identity,
  score, rank, or final-round signal.
- The function must synchronously return exactly `["C" | "D", memory]` within
  10 ms.
- Each sandbox has a 1 MB heap limit and 1 MB stack limit.
- A crash, timeout, or malformed return normally forfeits the battle 0–3.
- Submitted source is publicly visible on the bot page.
- Matchmaking favors bots with fewer lifetime battles. It is not rank-based.
- Only active bots with at least 10 lifetime battles can appear in the public
  top 20.

## Upstream sources

- [Live rules](https://defector.hackclub.com/guide/writing-a-bot)
- [Bot runner](https://github.com/Heliodex/Defector/blob/main/engine/runner.ts)
- [QuickJS sandbox](https://github.com/Heliodex/Defector/blob/main/engine/sandbox.ts)
- [Match selection](https://github.com/Heliodex/Defector/blob/main/engine/selectBots.surql)
- [Database schema and scoring](https://github.com/Heliodex/Defector/blob/main/src/lib/server/init.surql)
- [Leaderboard query](https://github.com/Heliodex/Defector/blob/main/src/routes/%28any%29/leaderboard/leaderboardBots.surql)
- [Bot creation handler](https://github.com/Heliodex/Defector/blob/main/src/routes/%28main%29/submit-bot/bot.remote.ts)
- [Public bot page](https://github.com/Heliodex/Defector/blob/main/src/routes/%28any%29/bot/%5Bid=strid%5D/%2Bpage.svelte)

## Authority labels used in these notes

- **Contract**: stated by the live guide/UI and should remain safe to rely on.
- **Implementation**: observed in current source; it can change without notice.
- **Inference**: mathematically or operationally derived from current code.

When the three disagree, build against the contract and use implementation
details only to reproduce the current tournament locally.
