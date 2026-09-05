// apex predator v2 (r7q6io44k179bne2l6o1) mean=1.6837639487237614 stats={'battles': 3886, 'losses': 1733, 'wins': 619}
const T = 3 // temptation  (I defect, they cooperate)
const R = 2 // reward      (both cooperate)
const P = 1 // punishment  (both defect)
const S = 0 // sucker      (I cooperate, they defect)

const WINDOW = 40 // rounds of recent behaviour we judge them on
const RESPONSIVE_MARGIN = 0.1 // extra confidence before trusting them
const OLIVE_SCHEDULE = [3, 10, 25, 60, 130, 280, 600] // mutual-D streaks at which we try C
const TEST_SCHEDULE = [3, 12, 40, 120, 300] // coop streaks at which we test if they punish
const MAX_FAILED_TESTS = 2 // stop testing once they've retaliated twice
const MAX_OLIVES_VS_PURE_DEFECTOR = 2 // if they've never cooperated, don't keep paying
const PROBE_ROUND = 0 // >0 = defect once at that round to sniff always-C bots (risky vs grudgers; off by default)

function smooth(c, n) {
  return (c + 0.5) / (n + 1)
}

function isUnconditionalPeriodic(history) {
  const L = 20
  const t = history.length
  if (t < 12) return false
  const from = Math.max(0, t - L)
  let sawC = false, sawD = false
  for (let i = from; i < t; i++) {
    if (history[i].opponent === "C") sawC = true
    else sawD = true
  }
  if (!(sawC && sawD)) return false // pure C / pure D handled elsewhere

  let periodic = false
  for (let p = 2; p <= 6 && !periodic; p++) {
    let ok = true, checks = 0
    for (let i = from + p; i < t; i++) {
      checks++
      if (history[i].opponent !== history[i - p].opponent) { ok = false; break }
    }
    if (ok && checks >= 8) periodic = true
  }
  if (!periodic) return false

  // Could this same sequence be tit-for-tat reacting to us? Then it's ambiguous -> not unconditional.
  for (let i = Math.max(1, from); i < t; i++) {
    if (history[i].opponent !== history[i - 1].you) return true
  }
  return false
}

function decide(history, memory) {
  const t = history.length
  if (t === 0) return ["C", memory]

  // ---------- one pass over history for the facts we need ----------
  let oppEverD = false
  let oppEverC = false
  for (let i = 0; i < t; i++) {
    if (history[i].opponent === "D") oppEverD = true
    else oppEverC = true
  }

  const last = history[t - 1]
  const prev = t >= 2 ? history[t - 2] : null

  // Opponent's move at round i is a response to OUR move at round i-1.
  // Windowed conditional cooperation rates.
  let cC = 0, nC = 0, cD = 0, nD = 0
  const start = Math.max(1, t - WINDOW)
  for (let i = start; i < t; i++) {
    const ours = history[i - 1].you
    const theirs = history[i].opponent
    if (ours === "C") { nC++; if (theirs === "C") cC++ }
    else { nD++; if (theirs === "C") cD++ }
  }
  const pC = smooth(cC, nC)
  const pD = smooth(cD, nD)

  // streaks
  let mutualDStreak = 0
  for (let i = t - 1; i >= 0 && history[i].you === "D" && history[i].opponent === "D"; i--) mutualDStreak++
  let coopStreak = 0
  for (let i = t - 1; i >= 0 && history[i].you === "C" && history[i].opponent === "C"; i--) coopStreak++

  // ---------- optional unprovoked probe ----------
  if (!oppEverD && !memory.probed && PROBE_ROUND > 0 && t === PROBE_ROUND) {
    memory.probed = true
    return ["D", memory]
  }

  const provoked = oppEverD || memory.probed === true

  // ---------- peace: they've never defected -> keep cooperating ----------
  if (!provoked) return ["C", memory]

  // ---------- 0. periodic / unconditional pattern? ----------
  // Bots like alternators (D,C,D,C…) or "C,C,D" repeaters ignore us.
  // If their recent moves follow a fixed period AND are not explained
  // by copying our moves, the best response is always D.
  if (isUnconditionalPeriodic(history)) return ["D", memory]

  // ---------- evaluate exploration bookkeeping ----------
  // A "test" = we defected during cooperation to see if they punish.
  let failedTests = 0
  for (const r of memory.tests) {
    if (r + 1 < t && history[r + 1].opponent === "D") failedTests++
  }

  // ---------- 1. exploitable? defecting beats mutual cooperation ----------
  // value of defecting forever = T*pD + P*(1-pD) ; compare with R
  const exploitThreshold = (R - P) / (T - P)
  if (nD >= 2 && pD >= exploitThreshold) {
    return ["D", memory]
  }

  // ---------- 2. responsive? cooperating beats mutual defection ----------
  const responsiveThreshold = (P - S) / (R - S) + RESPONSIVE_MARGIN
  const lastOppD = last.opponent === "D"
  const theirDWasProvoked = prev !== null && prev.you === "D"

  if (pC >= responsiveThreshold) {
    // retaliate only for UNPROVOKED defection (contrite tit-for-tat)
    if (lastOppD && !theirDWasProvoked) return ["D", memory]

    // test whether they actually punish us (bounded, backed-off)
    if (
      !lastOppD &&
      failedTests < MAX_FAILED_TESTS &&
      memory.tests.length < TEST_SCHEDULE.length &&
      coopStreak >= TEST_SCHEDULE[memory.tests.length]
    ) {
      memory.tests.push(t)
      return ["D", memory]
    }
    return ["C", memory]
  }

  // ---------- 3. unresponsive: defect, with occasional olive branch ----------
  const oliveCap = oppEverC ? OLIVE_SCHEDULE.length : MAX_OLIVES_VS_PURE_DEFECTOR
  if (
    memory.olives < oliveCap &&
    memory.olives < OLIVE_SCHEDULE.length &&
    mutualDStreak >= OLIVE_SCHEDULE[memory.olives]
  ) {
    memory.olives++
    return ["C", memory]
  }
  return ["D", memory]
}

export default function bot(state) {
  let memory = null
  try {
    const history = Array.isArray(state && state.history) ? state.history : []
    memory = state && state.memory
    if (!memory || typeof memory !== "object") memory = { olives: 0, tests: [], probed: false }
    if (typeof memory.olives !== "number") memory.olives = 0
    if (!Array.isArray(memory.tests)) memory.tests = []

    const [move, mem] = decide(history, memory)
    return [move === "C" ? "C" : "D", mem]
  } catch (e) {
    // never crash: a crash forfeits the whole battle 0:3
    return ["D", memory && typeof memory === "object" ? memory : { olives: 0, tests: [], probed: false }]
  }
}
