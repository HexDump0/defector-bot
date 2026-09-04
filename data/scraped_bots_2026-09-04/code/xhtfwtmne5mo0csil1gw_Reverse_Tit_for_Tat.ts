// Reverse Tit for Tat (xhtfwtmne5mo0csil1gw) mean=0.9985485853029549 stats={'battles': 4750, 'losses': 2856, 'wins': 1709}
export default function bot({ history }) {
  if (history.length === 0)
    return ["D", null] // Defect on the first round
  const move = history.at(-1).opponent
  if (move == "C")
    return ["D", null]
  else
    return ["C", null]
}