// Forgiver (t64h1skjo3c8vodma84b) mean=1.2882107274746668 stats={'battles': 1796, 'losses': 0, 'wins': 1223}
export default function bot({ history, memory }) {
  if (history.length === 0) {
    return ["D", null];
  }
  const lastRound = history[history.length - 1];
  if (lastRound.opponent === "C") {
    const secondLastRound = history.length >= 2 ? history[history.length - 2] : null;
    if (secondLastRound && secondLastRound.opponent === "C") {
      return ["C", memory];
    }
    return ["D", memory];
  }
  return ["D", memory];
}