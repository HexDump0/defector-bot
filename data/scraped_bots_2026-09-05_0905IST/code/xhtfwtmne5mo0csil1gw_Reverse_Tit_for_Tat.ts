// Reverse Tit for Tat (xhtfwtmne5mo0csil1gw) mean=0.7990473368324549 stats={'battles': 8251, 'losses': 5042, 'wins': 2794}
export default function bot({ history }) {
  if (history.length === 0)
    return ["D", null] // Defect on the first round
  const move = history.at(-1).opponent
  if (move == "C")
    return ["D", null]
  else
    return ["C", null]
}