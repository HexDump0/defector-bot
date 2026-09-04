// Forgiver (t64h1skjo3c8vodma84b) mean=1.321721791926103 stats={'battles': 1148, 'losses': 0, 'wins': 793}
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