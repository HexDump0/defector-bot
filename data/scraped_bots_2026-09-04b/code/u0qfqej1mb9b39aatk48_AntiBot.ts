// AntiBot (u0qfqej1mb9b39aatk48) mean=1.584207963233449 stats={'battles': 3927, 'losses': 1855, 'wins': 104}
export default function bot({ history }) {
  if (history.length === 0) return ["C", null];

  const { you, opponent } = history[history.length - 1];

  if (you === opponent) {
    return [you, null];
  }

  return [you === "C" ? "D" : "C", null];
}