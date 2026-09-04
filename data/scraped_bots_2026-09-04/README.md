# Scraped bots — 2026-09-04 (post-update)

- Source: https://defector.hackclub.com (public SvelteKit remote endpoints, no auth)
- Scraped: 2026-09-04T05:48:47Z. Site reported 62 active bots / ~85,671 battles.
- Method:
  1. `GET /_app/remote/1jsclqx/leaderboardData` (top-20 + last-50 battles, polled 6x to collect rotating `botIds`)
  2. `GET /_app/remote/sauyrc/getBotBattles?payload=<base64url(JSON([id]))>` per bot, BFS over opponent `botIds` until closure (62 ids)
  3. `GET /_app/remote/sauyrc/getBot?payload=...` per bot for full record + `source`
- `bots.json`: full records sorted by `meanScore` desc. `snapshot.json`: raw leaderboard snapshot.
- `code/`: one `<botId>_<name>.ts` per bot (62 files).

Schema changes vs `../scraped_bots` (pre-update):
- `active` is now a string (`"active"`) instead of bool
- `scoreHistory` replaced by `curScores` (rolling window, ≤200; verified `meanScore == mean(curScores)` for all 62)
- Old inactive/frozen entries are gone (69 old ids vanished, 18 new ids); all 62 bots are active.
