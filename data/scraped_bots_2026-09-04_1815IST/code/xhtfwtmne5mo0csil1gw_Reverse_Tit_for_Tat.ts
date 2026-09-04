// Reverse Tit for Tat (xhtfwtmne5mo0csil1gw) mean=0.933865293476842 stats={'battles': 5860, 'losses': 3592, 'wins': 2019}
export default function bot({ history }) {
  if (history.length === 0)
    return ["D", null] // Defect on the first round
  const move = history.at(-1).opponent
  if (move == "C")
    return ["D", null]
  else
    return ["C", null]
}