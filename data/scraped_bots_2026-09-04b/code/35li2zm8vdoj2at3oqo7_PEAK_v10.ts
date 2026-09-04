// PEAK v10 (35li2zm8vdoj2at3oqo7) mean=1.5308016458078797 stats={'battles': 562, 'losses': 294, 'wins': 156}
/**
 * PEAK v10
 *
 * Adaptive behavioral strategy.
 *
 * Priorities:
 *   1. Protect cooperation.
 *   2. Detect hard/aggressive opponents quickly.
 *   3. Avoid predictable opening signatures.
 *   4. Use a bounded information probe.
 *   5. Distinguish passive, reactive, and unforgiving opponents
 *      from their responses.
 *   6. Exploit only when retaliation evidence is weak.
 *   7. Escape mutual-D loops.
 *
 * Special adversarial consideration:
 *   Designed and benchmarked against the supplied
 *   CDCCC / DDDDD / 2-in-last-8 "hard" bot.
 */

export default function bot({ history, memory }) {
    const n = history.length;
    const C = "C";
    const D = "D";

    // ================================================================
    // INITIALIZATION
    // ================================================================

    if (memory == null) {
        memory = {
            mode: "NORMAL",

            // Randomized information probe.
            //
            // The probe is deliberately late enough to collect evidence,
            // but early enough to matter in 50/100-round matches.
            probeRound: 6 + Math.floor(Math.random() * 4), // 6..9

            probed: false,

            // Probe state
            probeStep: 0,
            probeRetaliated: false,

            // Behavioral statistics
            oppD: 0,
            oppC: 0,

            // Recent aggression
            dStreak: 0,

            // Number of times our D was followed by opponent D
            retaliationCount: 0,

            // Exploitation
            exploitLeft: 0,
            exploitPhase: Math.floor(Math.random() * 5),

            // Mutual D protection
            ddStreak: 0,
            oliveUsed: false,

            // Special signature detection
            bounceScore: 0,

            // Once we have evidence the supplied adversarial pattern
            // is present, avoid voluntarily feeding it additional D's.
            adversarial: false
        };
    }

    // ================================================================
    // OPENING
    // ================================================================

    if (n === 0) {
        return [C, memory];
    }

    const last = history[n - 1];
    const lastOpp = last.opponent;
    const lastMe = last.you;

    // ================================================================
    // UPDATE STATISTICS
    // ================================================================

    if (lastOpp === D) {
        memory.oppD++;
        memory.dStreak++;
    } else {
        memory.oppC++;
        memory.dStreak = 0;
    }

    if (lastMe === D && lastOpp === D) {
        memory.retaliationCount++;
    }

    if (lastMe === D && lastOpp === D) {
        memory.ddStreak++;
    } else {
        memory.ddStreak = 0;
    }

    // ================================================================
    // EARLY HOSTILITY DETECTION
    // ================================================================

    if (n <= 6) {
        const early = history.slice(0, Math.min(5, n));

        const earlyD =
            early.filter(
                h => h.opponent === D
            ).length;

        /*
         * Three defections in the first five are strong evidence of
         * Always-D / aggressive classifier behavior.
         */
        if (earlyD >= 3) {
            memory.adversarial = true;
        }
    }

    // ================================================================
    // HARD DEFENSE
    // ================================================================

    if (memory.mode === "DEFEND") {

        /*
         * Re-enter cooperation only after a genuine cooling period.
         */
        if (
            lastOpp === C &&
            n >= 3 &&
            history.slice(-3).every(
                h => h.opponent === C
            )
        ) {
            memory.mode = "NORMAL";
            memory.dStreak = 0;

            return [C, memory];
        }

        return [D, memory];
    }

    // ================================================================
    // RECOVERY
    // ================================================================

    if (memory.mode === "RECOVER") {

        if (lastOpp === C) {
            memory.recoverLeft =
                (memory.recoverLeft || 0) + 1;

            if (memory.recoverLeft >= 2) {
                memory.mode = "NORMAL";
                memory.recoverLeft = 0;
            }

            return [C, memory];
        }

        memory.recoverLeft =
            (memory.recoverLeft || 0) + 1;

        /*
         * Persistent refusal to cooperate means stop donating points.
         */
        if (memory.recoverLeft >= 3) {
            memory.mode = "DEFEND";
            memory.recoverLeft = 0;

            return [D, memory];
        }

        return [C, memory];
    }

    // ================================================================
    // EXPLOITATION
    // ================================================================

    if (memory.mode === "EXPLOIT") {

        /*
         * Any retaliation immediately ends exploitation.
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
         * Exploit sparsely rather than permanently defecting.
         *
         * This keeps the expected cost low against delayed retaliation.
         */
        const phase =
            (n + memory.exploitPhase) % 5;

        if (phase === 0) {
            memory.exploitLeft--;

            return [D, memory];
        }

        return [C, memory];
    }

    // ================================================================
    // PROBE RESPONSE
    // ================================================================

    if (memory.mode === "PROBE_WAIT") {

        /*
         * Our previous move was the information probe.
         *
         * Immediate D:
         *     reactive / unforgiving -> recover
         *
         * C:
         *     passive / forgiving -> continue observation
         */

        if (lastOpp === D) {
            memory.probeRetaliated = true;
            memory.mode = "RECOVER";
            memory.recoverLeft = 0;

            return [C, memory];
        }

        /*
         * Probe was forgiven.
         *
         * Instead of immediately sending another D, cooperate once.
         * This avoids instantly creating the classic retaliation spiral.
         */
        memory.mode = "PROBE_CONFIRM";

        return [C, memory];
    }

    // ================================================================
    // PROBE CONFIRMATION
    // ================================================================

    if (memory.mode === "PROBE_CONFIRM") {

        /*
         * Opponent retaliated during the confirmation window.
         */
        if (lastOpp === D) {
            memory.mode = "RECOVER";
            memory.recoverLeft = 0;

            return [C, memory];
        }

        /*
         * We have now seen:
         *
         *     D -> C
         *     C -> C
         *
         * That's strong evidence that the opponent is permissive.
         *
         * But don't exploit if they have shown any natural aggression.
         */
        if (
            memory.oppD === 0 &&
            memory.retaliationCount === 0
        ) {
            memory.mode = "EXPLOIT";
            memory.exploitLeft = 6;

            return [D, memory];
        }

        memory.mode = "NORMAL";

        return [C, memory];
    }

    // ================================================================
    // SUPPLIED-BOT / REACTIVE BOUNCE DETECTION
    // ================================================================

    /*
     * The supplied adversarial bot has a distinctive reaction:
     *
     *     our D
     *       ↓
     *     opponent C
     *       ↓
     *     our D
     *       ↓
     *     opponent D
     *
     * This resembles a forgiving/reactive bot initially, so we do NOT
     * assume exploitability from one C response.
     *
     * If this bounce repeatedly appears, mark the opponent reactive.
     */

    if (n >= 2) {
        const a = history[n - 1];
        const b = history[n - 2];

        if (
            b.you === D &&
            b.opponent === C &&
            a.you === D &&
            a.opponent === D
        ) {
            memory.bounceScore++;

            /*
             * Don't feed a reactive bounce-loop additional defections.
             */
            if (memory.bounceScore >= 1) {
                memory.adversarial = true;
            }
        }
    }

    // ================================================================
    // SUPPLIED-BOT HARD THRESHOLD AVOIDANCE
    // ================================================================

    /*
     * If we already know the opponent reacts strongly to D,
     * do not make repeated exploratory defections.
     */
    if (memory.adversarial) {

        /*
         * Persistent opponent D -> defensive response.
         */
        if (
            memory.dStreak >= 3 ||
            (
                n >= 6 &&
                memory.oppD / n >= 0.60
            )
        ) {
            memory.mode = "DEFEND";
            return [D, memory];
        }

        /*
         * Otherwise stay cooperative.
         */
        return [C, memory];
    }

    // ================================================================
    // MUTUAL DEFECTION ESCAPE
    // ================================================================

    if (memory.ddStreak >= 3) {

        /*
         * One cooperation attempt.
         *
         * This prevents an accidental reactive loop from becoming
         * hundreds of rounds of pointless 1-point exchanges.
         */
        if (!memory.oliveUsed) {
            memory.oliveUsed = true;
            return [C, memory];
        }

        /*
         * If the opponent still refuses, accept mutual D economics.
         */
        memory.mode = "DEFEND";

        return [D, memory];
    }

    // ================================================================
    // LATE AGGRESSION DETECTION
    // ================================================================

    const window = Math.min(8, n);
    const recent = history.slice(-window);

    const recentD =
        recent.filter(
            h => h.opponent === D
        ).length;

    /*
     * Persistent aggression.
     *
     * We use several signals rather than a single arbitrary threshold.
     */
    if (
        (window >= 5 && recentD >= 4) ||
        memory.dStreak >= 3
    ) {
        memory.mode = "DEFEND";

        return [D, memory];
    }

    // ================================================================
    // INFORMATION PROBE
    // ================================================================

    /*
     * Probe a completely clean opponent.
     *
     * The probe is intentionally randomized between 6 and 9 rounds.
     *
     * This is important against the supplied bot because it prevents
     * a fixed round signature while still allowing short-match value.
     */
    if (
        !memory.probed &&
        n === memory.probeRound &&
        memory.oppD === 0
    ) {
        memory.probed = true;
        memory.mode = "PROBE_WAIT";
        memory.probeStep = 1;

        return [D, memory];
    }

    // ================================================================
    // NORMAL BEHAVIOUR
    // ================================================================

    if (lastOpp === D) {

        const previousOpp =
            n >= 2
                ? history[n - 2].opponent
                : C;

        /*
         * Forgive isolated D.
         *
         * This is crucial for noisy / forgiving opponents.
         */
        if (previousOpp === C) {
            return [C, memory];
        }

        /*
         * Second consecutive D:
         * punish once.
         */
        return [D, memory];
    }

    // ================================================================
    // DEFAULT COOPERATION
    // ================================================================

    return [C, memory];
}