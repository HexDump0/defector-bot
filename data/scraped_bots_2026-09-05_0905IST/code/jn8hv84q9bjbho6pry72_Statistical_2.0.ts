// Statistical🤓2.0 (jn8hv84q9bjbho6pry72) mean=1.52094520063474 stats={'battles': 5550, 'losses': 2742, 'wins': 468}
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