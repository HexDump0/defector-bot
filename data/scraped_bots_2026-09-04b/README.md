# Scraped bots — 2026-09-04b (morning rescan)

- Source: https://defector.hackclub.com (public SvelteKit remote endpoints, no auth)
- Scraped: 2026-09-04T09:33:05Z. Site reported 64 active bots / ~105,633 battles.
- Method:
  1. `GET /_app/remote/1jsclqx/leaderboardData` (top-20 + last-50 battles, polled 6x)
  2. `GET /_app/remote/sauyrc/getBotBattles?payload=<base64url(JSON([id]))>` per bot, BFS over opponent `botIds` until closure (64 ids)
  3. `GET /_app/remote/sauyrc/getBot?payload=...` per bot for full record + `source`
- `bots.json`: full records sorted by `meanScore` desc (keys: `id, name, description, codeUrl, active("active"), created, updated, meanScore, curScores, stats, ownerName, source`).
- `battles.json`: per-bot recent battle lists (`{botId: [{id, created, botIds, botNames}]}` — 3,200 entries, brief rows without scores/rounds).
- `snapshot.json`: raw leaderboard snapshot. `code/`: one `<botId>_<name>.ts` per bot (64 files).

Vs `../scraped_bots_2026-09-04` (~4h earlier): 56 kept, 8 new ids, 6 gone; battles 85,671 → 105,633 (~1.4/s).
