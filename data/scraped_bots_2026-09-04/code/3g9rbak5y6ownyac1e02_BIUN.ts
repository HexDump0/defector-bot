// BIUN (3g9rbak5y6ownyac1e02) mean=1.569547772027621 stats={'battles': 2287, 'losses': 1268, 'wins': 721}
/**
 * APEX — Adaptive Prisoner's EXpert
 *
 * Strategy architecture (in order of priority):
 *
 * 1. OPPONENT CLASSIFICATION
 *    Continuously classify the opponent into one of several archetypes
 *    based on their behavioural fingerprint in the history so far.
 *
 * 2. ADAPTIVE RESPONSE
 *    Choose a response mode tailored to the detected archetype:
 *    - ALWAYS_DEFECT  → mirror defect (cut losses, earn mutual 1/round)
 *    - ALWAYS_COOPERATE → cooperate almost always; probe once mid-game
 *    - TFT / REACTIVE → cooperate; use Gradual punishment on defections
 *    - RANDOM         → use Tit-for-Two-Tats (forgive single noise)
 *    - GRUDGER        → never provoke; full cooperation
 *    - UNKNOWN        → Gradual (best robust default)
 *
 * 3. GRADUAL PUNISHMENT (core engine)
 *    After the n-th cumulative defection by the opponent, punish with
 *    exactly n consecutive defections, then calm down with 2 cooperations.
 *    This is proportional, memorable, and de-escalating — the strategy
 *    that consistently beats TFT in large-scale tournaments.
 *
 * 4. ENDGAME DEFECTION
 *    In the final ~5 rounds (estimated from round count ≥ 100), defect
 *    against cooperating opponents to squeeze extra points. Risky against
 *    reactive opponents, so only trigger against confirmed cooperators
 *    or once we're deep enough that retaliation cost is minimal.
 *
 * 5. PROBE EXPLOITATION
 *    Against confirmed always-cooperators, defect once around round 30
 *    to test if they retaliate. If they don't, defect regularly (every
 *    ~5 rounds) for free points. If they do, switch to TFT mode.
 */

export default function bot({ history, memory }) {
  // ── Initialise memory ──────────────────────────────────────────────
  memory = memory ?? {
    // Gradual state
    punishRemaining: 0,   // how many more D's to fire in current punishment
    calmRemaining: 0,     // how many more C's in the calming period after punishment
    defectCount: 0,       // total opponent defections seen (= punishment severity counter)

    // Opponent classification
    opponentType: "UNKNOWN", // ALWAYS_DEFECT | ALWAYS_COOPERATE | TFT | RANDOM | GRUDGER | UNKNOWN
    classifiedAt: -1,        // round at which we locked in a classification

    // Exploitation state (for ALWAYS_COOPERATE)
    probedAt: -1,            // round we sent our exploit probe
    exploitMode: false,      // currently exploiting a confirmed pushover

    // Endgame
    endgameStarted: false,
  }

  const round = history.length

  // ── First move: always cooperate ───────────────────────────────────
  if (round === 0) return ["C", memory]

  // ── Update defect count from last opponent move ────────────────────
  const lastOpp = history[round - 1].opponent
  if (lastOpp === "D") memory.defectCount++

  // ── Opponent classification ────────────────────────────────────────
  // Re-classify every 10 rounds until we're confident, then lock in.
  if (round >= 5 && (memory.classifiedAt === -1 || round % 10 === 0) && round <= 80) {
    memory.opponentType = classify(history, round)
    memory.classifiedAt = round
  }

  // ── Endgame logic ─────────────────────────────────────────────────
  // The game runs "at least 100 rounds". We don't know the exact end,
  // so we start being opportunistic from round 95 onward only against
  // opponents who we believe won't retaliate (always-cooperate / grudger
  // already triggered). Against reactive opponents, no endgame defection
  // — the retaliation cost outweighs the gain with unknown rounds left.
  if (round >= 95 && !memory.endgameStarted) {
    if (memory.opponentType === "ALWAYS_COOPERATE" || memory.exploitMode) {
      memory.endgameStarted = true
    }
  }
  if (memory.endgameStarted) {
    return ["D", memory]
  }

  // ── Response by archetype ──────────────────────────────────────────
  const type = memory.opponentType

  // ALWAYS_DEFECT: lock into mutual defection — 1 pt each is better than
  // being exploited for 0 pts while they get 3.
  if (type === "ALWAYS_DEFECT") {
    return ["D", memory]
  }

  // ALWAYS_COOPERATE: mostly cooperate, probe once at round ~30 to confirm,
  // then exploit every few rounds.
  if (type === "ALWAYS_COOPERATE") {
    if (memory.probedAt === -1 && round >= 20) {
      // Send a probe defection
      memory.probedAt = round
      return ["D", memory]
    }
    if (memory.probedAt > 0) {
      const roundsAfterProbe = round - memory.probedAt
      if (roundsAfterProbe >= 2) {
        // Check if they retaliated after our probe
        const theyRetaliated = history
          .slice(memory.probedAt)
          .some(m => m.opponent === "D")
        if (!theyRetaliated) {
          // Confirmed pushover: exploit every 4 rounds
          memory.exploitMode = true
          if (round % 4 === 0) return ["D", memory]
          return ["C", memory]
        } else {
          // They punished — reclassify away from ALWAYS_COOPERATE
          memory.opponentType = "TFT"
          memory.probedAt = -1
        }
      }
    }
    return ["C", memory]
  }

  // RANDOM: use Tit-for-Two-Tats — only defect after two consecutive
  // opponent defections. This avoids noise-triggered escalation spirals.
  if (type === "RANDOM") {
    if (round >= 2) {
      const lastTwo = history.slice(-2)
      if (lastTwo[0].opponent === "D" && lastTwo[1].opponent === "D") {
        return ["D", memory]
      }
    }
    return ["C", memory]
  }

  // GRUDGER: they'll never forgive a single defection, so never defect.
  if (type === "GRUDGER") {
    return ["C", memory]
  }

  // TFT / UNKNOWN / REACTIVE: use Gradual strategy.
  // Gradual cooperates by default; when the opponent has defected n times
  // total, it punishes with n defections then 2 calming cooperations.
  return gradual(lastOpp, memory)
}

// ── Gradual engine ────────────────────────────────────────────────────
function gradual(lastOpp, memory) {
  // Currently in punishment phase
  if (memory.punishRemaining > 0) {
    memory.punishRemaining--
    return ["D", memory]
  }

  // Currently in calming phase
  if (memory.calmRemaining > 0) {
    memory.calmRemaining--
    return ["C", memory]
  }

  // Opponent just defected — start punishment
  if (lastOpp === "D") {
    // Punish with defectCount defections (already incremented above)
    const punishes = memory.defectCount
    if (punishes <= 1) {
      // First defection: punish once, then calm with 2 C's
      memory.punishRemaining = 0   // we fire this round as the 1st punch
      memory.calmRemaining = 2
      return ["D", memory]
    } else {
      // n-th defection: punish n times (first punch now, n-1 deferred)
      memory.punishRemaining = punishes - 1
      memory.calmRemaining = 2
      return ["D", memory]
    }
  }

  // Default: cooperate
  return ["C", memory]
}

// ── Classifier ────────────────────────────────────────────────────────
function classify(history, round) {
  const oppMoves = history.map(m => m.opponent)
  const total = oppMoves.length
  const dCount = oppMoves.filter(m => m === "D").length
  const cCount = total - dCount
  const defectRate = dCount / total

  // Always defect: ≥90% D's
  if (defectRate >= 0.9) return "ALWAYS_DEFECT"

  // Always cooperate: ≥95% C's
  if (defectRate <= 0.05) return "ALWAYS_COOPERATE"

  // Grudger: cooperated solidly until a single defection, then only D's
  // Signature: all C's up to some point, then all D's
  if (dCount >= 3 && cCount >= 3) {
    const firstD = oppMoves.indexOf("D")
    if (firstD >= 3) {
      const afterFirstD = oppMoves.slice(firstD)
      const allDefectAfter = afterFirstD.every(m => m === "D")
      if (allDefectAfter && afterFirstD.length >= 3) return "GRUDGER"
    }
  }

  // TFT / reactive: opponent's move correlates with OUR previous move
  if (round >= 10) {
    let tftMatches = 0
    for (let i = 1; i < history.length; i++) {
      if (history[i].opponent === history[i - 1].you) tftMatches++
    }
    const tftRate = tftMatches / (history.length - 1)
    if (tftRate >= 0.8) return "TFT"
  }

  // Random: high variance, no strong pattern
  if (defectRate > 0.25 && defectRate < 0.75) {
    // Check for alternating or random patterns
    let switches = 0
    for (let i = 1; i < oppMoves.length; i++) {
      if (oppMoves[i] !== oppMoves[i - 1]) switches++
    }
    const switchRate = switches / (oppMoves.length - 1)
    if (switchRate > 0.35) return "RANDOM"
  }

  return "UNKNOWN"
}