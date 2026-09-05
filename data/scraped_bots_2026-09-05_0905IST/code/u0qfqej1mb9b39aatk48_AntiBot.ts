// AntiBot (u0qfqej1mb9b39aatk48) mean=1.6948753175884457 stats={'battles': 6807, 'losses': 2978, 'wins': 151}
export default function bot({ history }) {
  if (history.length === 0) return ["C", null];

  const { you, opponent } = history[history.length - 1];

  if (you === opponent) {
    return [you, null];
  }

  return [you === "C" ? "D" : "C", null];
}