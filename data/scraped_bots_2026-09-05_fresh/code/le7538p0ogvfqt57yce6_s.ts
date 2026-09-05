// s (le7538p0ogvfqt57yce6) mean=1.5149301993465178 stats={'battles': 247, 'losses': 133, 'wins': 1}
export default function bot(state) {
  try {
    const history = state?.history || [];
    const t = history.length;

    // 1. Initialize robust memory
    let mem = state?.memory;
    if (!mem || typeof mem !== "object") {
      mem = {
        // Transition tracking for deeper analysis
        transitions: {
          CC: { c: 2, d: 0 }, // Heavily bias initial trust (start optimistic)
          CD: { c: 1, d: 1 },
          DC: { c: 2, d: 0 },
          DD: { c: 0, d: 2 }
        },
        consecutiveOpponentDefects: 0,
        totalOpponentDefects: 0,
        mode: "TRUST" // 'TRUST', 'DEFEND'
      };
    }

    // Round 0: Always trust and cooperate
    if (t === 0) return ["C", mem];

    const lastRound = history[t - 1];
    const oppLast = lastRound.opponent;
    const youLast = lastRound.you;
    const prevRound = t >= 2 ? history[t - 2] : null;

    // Track statistics
    if (oppLast === "D") {
      mem.consecutiveOpponentDefects++;
      mem.totalOpponentDefects++;
    } else {
      mem.consecutiveOpponentDefects = 0;
    }

    // 2. Incremental Transition Update
    if (prevRound) {
      const prevStateKey = prevRound.you + prevRound.opponent;
      if (mem.transitions[prevStateKey]) {
        if (oppLast === "C") mem.transitions[prevStateKey].c++;
        else mem.transitions[prevStateKey].d++;
      }
    }

    // 3. Absolute Hard Defense: Only trigger if they are overwhelmingly malicious (>75% defection over 30+ rounds)
    if (t > 30 && (mem.totalOpponentDefects / t) > 0.75) {
      mem.mode = "DEFEND";
    }

    if (mem.mode === "DEFEND") {
      return ["D", mem];
    }

    // --- TRUST-FIRST DECISION ENGINE ---

    // Rule A: If they cooperated last round, ALWAYS cooperate back. 
    // This locks in the R=2 mutual reward immediately.
    if (oppLast === "C") {
      return ["C", mem];
    }

    // Rule B: If they defected last round, check WHY.
    // Was their defection a justified retaliation to our own defection? 
    // (i.e., we played D last round, so them playing D now is normal).
    const wasDefectionJustified = (youLast === "D");

    if (wasDefectionJustified) {
      // They are just playing Tit-for-Tat in response to us. 
      // Do NOT hold a grudge. Forgive them and cooperate to restore the R=2 peace!
      return ["C", mem];
    }

    // Rule C: If their defection was UNPROVOKED (we played C and they betrayed us),
    // then retaliate with D to protect ourselves.
    if (mem.consecutiveOpponentDefects === 1) {
      return ["D", mem];
    }

    // Rule D: Death Spiral Breaker (Generous Forgiveness)
    // If we've been locked in mutual defection for 3 rounds, throw an olive branch.
    if (mem.consecutiveOpponentDefects >= 3) {
      mem.consecutiveOpponentDefects = 0; // Reset counter for next cycle
      return ["C", mem];
    }

    // Default fallback: Match their move
    return [oppLast, mem];

  } catch (error) {
    // Bulletproof failsafe
    return ["D", state?.memory || { mode: "DEFEND" }];
  }
}