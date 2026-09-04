#!/usr/bin/env python3
"""Scrape all public Defector bot data (no auth) via SvelteKit remote endpoints.

Usage:
    python3 scrape.py [OUT_DIR] [--snap-rounds N] [--limit N] [--skip-battles]

Defaults to OUT_DIR=scraped_bots_<UTC date>. Writes:
    bots.json      full getBot records sorted by meanScore desc
    battles.json   per-bot recent battle lists {botId: [{id, created, botIds, botNames}]}
    snapshot.json  raw leaderboard snapshot (top-20 + last-50 battles)
    code/          one <botId>_<name>.ts source file per bot
    README.md      scrape provenance notes

Endpoints (all GET, unauthenticated):
    /_app/remote/1jsclqx/leaderboardData                    live SSE stream, first message = snapshot
    /_app/remote/sauyrc/getBotBattles?payload=<p>           a bot's recent battles (for BFS enumeration)
    /_app/remote/sauyrc/getBot?payload=<p>                  full bot record + source
where <p> = base64url(JSON([id])) with padding stripped.

Responses are devalue-encoded: {"type":"result","data":"[...]"} where
non-negative ints are pointers into the array, negatives mean undefined,
and ["Date", iso] is a date. If the site redeploys, the random-looking
endpoint IDs (1jsclqx, sauyrc) may change — re-extract them from
/_app/immutable/nodes/*.js (look for `xxx/getBot` style strings).
"""

import argparse
import base64
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

BASE = "https://defector.hackclub.com"
# Default scrapes land next to the other snapshots in <repo>/data/.
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = str(
    REPO_ROOT / "data" / ("scraped_bots_" + datetime.now(timezone.utc).strftime("%Y-%m-%d"))
)
EP_SNAPSHOT = "1jsclqx/leaderboardData"
EP_BOT_BATTLES = "sauyrc/getBotBattles"
EP_BOT = "sauyrc/getBot"


def payload(arg) -> str:
    raw = json.dumps([arg], separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode(arr, idx, path=()):
    """Resolve one devalue pointer. Shared refs are normal (dedup), so the
    cycle guard only tracks the current path, not all visited indices."""
    if not isinstance(idx, int):
        return idx
    if idx < 0 or idx in path:
        return None
    path = path + (idx,)
    v = arr[idx]
    if isinstance(v, dict):
        return {k: decode(arr, x, path) for k, x in v.items()}
    if isinstance(v, list):
        if len(v) == 2 and v[0] == "Date" and isinstance(v[1], str):
            return v[1]
        return [decode(arr, x, path) for x in v]
    return v


def api(session: requests.Session, endpoint: str, arg, stream=False):
    params = {"payload": payload(arg)} if arg is not None else None
    r = session.get(f"{BASE}/_app/remote/{endpoint}", params=params,
                    stream=stream, timeout=30)
    if stream:
        buf = ""
        for chunk in r.iter_content(chunk_size=4096, decode_unicode=True):
            if chunk:
                buf += chunk
                if "\n\n" in buf:
                    break
        r.close()
        line = next(l for l in buf.splitlines() if l.startswith("data: "))
        return json.loads(json.loads(line[6:])["result"])
    r.raise_for_status()
    return json.loads(r.json()["data"])


def snapshot_ids(session, rounds):
    """Poll the live snapshot; collect top-20 ids + all botIds in battle feed."""
    import os
    ids: dict[str, str | None] = {}
    snap = None
    for i in range(rounds):
        snap = decode(api(session, EP_SNAPSHOT, None, stream=True), 0)
        for b in snap["bots"]:
            ids[b["id"]] = b["name"]
        for bt in snap["battles"]:
            for bid, nm in zip(bt["botIds"], bt["botNames"]):
                ids.setdefault(bid, nm)
        print(f"snap {i + 1}: active={snap['activeBots']} "
              f"battles={snap['allBattles']} known={len(ids)}", flush=True)
        if i < rounds - 1:
            time.sleep(4)
    return snap, ids


def expand_bfs(session, ids):
    """Walk getBotBattles opponent links until closure; keep battle lists."""
    battles_by_bot = {}
    queue = list(ids)
    seen = set()
    while queue:
        bid = queue.pop(0)
        if bid in seen:
            continue
        seen.add(bid)
        try:
            bl = decode(api(session, EP_BOT_BATTLES, bid), 1) or []
            battles_by_bot[bid] = bl
            for bt in bl:
                for ob in bt["botIds"]:
                    if ob not in ids:
                        ids[ob] = None
                        queue.append(ob)
        except Exception as e:
            print(f"BATTLES FAIL {bid}: {str(e)[:100]}")
        if len(seen) % 20 == 0:
            print(f"bfs: expanded={len(seen)} known={len(ids)}", flush=True)
        time.sleep(0.12)
    print(f"BFS closure: {len(ids)} ids")
    return battles_by_bot


def fetch_bots(session, ids, skip_battles_fallback=True):
    bots, fail = [], []
    for i, bid in enumerate(ids):
        try:
            bots.append(decode(api(session, EP_BOT, bid), 1))
        except Exception as e:
            fail.append(bid)
            print(f"BOT FAIL {bid}: {str(e)[:100]}")
        if i % 25 == 0:
            print(f"meta {i}/{len(ids)}", flush=True)
        time.sleep(0.12)
    print(f"fetched {len(bots)}, failed {len(fail)}: {fail}")
    return bots


def main() -> int:
    ap = argparse.ArgumentParser(description="Scrape all public Defector bots")
    ap.add_argument("out", nargs="?", default=DEFAULT_OUT,
                    help="output directory (default: data/scraped_bots_<UTC date>)")
    ap.add_argument("--snap-rounds", type=int, default=6,
                    help="leaderboard snapshot polls (default 6)")
    ap.add_argument("--limit", type=int, default=0,
                    help="only fetch first N bot ids (smoke test)")
    ap.add_argument("--skip-battles", action="store_true",
                    help="skip per-bot battle lists (faster, bots.json only)")
    args = ap.parse_args()

    import os
    os.makedirs(f"{args.out}/code", exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": "defector-scraper"})

    snap, ids = snapshot_ids(session, args.snap_rounds)
    with open(f"{args.out}/snapshot.json", "w") as f:
        json.dump(snap, f, indent=1)

    if args.limit:
        ids = dict(list(ids.items())[:args.limit])
        battles_by_bot = {}
    elif args.skip_battles:
        battles_by_bot = {}
    else:
        battles_by_bot = expand_bfs(session, ids)
        with open(f"{args.out}/battles.json", "w") as f:
            json.dump(battles_by_bot, f, indent=1)

    bots = fetch_bots(session, ids)
    bots.sort(key=lambda b: -(b.get("meanScore") or 0))
    for b in bots:
        safe = re.sub(r"[^A-Za-z0-9._-]+", "_", b.get("name") or b["id"])[:60]
        with open(f"{args.out}/code/{b['id']}_{safe}.ts", "w") as f:
            f.write(f"// {b.get('name')} ({b['id']}) "
                    f"mean={b.get('meanScore')} stats={b.get('stats')}\n"
                    + (b.get("source") or ""))
    with open(f"{args.out}/bots.json", "w") as f:
        json.dump({
            "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "site_activeBots": snap["activeBots"],
            "site_allBattles": snap["allBattles"],
            "count": len(bots),
            "bots": bots,
        }, f, indent=1)

    with open(f"{args.out}/README.md", "w") as f:
        f.write(f"""# Scraped bots — {os.path.basename(args.out)}

- Source: https://defector.hackclub.com (public SvelteKit remote endpoints, no auth)
- See tools/scrape.py for method and endpoint docs.
""")
    print(f"WROTE {len(bots)} bots -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
