// JBot-2 (1fdpnl26bnpocvjuut68) mean=1.4930014215133731 stats={'battles': 1173, 'losses': 293, 'wins': 695}
export default function bot({ history, memory }) {
  const round = history.length;
  let state = memory || {
    oppDefects: 0,
    myDefects: 0,
    streakD: 0,
    mode: "normal"
  };

  if (round === 0) {
    return ["C", state];
  }

  const last = history[round - 1];

  if (last.opponent === "D") {
    state.oppDefects++;
    state.streakD++;
  } else {
    state.streakD = 0;
  }

  if (last.you === "D") {
    state.myDefects++;
  }

  // anti-defect bots
  if (state.streakD >= 4) {
    state.mode = "defensive";
    return ["D", state];
  }

  if (state.mode === "defensive") {
    if (round % 8 === 0 && Math.random() < 0.2) {
      return ["C", state];
    }
    return ["D", state];
  }

  // anti-cooperate bots
  if (round >= 6 && state.oppDefects === 0) {
    return ["D", state];
  }

  // anti-cyclic bots
  if (round >= 10 && isPeriodic(history)) {
    return ["D", state];
  }

  // tit-4-tat
  if (last.opponent === "D") {
    const forgiveRate = round > 50 ? 0.2 : 0.1;
    if (last.you === "D" && Math.random() < forgiveRate) {
      return ["C", state];
    }
    return ["D", state];
  }

  return ["C", state];
}

function isPeriodic(history) {
  const recent = history.slice(-8).map(r => r.opponent);
  const hasC = recent.includes("C");
  const hasD = recent.includes("D");

  if (!hasC || !hasD) return false;

  for (let cycle = 2; cycle <= 4; cycle++) {
    let match = true;
    for (let i = cycle; i < recent.length; i++) {
      if (recent[i] !== recent[i - cycle]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}