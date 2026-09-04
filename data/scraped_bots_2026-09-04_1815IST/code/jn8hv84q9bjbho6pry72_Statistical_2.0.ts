// Statistical🤓2.0 (jn8hv84q9bjbho6pry72) mean=1.4759614712967346 stats={'battles': 3204, 'losses': 1675, 'wins': 329}
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