// PEAK v6 (rq4agkjfnv986oz8cm1d) mean=1.5832183737452556 stats={'battles': 1911, 'losses': 1102, 'wins': 359}
/**
 * PEAK v6
 *
 * Population-robust adaptive strategy.
 *
 * Main principles:
 *   1. Start cooperative.
 *   2. Detect aggressive openers quickly.
 *   3. Make aggression handling reversible when possible.
 *   4. Forgive isolated defections.
 *   5. Avoid the PEAK-v5 two-D probe.
 *   6. Probe only occasionally and only against a clean opponent.
 *   7. Exploit successful probes cautiously.
 *   8. Stop exploiting immediately when retaliation appears.
 */

export default function bot({ history, memory }) {
    const n = history.length;
    const C = "C";
    const D = "D";

    // ──────────────────────────────────────────────────────────────────
    // INITIAL STATE
    // ──────────────────────────────────────────────────────────────────

    if (!memory) {
        memory = {
            mode: "NORMAL",

            // Randomized probe signature.
            // Only 20% of matches actually probe.
            probeRound: 28 + Math.floor(Math.random() * 7), // 28..34
            probeChance: Math.random() < 0.20,

            probed: false,

            // Recovery after exploratory D
            recovery: 0,

            // Limited exploitation
            exploitLeft: 0,

            // Recent aggression
            hostileStreak: 0,

            // One-time cooperative attempt after long DD
            oliveUsed: false
        };
    }

    // ──────────────────────────────────────────────────────────────────
    // OPENING
    // ──────────────────────────────────────────────────────────────────

    if (n === 0) {
        return [C, memory];
    }

    const lastOpp = history[n - 1].opponent;

    // ──────────────────────────────────────────────────────────────────
    // EARLY AGGRESSION GUARD
    //
    // Important distinction:
    //
    // Firstborn / Always-D:
    //     D D D D D ...
    //
    // Munificus:
    //     D D C C C ...
    //
    // So guard first, but DO NOT permanently lock immediately.
    // ──────────────────────────────────────────────────────────────────

    if (memory.mode === "GUARD") {

        // Opponent backed down -> restore cooperation immediately.
        if (lastOpp === C) {
            return [
                C,
                {
                    ...memory,
                    mode: "NORMAL",
                    hostileStreak: 0,
                    oliveUsed: false
                }
            ];
        }

        // Still hostile after several rounds -> permanent defensive mode.
        if (n >= 6) {
            return [
                D,
                {
                    ...memory,
                    mode: "DEFECT"
                }
            ];
        }

        return [D, memory];
    }

    // ──────────────────────────────────────────────────────────────────
    // PERMANENT DEFECT MODE
    // ──────────────────────────────────────────────────────────────────

    if (memory.mode === "DEFECT") {

        // One final olive branch after prolonged mutual DD.
        // Useful against forgiving strategies that accidentally entered
        // a defensive loop.
        if (!memory.oliveUsed && n >= 3) {
            const a = history[n - 1];
            const b = history[n - 2];
            const c = history[n - 3];

            if (
                a.you === D && a.opponent === D &&
                b.you === D && b.opponent === D &&
                c.you === D && c.opponent === D
            ) {
                return [
                    C,
                    {
                        ...memory,
                        oliveUsed: true
                    }
                ];
            }
        }

        return [D, memory];
    }

    // ──────────────────────────────────────────────────────────────────
    // RECOVERY MODE
    //
    // Used after a probe causes retaliation.
    //
    // We cooperate temporarily.
    // Reactive opponents can return to peace.
    // Persistent defectors eventually get met with D.
    // ──────────────────────────────────────────────────────────────────

    if (memory.mode === "RECOVER") {

        if (lastOpp === C) {
            const nextRecovery = memory.recovery + 1;

            if (nextRecovery >= 2) {
                return [
                    C,
                    {
                        ...memory,
                        mode: "NORMAL",
                        recovery: 0,
                        hostileStreak: 0
                    }
                ];
            }

            return [
                C,
                {
                    ...memory,
                    recovery: nextRecovery
                }
            ];
        }

        // Still receiving D.
        const nextRecovery = memory.recovery + 1;

        if (nextRecovery >= 3) {
            return [
                D,
                {
                    ...memory,
                    mode: "DEFECT",
                    recovery: 0
                }
            ];
        }

        return [
            C,
            {
                ...memory,
                recovery: nextRecovery
            }
        ];
    }

    // ──────────────────────────────────────────────────────────────────
    // LIMITED EXPLOITATION
    //
    // Never exploit forever.
    //
    // One D every five rounds gives substantial upside against
    // Always-C / passive opponents without looking like permanent D.
    // Any retaliation immediately ends exploitation.
    // ──────────────────────────────────────────────────────────────────

    if (memory.mode === "EXPLOIT") {

        if (lastOpp === D) {
            return [
                C,
                {
                    ...memory,
                    mode: "RECOVER",
                    recovery: 0,
                    exploitLeft: 0
                }
            ];
        }

        if (memory.exploitLeft <= 0) {
            return [
                C,
                {
                    ...memory,
                    mode: "NORMAL"
                }
            ];
        }

        if (n % 5 === 0) {
            return [
                D,
                {
                    ...memory,
                    exploitLeft: memory.exploitLeft - 1
                }
            ];
        }

        return [C, memory];
    }

    // ──────────────────────────────────────────────────────────────────
    // PROBE WAIT
    //
    // We already sent one exploratory D.
    //
    // If they retaliate -> recover.
    // If they don't -> cautious exploitation.
    //
    // Crucially, there is NO immediate second D.
    // ──────────────────────────────────────────────────────────────────

    if (memory.mode === "PROBE_WAIT") {

        if (lastOpp === D) {
            return [
                C,
                {
                    ...memory,
                    mode: "RECOVER",
                    recovery: 0
                }
            ];
        }

        return [
            C,
            {
                ...memory,
                mode: "EXPLOIT",
                exploitLeft: 5
            }
        ];
    }

    // ──────────────────────────────────────────────────────────────────
    // NATURAL AGGRESSION TRACKING
    // ──────────────────────────────────────────────────────────────────

    if (lastOpp === D) {

        const prevOpp =
            n >= 2
                ? history[n - 2].opponent
                : C;

        if (prevOpp === D) {
            memory.hostileStreak++;
        } else {
            memory.hostileStreak = 1;
        }

    } else {
        memory.hostileStreak = 0;
    }

    // ──────────────────────────────────────────────────────────────────
    // EARLY HOSTILE-OPENER DETECTION
    //
    // D,D early is highly suspicious.
    // Three D's in the first four rounds is even stronger.
    // ──────────────────────────────────────────────────────────────────

    if (n <= 6) {

        const early = history.slice(
            0,
            Math.min(4, n)
        );

        const earlyD =
            early.filter(
                h => h.opponent === D
            ).length;

        if (
            earlyD >= 3 ||
            (
                n >= 2 &&
                early[0].opponent === D &&
                early[1].opponent === D
            )
        ) {
            return [
                D,
                {
                    ...memory,
                    mode: "GUARD"
                }
            ];
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // PERSISTENT DD
    // ──────────────────────────────────────────────────────────────────

    if (memory.hostileStreak >= 3) {
        return [
            D,
            {
                ...memory,
                mode: "DEFECT"
            }
        ];
    }

    // ──────────────────────────────────────────────────────────────────
    // LOW-PROBABILITY SINGLE PROBE
    //
    // Only probe an opponent who has shown ZERO natural D's.
    //
    // This deliberately sacrifices some Always-C exploitation upside
    // to reduce systematic destruction against Grim/Grudger.
    // ──────────────────────────────────────────────────────────────────

    if (
        !memory.probed &&
        memory.probeChance &&
        n === memory.probeRound
    ) {
        const clean =
            history.every(
                h => h.opponent === C
            );

        if (clean) {
            return [
                D,
                {
                    ...memory,
                    probed: true,
                    mode: "PROBE_WAIT"
                }
            ];
        }

        memory.probed = true;
    }

    // ──────────────────────────────────────────────────────────────────
    // NORMAL COOPERATION ENGINE
    //
    // Isolated D:
    //     forgive
    //
    // Repeated D:
    //     retaliate once
    //
    // Sustained aggression is handled above.
    // ──────────────────────────────────────────────────────────────────

    if (lastOpp === D) {

        const previousOpp =
            n >= 2
                ? history[n - 2].opponent
                : C;

        // Forgive isolated defection.
        if (previousOpp !== D) {
            return [C, memory];
        }

        // Retaliate against repeated defection.
        return [D, memory];
    }

    // ──────────────────────────────────────────────────────────────────
    // DEFAULT
    // ──────────────────────────────────────────────────────────────────

    return [C, memory];
}