// AntiBot (u0qfqej1mb9b39aatk48) mean=1.6919515844997874 stats={'battles': 4718, 'losses': 2189, 'wins': 117}
export default function bot({ history }) {
  if (history.length === 0) return ["C", null];

  const { you, opponent } = history[history.length - 1];

  if (you === opponent) {
    return [you, null];
  }

  return [you === "C" ? "D" : "C", null];
}