// Defector research candidate v3 — five-round classifier with a bounded
// double-defection recovery. Optimizes mean per-battle points/round for the
// 2026-09-04 public population. Memory is constant-size and JSON-safe.
export default function bot({ history, memory }) {
  const n = history.length
  const last = history[n - 1]

  if (n === 0) return ["C", null]
  if (!memory || typeof memory !== "object") memory = { mode: "observe" }

  if (memory.mode === "observe") {
    // One public strategy opens D,D,D then becomes permanently cooperative if
    // round 3 receives C. A bounded concession captures that upside while
    // costing only one extra sucker round against unconditional defectors.
    if (
      n === 2 &&
      history[0].opponent === "D" &&
      history[1].opponent === "D"
    ) return ["C", memory]

    // D,D,C after that concession identifies opponents which cooperate in
    // response to our D. Defection is then the payoff-maximizing response.
    if (
      n === 3 &&
      history[0].opponent === "D" &&
      history[1].opponent === "D" &&
      history[2].opponent === "C"
    ) {
      memory.mode = "exploit"
      return ["D", memory]
    }

    if (n >= 5) {
      let opening = ""
      for (let i = 0; i < 5; i++) opening += history[i].opponent
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
    let defections = 0
    for (let i = n - 8; i < n; i++) {
      if (history[i].opponent === "D") defections++
    }
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
