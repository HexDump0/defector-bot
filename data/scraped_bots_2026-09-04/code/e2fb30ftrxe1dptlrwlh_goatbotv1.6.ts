// goatbotv1.6 (e2fb30ftrxe1dptlrwlh) mean=1.7565848668765724 stats={'battles': 702, 'losses': 278, 'wins': 143}
export default function bot({ history, memory }) {
  const n = history.length
  const last = history[n - 1]

  if (n === 0) return ["C", null]

  if (memory == null) {
    memory = { mode: "observe" }
  }

  if (memory.mode === "observe") {
    if (n >= 5) {
      const opening = history.slice(0, 5).map(round => round.opponent).join("")

      if (opening === "CDCCC") memory.mode = "exploit"
      else if (opening === "DDDDD") memory.mode = "hard"
      else memory.mode = "friend"
    } else {

      if (last.opponent === "C") return ["C", memory]
      if (n >= 2 && history[n - 2].you === "D") return ["C", memory]
      return ["D", memory]
    }
  }

  if (memory.mode === "exploit" || memory.mode === "hard") {
    return ["D", memory]
  }

  if (n >= 10) {
    const recent = history.slice(-8)
    const defections = recent.reduce(
      (count, round) => count + (round.opponent === "D" ? 1 : 0),
      0,
    )
    if (defections >= 2) {
      memory.mode = "hard"
      return ["D", memory]
    }
  }

  if (last.opponent === "C") return ["C", memory]
  if (n >= 2 && history[n - 2].you === "D") return ["C", memory]
  if (last.you === "D") return ["C", memory]
  return ["D", memory]
}