// AntiBot (u0qfqej1mb9b39aatk48) mean=1.631890063044859 stats={'battles': 4470, 'losses': 2095, 'wins': 110}
export default function bot({ history }) {
  if (history.length === 0) return ["C", null];

  const { you, opponent } = history[history.length - 1];

  if (you === opponent) {
    return [you, null];
  }

  return [you === "C" ? "D" : "C", null];
}