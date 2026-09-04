# Strategy notes and research directions

This is analysis, not an assertion that one strategy is optimal. The active
population and public counter-strategies determine what performs best.

## 1. Fundamental incentives

For a single round, `D` strictly dominates `C`:

```text
against C: D earns 3 instead of 2
against D: D earns 1 instead of 0
```

Across repeated rounds, sustained mutual cooperation earns 2 per round, twice
the score of mutual defection. A strong bot must balance:

- exploiting bots that will continue cooperating;
- preserving cooperation with responsive bots;
- avoiding being exploited by defectors;
- recovering from deliberate probes;
- remaining difficult to classify from a short prefix.

## 2. Useful baselines

Maintain implementations of at least these archetypes:

- Always Cooperate (`AllC`)
- Always Defect (`AllD`)
- Tit for Tat (`TFT`)
- Suspicious Tit for Tat (start D, then copy)
- Grim Trigger / Grudger
- Tit for Two Tats
- Generous Tit for Tat
- randomized cooperator/defector at several probabilities
- finite-state probe/detective bots
- recent-window threshold bots
- common win-stay/lose-shift variants

The upstream engine already contains AllC, AllD, TFT, random, and one detective
example. Public tournament bots should be added to a local corpus only from
their public bot pages, with provenance recorded.

## 3. Baseline behavior under the current matrix

### AllD safety floor

Against any valid move, AllD receives either 3 or 1. It therefore guarantees at
least 1 point per completed round, excluding runtime failure.

AllD is a useful lower benchmark for a population-aware candidate. It is not
automatically optimal: against a reciprocal cooperator it collapses a possible
2-per-round relationship to roughly 1.

### TFT versus AllD

With `N` rounds:

```text
round 1: TFT gets 0, AllD gets 3
rounds 2..N: both get 1

TFT score  = (N - 1) / N       ~= 0.992 at N = 120
AllD score = (N + 2) / N       ~= 1.017 at N = 120
```

TFT loses the battle but limits exploitation after one round.

### TFT versus AllC or TFT

Starting with C produces permanent mutual cooperation and a score of 2. TFT can
therefore have an excellent ladder score with a weak recorded win rate.

### Opportunistic defection against reciprocity

Against a copier, one isolated defection followed by copying tends to produce:

```text
you D / opponent C => 3
you C / opponent D => 0
```

The two-round total is 3 instead of the 4 from continued mutual cooperation.
Blind one-shot exploitation can lower personal score even before considering a
longer retaliation cycle.

## 4. No conventional endgame

The bot knows that the battle has reached at least 100 rounds, but never knows
the sampled terminal round. A deterministic “cooperate until 99, then defect”
strategy is visible and the opponent can retaliate for the random tail.

Research should model the conditional continuation probability implied by the
current distribution while remembering that the distribution is not contractual.
Because the exponential tail is memoryless after the guaranteed prefix, the
post-100 continuation hazard is approximately constant rather than converging
on a known final round.

## 5. Classification without opponent identity

Classification must use observed actions and responses. Candidate features:

- total and recent opponent defection rate;
- opponent response after our previous C versus previous D;
- transition counts `CC`, `CD`, `DC`, `DD` from the opponent's perspective;
- lag-1 copy rate;
- probability of forgiveness after mutual defection;
- periodicity and deterministic prefix matches;
- confidence/sample count for every estimate.

Avoid treating a three-round fingerprint as certainty. Public source makes
fixed fingerprints easy to spoof. Prefer confidence that updates throughout the
battle.

## 6. A practical state-machine shape

A competitive research bot can be organized into phases:

1. **Opening:** begin cooperative or use a small, carefully priced probe.
2. **Classification:** estimate responsiveness, aggression, and forgiveness.
3. **Policy selection:** cooperate, reciprocate, exploit, or defend based on
   expected personal payoff.
4. **Monitoring:** continue updating evidence; do not lock permanently from one
   surprising move unless testing supports that choice.
5. **Recovery:** provide a bounded route out of mutual defection when the
   opponent appears responsive.

Store only sufficient statistics and a phase identifier in memory. Example:

```js
{
  phase: 1,
  oppC: 12,
  oppD: 3,
  afterOurC_D: 2,
  afterOurD_D: 1,
  mutualDRun: 0,
  policy: "reciprocate"
}
```

## 7. Population-aware optimization

Let opponent class `k` have exposure probability `p_k`, and let a candidate's
expected per-battle score against it be `s_k`. The approximate target is:

```text
E[ladder contribution] = sum_k p_k * s_k
```

Use per-battle scores, not pooled points across all simulated rounds. Estimate
`p_k` from the active field and matchmaking weights, not merely bot count.

Evaluate under multiple distributions:

- current estimated active population;
- uniform over distinct public strategies;
- cooperation-heavy population;
- defection-heavy population;
- adversarial population designed to exploit the candidate;
- population shifted by likely responses after source publication.

A small gain against many common opponents can matter more than a large gain
against one rare bot. Conversely, a deterministic vulnerability that yields 0
against a common counter can erase many modest gains.

## 8. Exploration versus deployment

The rolling 200-battle window makes adaptation possible, but live experiments
have costs:

- a broken candidate can accumulate zeros quickly because new bots are heavily
  selected;
- early scores have high variance;
- public source immediately reveals the experiment;
- three active variants may face one another.

Do extensive offline cross-play first. When comparing live variants, change one
concept at a time and record creation time, active interval, opponent set, and
matrix version.

## 9. Robustness priorities

In order:

1. never throw, hang, or return an invalid tuple;
2. remain well below 10 ms at long histories;
3. keep state safely under the 1 MB heap;
4. defend against unconditional and near-unconditional defectors;
5. preserve high-value mutual cooperation;
6. exploit genuinely non-responsive cooperators when expected gain exceeds the
   cost of misclassification;
7. resist public fingerprinting and simple spoofing.

A 0–3 forfeit is far worse than most strategic mistakes.

## 10. High-value research tasks

- Build an exact local tournament simulator and verify it against upstream
  example tests.
- Snapshot public active bot sources and battle traces with timestamps.
- Cluster opponents by behavioral response rather than bot name.
- Search finite-state machines under several population mixtures.
- Tune thresholds with held-out opponents, not the same corpus used for search.
- Run adversarial mutation/search to find short move sequences that drive a
  candidate into a low-scoring state.
- Measure whether randomized policies improve expected score or only obscure
  classification.
- Stress-test all candidates over long-tail match lengths and JSON boundary
  round trips.
- Recompute recommendations whenever the payoff matrix or active population
  changes.

## 11. Things agents must not assume

- that a battle is exactly 100 rounds;
- that Elo or win rate controls rank;
- that each round is weighted equally across the full lifetime history;
- that an opponent is selected uniformly;
- that a bot source or handshake remains secret;
- that module globals are stable persistence;
- that TypeScript transpilation bundles dependencies;
- that successful source creation proves runtime correctness;
- that the current payoff matrix or random-length formula is permanent.
