# Scraping and leaderboard data

The live site exposes no REST API, but its SvelteKit remote-query endpoints are
public and unauthenticated. `tools/scrape.py` wraps them; this note documents
the endpoints, the encoding, the snapshot layout, and how the data feeds the
lab. Endpoint IDs last verified against the live site on 2026-09-04.

## 1. Taking a fresh scrape

From the repository root:

```bash
python3 tools/scrape.py                                # -> data/scraped_bots_<UTC date>/
python3 tools/scrape.py data/scraped_bots_2026-09-05   # explicit output dir
python3 tools/scrape.py out --skip-battles             # bots only, faster
python3 tools/scrape.py /tmp/t --snap-rounds 1 --limit 2  # ~30 s smoke test
```

A full scrape takes about 5 minutes: ~30 s of leaderboard polling, then one
request per bot for battle lists plus one per bot for full records (~0.12 s
spacing). It writes `bots.json`, `battles.json`, `snapshot.json`, `code/`, and
a provenance `README.md`. Re-scrape whenever the active set or the top of the
ladder shifts; at the observed pace (~1.4 battles/s on 2026-09-04) a snapshot
goes stale within a day.

## 2. Endpoint reference (Implementation)

Base: `https://defector.hackclub.com`. All calls are `GET`.

| Endpoint | Argument | Returns |
|---|---|---|
| `_app/remote/1jsclqx/leaderboardData` | none (live SSE stream) | snapshot: top-20 bots, last-50 battles, `activeBots`, `allBattles` |
| `_app/remote/sauyrc/getBot` | bot id | full bot record including `source` |
| `_app/remote/sauyrc/getBotBattles` | bot id | bot's recent battles (brief rows) |
| `_app/remote/hovlp4/getBattle` | battle id | full battle: scores, errors, every round |

The leaderboard query itself only returns the top 20 (`WHERE` lifetime
battles `>= 10`, ordered by `meanScore` desc, name asc), so full enumeration
needs battle-feed crawling: snapshot polling collects rotating `botIds`, then
`getBotBattles` opponent links are followed BFS-style until closure. Inactive
bots outside every recent-battle window are not enumerable this way.

## 3. Request and response encoding (Implementation)

- Query argument `<p>` is `base64url(JSON([id]))` with `=` padding stripped,
  sent as `?payload=<p>`. Example: id `abc…` becomes
  `WyJhYmMiXQ` (the JSON array brackets are part of the encoding).
- The SSE snapshot endpoint returns `text/event-stream`; the first `data:`
  message is the full snapshot, later messages are live updates. Read one
  message, then close the connection.
- Single-shot endpoints return `{"type":"result","data":"[...]"}` where the
  inner string is devalue-encoded: non-negative integers are pointers into
  that array, negative integers mean undefined, and `["Date", iso]` is a
  date. Repeated values are deduplicated by reference, so a decoder's cycle
  guard must track only the current path, not all visited indices. Spot-check
  any decoder with `meanScore == mean(curScores)` across the corpus.

The `1jsclqx` / `sauyrc` / `hovlp4` prefixes are build-generated remote-function
IDs. A site redeploy can change them: re-extract by grepping the freshly served
`/_app/immutable/nodes/*.js` for `xxx/getBot`-style strings (backtick-quoted,
e.g. `` `sauyrc/getBot` ``). The human-readable suffixes (`getBot`,
`getBotBattles`, `getBattle`, `leaderboardData`) match the query names in the
upstream file names below.

## 4. Snapshot file layout

Each `data/scraped_bots_*` directory contains:

- `bots.json` — `{scraped_at, site_activeBots, site_allBattles, count, bots}`,
  bots sorted by `meanScore` desc. Bot record keys: `id, name, description,
  codeUrl, active, created, updated, meanScore, curScores, stats, ownerName,
  source`. `stats` holds lifetime `{wins, losses, battles}` across all
  matrices; `curScores` is the current-matrix rolling window (at most 200
  per-battle averages, chronological).
- `battles.json` — `{botId: [{id, created, botIds, botNames}]}`. Brief rows:
  no scores or rounds. Fetch `hovlp4/getBattle` per id for full detail.
- `snapshot.json` — decoded leaderboard snapshot at scrape time.
- `code/<botId>_<name>.ts` — submitted source, one file per bot.

Schema notes (observed 2026-09-04; the pre-update corpus differs):

- `active` is the string `"active"`, not a boolean. Older scrapes used `true`.
- `curScores` replaced the older `scoreHistory` field; both are plain
  float arrays when present.
- `ownerName` is usually null (public endpoint redacts it).

## 5. What the data does and does not show (Inference)

- A bot's `meanScore` is exactly `mean(curScores)` — verified 0 mismatches on
  2026-09-04 — so the public ladder is reproducible from `bots.json` alone.
- BFS enumeration can retain recently archived bots reached through recent
  battle links. For example, the `2026-09-04_1840IST` corpus contains 75 bot
  records but only 67 with `active == "active"`. Always filter the active set
  before an `evaluate` run and treat cross-scrape mean deltas as
  population-shifted, not same-opponent, comparisons.
- `battles.json` windows are per-bot recent history (about 50 entries), not
  full histories. Lifetime totals come from `stats`.

## 6. Feeding the lab

The lab defaults to one snapshot. Its tournament command respects each bot's
`active` field, but `evaluate` currently scores every record supplied to it.
Create an active-only derived snapshot before evaluating a fresh BFS scrape:

```bash
jq '.bots |= map(select(.active == "active")) | .count = (.bots | length) | .site_activeBots = .count' \
  data/scraped_bots_2026-09-04_1840IST/bots.json > /tmp/defector-active.json

./target/release/defector-lab --snapshot /tmp/defector-active.json info
./target/release/defector-lab --snapshot /tmp/defector-active.json evaluate bots/candidate.ts \
  --name candidate-v4 --repetitions 10 --seed 20260904
```

The lab reads bot `id/name/source/active/stats/curScores` from `bots.json` and
ignores the rest. After re-scraping, re-run `validate` (a new corpus can
contain a new invalid bot) and re-baseline the candidate: opponent means and
the active set move daily.

## 7. Upstream sources

- [Leaderboard live query](https://github.com/Heliodex/Defector/blob/main/src/routes/%28any%29/leaderboard/leaderboard.remote.ts)
- [Leaderboard top-20 query](https://github.com/Heliodex/Defector/blob/main/src/routes/%28any%29/leaderboard/leaderboardBots.surql)
- [Bot record query](https://github.com/Heliodex/Defector/blob/main/src/routes/%28any%29/bot/%5Bid=strid%5D/bot.remote.ts)
- [Battle record query](https://github.com/Heliodex/Defector/blob/main/src/routes/%28any%29/battle/%5Bid=strid%5D/battle.remote.ts)
