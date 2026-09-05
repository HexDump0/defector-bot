// Statistical🤓2.0 (jn8hv84q9bjbho6pry72) mean=1.5015968109683875 stats={'battles': 3516, 'losses': 1827, 'wins': 351}
export default function bot({ history }) {
  if (history.length === 0) {
    return ["C", null] // Start by cooperating
  }

  const { you, opponent } = history.at(-1)

  const move = opponent === "C"
    ? you                          // win → stay
    : (you === "C" ? "D" : "C")    // lose → shift

  return [move, null]
}