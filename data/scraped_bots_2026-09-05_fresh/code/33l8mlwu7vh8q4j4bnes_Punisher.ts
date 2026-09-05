// Punisher (33l8mlwu7vh8q4j4bnes) mean=1.5711780115974272 stats={'battles': 2623, 'losses': 1726, 'wins': 39}
export default function bot({ history, memory }) {
  if (history.length === 0) {
    return ["C", null];
  }
  const lastRound = history[history.length - 1];
  if (lastRound.opponent === "D") {
    const secondLastRound = history.length >= 2 ? history[history.length - 2] : null;
    if (secondLastRound && secondLastRound.opponent === "D") {
      return ["D", memory];
    }
    return ["C", memory];
  }
  return ["C", memory];
}