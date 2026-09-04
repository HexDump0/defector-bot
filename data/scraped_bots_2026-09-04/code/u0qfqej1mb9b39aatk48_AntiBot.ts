// AntiBot (u0qfqej1mb9b39aatk48) mean=1.6238441910291925 stats={'battles': 3294, 'losses': 1581, 'wins': 99}
export default function bot({ history }) {
  if (history.length === 0) return ["C", null];

  const { you, opponent } = history[history.length - 1];

  if (you === opponent) {
    return [you, null];
  }

  return [you === "C" ? "D" : "C", null];
}