// Biun V2 (w0r8e1ld56rg7a50km4r) mean=1.2900701911148027 stats={'battles': 5422, 'losses': 0, 'wins': 3843}
const C = "C", D = "D"

// rebuild stats from full history (self-healing / first move)
function scan(history) {
  let margin = 0, oppC = 0, oppD = 0, ourC = 0, ourD = 0
  for (let i = 0; i < history.length; i++) {
    const r = history[i]
    if (!r || (r.you !== C && r.you !== D) || (r.opponent !== C && r.opponent !== D)) continue
    if (r.opponent === C) oppC++; else oppD++
    if (r.you === C) ourC++; else ourD++
    if (r.you === D && r.opponent === C) margin += 3
    else if (r.you === C && r.opponent === D) margin -= 3
  }
  return { margin, oppC, oppD, ourC, ourD }
}


export default function bot(state) {
  try {
    const out = core(state || { history: [], memory: null })
    if (Array.isArray(out) && (out[0] === C || out[0] === D)) return out
    return [D, null]
  } catch (e) {
    return [D, null] // never crash: a crash forfeits the battle 0:3
  }
}

function core({ history, memory }) {

  const n = history.length
  let m = memory
  if (!m || m.v !== 48) {
    const s = scan(history)
    let lastC = -1, margin = 0, oppC = 0
    for (let i = 0; i < n; i++) {
      if (history[i].opponent === C) { oppC++; lastC = i }
      if (history[i].you === D && history[i].opponent === C) margin += 3
      else if (history[i].you === C && history[i].opponent === D) margin -= 3
    }
    m = { v: 48, oppC, lastC, margin, afterOurC: [0, 0], afterOurD: [0, 0],
          cadence: false, cadPos: 0, cGaps: [] }
  }
  if (n === 0) return [D, m]
  const r = history[n - 1]
  if (r.opponent === C) {
    m.oppC++
    if (m.lastC >= 0 && n - 1 - m.lastC <= 30) {
      m.cGaps.push(n - 1 - m.lastC)
      if (m.cGaps.length > 8) m.cGaps.shift()
    }
    m.lastC = n - 1
  }
  if (r.you === D && r.opponent === C) m.margin += 3
  else if (r.you === C && r.opponent === D) m.margin -= 3
  if (n >= 2) {
    const slot = history[n - 2].you === C ? m.afterOurC : m.afterOurD
    slot[1]++; if (r.opponent === C) slot[0]++
  }
  // LAW: no evidence -> never C (ties pure All-D exactly)
  if (m.oppC === 0) return [D, m]

  const pC = m.afterOurC[1] >= 5 ? m.afterOurC[0] / m.afterOurC[1] : null
  const pD = m.afterOurD[1] >= 8 ? m.afterOurD[0] / m.afterOurD[1] : null

  // reactor-cadence (same engine as VANTA law 4)
  if (m.cadence) {
    const pC2 = m.afterOurC[1] >= 6 ? m.afterOurC[0] / m.afterOurC[1] : 1
    if (m.margin < 6 || pC2 < 0.6) m.cadence = false
    else {
      if (m.cadPos < 8) { m.cadPos++; return [C, m] }
      m.cadPos = 0
      return [D, m]
    }
  } else if (pC !== null && pC >= 0.8 && (pD ?? 1) < 0.35 && m.margin >= 6 && m.lastC >= n - 3) {
    m.cadence = true; m.cadPos = 0
    return [C, m]
  }

  // feeding right now -> farm
  if (m.lastC === n - 1) return [D, m]

  const stalled = n - 1 - m.lastC
  const gaps = m.cGaps.slice(-6)
  const medGap = gaps.length ? gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 0
  const feederish = gaps.length >= 3 && stalled < Math.max(6, 1.5 * medGap)

  // continuous re-lure: single C whenever stalled and banked (margin >= 6)
  if (stalled >= 4 && !feederish && m.margin >= 6) return [C, m]
  return [D, m]
}
