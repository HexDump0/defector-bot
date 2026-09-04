// AntiBot (u0qfqej1mb9b39aatk48) mean=1.6222361759871728 stats={'battles': 4445, 'losses': 2086, 'wins': 109}
export default function bot({ history }) {
  if (history.length === 0) return ["C", null];

  const { you, opponent } = history[history.length - 1];

  if (you === opponent) {
    return [you, null];
  }

  return [you === "C" ? "D" : "C", null];
}