// PEAK v7 (qlw0czzjyaaf1ibmr7l0) mean=1.4890414451136065 stats={'battles': 1838, 'losses': 999, 'wins': 305}
/**
 * PEAK v7
 *
 * Risk-Adaptive Population Strategy
 *
 * Core idea:
 *   Don't ask "what type of bot is this?"
 *   Ask:
 *     - How dangerous is its defection rate?
 *     - Does it retaliate against our D?
 *     - Does it forgive?
 *     - Does it cooperate consistently?
 *     - Can we exploit it without causing a collapse?
 *
 * Design priorities:
 *
 *   1. Start C.
 *   2. Detect hard aggression very early.
 *   3. Forgive isolated defections.
 *   4. Punish persistent aggression.
 *   5. Never remain trapped in pointless DD forever.
 *   6. Probe only clean opponents.
 *   7. Exploit successful probes in small bursts.
 *   8. Immediately stop exploiting after retaliation.
 *   9. Never rely on a fixed endgame length.
 */

export default function bot({ history, memory }) {
    const n = history.length;
    const C = "C";
    const D = "D";

    // ================================================================
    // INITIALIZATION
    // ================================================================

    if (!memory) {
        memory = {
            mode: "NORMAL",

            // Randomized probe.
            // Most matches will never probe.
            probeArmed: Math.random() < 0.22,
            probeRound: 22 + Math.floor(Math.random() * 12),

            probed: false,

            // Behaviour measurements
            oppD: 0,
            oppC: 0,
            ourD: 0,

            // Retaliation measurements
            retaliations: 0,
            probeRetaliated: false,

            // Recent behaviour
            dStreak: 0,
            coopStreak: 0,

            // Recovery
            recoverLeft: 0,

            // Exploitation
            exploitLeft: 0,
            exploitPhase: Math.floor(Math.random() * 4),

            // DD tracking
            ddStreak: 0,
            oliveUsed: false
        };
    }

    // ================================================================
    // FIRST MOVE
    // ================================================================

    if (n === 0) {
        return [C, memory];
    }

    const last = history[n - 1];
    const lastOpp = last.opponent;
    const lastMe = last.you;

    if (lastOpp === D) {
        memory.oppD++;
        memory.oppC = memory.oppC || 0;
        memory.dStreak++;
        memory.coopStreak = 0;
    } else {
        memory.oppC++;
        memory.dStreak = 0;
        memory.coopStreak++;
    }

    if (lastMe === D) {
        memory.ourD++;
    }

    // ================================================================
    // BASIC BEHAVIOURAL METRICS
    // ================================================================

    const oppDRate = memory.oppD / n;
    const oppCRate = memory.oppC / n;

    const recentWindow = Math.min(8, n);
    const recent = history.slice(-recentWindow);

    const recentD =
        recent.filter(h => h.opponent === D).length;

    const recentDRate = recentD / recentWindow;

    // Did they punish our last D?
    if (
        lastMe === D &&
        lastOpp === D
    ) {
        memory.retaliations++;
    }

    // ================================================================
    // MODE: HARD DEFENSE
    // ================================================================

    if (memory.mode === "DEFEND") {

        /*
         * Stay defensive while hostility continues.
         *
         * BUT:
         * if the opponent gives us a genuine cooperative window,
         * return to NORMAL instead of permanently locking.
         */

        if (
            lastOpp === C &&
            memory.coopStreak >= 3
        ) {
            memory.mode = "NORMAL";
            memory.dStreak = 0;

            return [C, memory];
        }

        return [D, memory];
    }

    // ================================================================
    // MODE: RECOVERY
    // ================================================================

    if (memory.mode === "RECOVER") {

        /*
         * We voluntarily cooperate after provoking retaliation.
         *
         * This is the biggest v7 difference from APEX:
         * retaliation does NOT automatically become an escalation war.
         */

        if (lastOpp === C) {
            memory.recoverLeft++;

            if (memory.recoverLeft >= 2) {
                memory.mode = "NORMAL";
                memory.recoverLeft = 0;
            }

            return [C, memory];
        }

        memory.recoverLeft++;

        if (memory.recoverLeft >= 3) {
            memory.mode = "DEFEND";
            memory.recoverLeft = 0;
            return [D, memory];
        }

        return [C, memory];
    }

    // ================================================================
    // MODE: EXPLOIT
    // ================================================================

    if (memory.mode === "EXPLOIT") {

        /*
         * Exploitation is deliberately finite.
         *
         * We don't want:
         *
         *   successful probe
         *       ->
         *   permanent D
         *       ->
         *   delayed retaliation
         *       ->
         *   destroyed match
         */

        if (lastOpp === D) {
            memory.mode = "RECOVER";
            memory.recoverLeft = 0;
            memory.exploitLeft = 0;

            return [C, memory];
        }

        if (memory.exploitLeft <= 0) {
            memory.mode = "NORMAL";
            return [C, memory];
        }

        /*
         * One D roughly every four rounds.
         *
         * The random phase prevents a rigid public signature.
         */
        const phase =
            (n + memory.exploitPhase) % 4;

        if (phase === 0) {
            memory.exploitLeft--;

            return [D, memory];
        }

        return [C, memory];
    }

    // ================================================================
    // MODE: PROBE WAIT
    // ================================================================

    if (memory.mode === "PROBE_WAIT") {

        /*
         * We sent exactly ONE exploratory D.
         *
         * If they retaliate immediately:
         *     recover.
         *
         * If they forgive:
         *     establish exploitation eligibility.
         */

        if (lastOpp === D) {
            memory.probeRetaliated = true;
            memory.mode = "RECOVER";
            memory.recoverLeft = 0;

            return [C, memory];
        }

        /*
         * No retaliation.
         *
         * Don't immediately fire another D.
         * Give them another cooperative round.
         */
        memory.mode = "PROBE_CONFIRM";

        return [C, memory];
    }

    // ================================================================
    // MODE: PROBE CONFIRM
    // ================================================================

    if (memory.mode === "PROBE_CONFIRM") {

        if (lastOpp === D) {
            memory.probeRetaliated = true;
            memory.mode = "RECOVER";
            memory.recoverLeft = 0;

            return [C, memory];
        }

        /*
         * They survived the probe AND the following C period.
         *
         * That's much stronger evidence of exploitability than merely
         * observing a high historical C rate.
         */

        if (
            oppCRate >= 0.90 &&
            memory.oppD <= 1
        ) {
            memory.mode = "EXPLOIT";
            memory.exploitLeft = 8;

            return [D, memory];
        }

        memory.mode = "NORMAL";

        return [C, memory];
    }

    // ================================================================
    // EARLY HOSTILITY DETECTION
    // ================================================================

    /*
     * Aggressive opener detector.
     *
     * Examples:
     *
     *   D D D
     *   D D C D
     *   D C D D
     *
     * These are much more informative than waiting until round 20.
     */

    if (n <= 6) {
        const early = history.slice(0, Math.min(5, n));

        const earlyD =
            early.filter(
                h => h.opponent === D
            ).length;

        if (
            earlyD >= 3 ||
            (
                n >= 2 &&
                history[0].opponent === D &&
                history[1].opponent === D
            )
        ) {
            memory.mode = "DEFEND";
            return [D, memory];
        }
    }

    // ================================================================
    // PERSISTENT HOSTILITY
    // ================================================================

    if (
        memory.dStreak >= 3 ||
        recentDRate >= 0.75
    ) {
        memory.mode = "DEFEND";
        return [D, memory];
    }

    // ================================================================
    // BREAK MUTUAL DEFECTION
    // ================================================================

    /*
     * If we have been stuck in DD, test cooperation once.
     *
     * This matters against bots that:
     *   - punish temporarily
     *   - forgive
     *   - use Pavlov
     *   - use imperfect TFT
     */

    const ddCount = history
        .slice(-4)
        .filter(
            h => h.you === D && h.opponent === D
        ).length;

    if (
        ddCount >= 3 &&
        !memory.oliveUsed
    ) {
        memory.oliveUsed = true;

        return [C, memory];
    }

    // ================================================================
    // SAFE PROBE
    // ================================================================

    /*
     * Probe ONLY a nearly perfect cooperator.
     *
     * No probe against anyone already showing aggression.
     *
     * The probe is optional and randomized.
     */

    if (
        !memory.probed &&
        memory.probeArmed &&
        n >= 20 &&
        n === memory.probeRound &&
        memory.oppD === 0 &&
        recentD === 0
    ) {
        memory.probed = true;
        memory.mode = "PROBE_WAIT";

        return [D, memory];
    }

    // ================================================================
    // NORMAL RESPONSE
    // ================================================================

    if (lastOpp === D) {

        const previousOpp =
            n >= 2
                ? history[n - 2].opponent
                : C;

        /*
         * Isolated defection:
         *
         * DON'T instantly retaliate.
         *
         * This protects cooperation with:
         *   - noisy bots
         *   - forgiving bots
         *   - Pavlov
         *   - TF2T
         */

        if (previousOpp === C) {
            return [C, memory];
        }

        /*
         * Repeated D:
         *
         * One proportional retaliation.
         */
        return [D, memory];
    }

    // ================================================================
    // NORMAL COOPERATION
    // ================================================================

    return [C, memory];
}