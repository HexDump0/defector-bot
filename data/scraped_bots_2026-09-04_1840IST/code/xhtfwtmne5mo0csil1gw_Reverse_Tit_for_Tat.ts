// Reverse Tit for Tat (xhtfwtmne5mo0csil1gw) mean=0.9617022738035541 stats={'battles': 5886, 'losses': 3603, 'wins': 2032}
export default function bot({ history }) {
  if (history.length === 0)
    return ["D", null] // Defect on the first round
  const move = history.at(-1).opponent
  if (move == "C")
    return ["D", null]
  else
    return ["C", null]
}