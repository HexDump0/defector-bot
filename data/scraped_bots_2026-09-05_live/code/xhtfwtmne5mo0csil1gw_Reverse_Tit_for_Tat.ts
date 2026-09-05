// Reverse Tit for Tat (xhtfwtmne5mo0csil1gw) mean=0.7856242988911722 stats={'battles': 9654, 'losses': 5918, 'wins': 3239}
export default function bot({ history }) {
  if (history.length === 0)
    return ["D", null] // Defect on the first round
  const move = history.at(-1).opponent
  if (move == "C")
    return ["D", null]
  else
    return ["C", null]
}