# Benchmarks

Benchmark date: 2026-09-04. Snapshot: 62 active public bots scraped at
`2026-09-04T05:48:47Z`.

Machine:

- Intel Core i3-12100F, 4 cores / 8 threads, up to 4.3 GHz;
- 15 GiB RAM;
- Rust 1.95.0;
- `boa_engine` 0.22.0;
- optimized `release` profile with thin LTO and one codegen unit.

Reproduce the engine benchmark:

```bash
./target/release/defector-lab benchmark --battles 1000 --seed 42
```

## Engine throughput

The strict 10 ms configuration produced:

| Workers | Battles/s | Completed rounds/s | Elapsed (1,000 battles) | Max successful move CPU |
|---:|---:|---:|---:|---:|
| 1 | 29.50 | 3,479 | 33.897 s | 4.967 ms |
| 4 | 90.87 | 10,686 | 11.005 s | 8.411 ms |
| 8 | 123.05 | 14,459 | 8.127 s | 9.982 ms |

The eight-worker run is `4.17x` faster than one worker. Parallel Boa garbage
collection can push valid public bots over the strict CPU boundary; use one
worker for sandbox-limit conformance and parallel workers for strategy search.

For raw research throughput, allowing 1,000 ms of Boa CPU (loop/stack limits
remain enabled) completed the same 1,000-real-bot workload in `6.128 s`:

```text
163.18 battles/s
19,260 completed rounds/s
0.00245 s to transpile all 62 TypeScript sources
```

The 22 failures in that run are scheduled appearances of the scraped `copycat`
bot, which returns an invalid move on round zero. `defector-lab validate`
confirms that the other 61 sources pass a three-round smoke battle.

## Candidate result

Candidate v3 (`bots/candidate.ts`) was compared with the current live leader's
public strategy using the same held-out seed and 20 battles against each of all
62 active bots (1,240 battles per strategy):

| Strategy | Weighted mean score | 95% interval | Candidate failures |
|---|---:|---:|---:|
| candidate v3 | **1.720127** | 1.688014–1.752240 | 0 |
| goatbotv1.6 baseline | 1.702166 | 1.669885–1.734447 | 0 |

Observed improvement: `+0.017961` points per round (`+1.06%`). The 20 opponent
failures for each strategy are the known invalid `copycat`, correctly scored as
`3:0` forfeits. Candidate source hash after TypeScript transpilation:

```text
249cadbdaa0b056f20dd801ea541296e515cde0f74e5bc19080e2757d8715905
```

One 10,000-battle rolling-window replay placed the fresh candidate fifth at
`1.688836`; the candidate's independent full-population estimate is stronger,
but a 200-result ladder window remains noisy and no finite simulation can
guarantee first place. Re-run against every new population snapshot.
