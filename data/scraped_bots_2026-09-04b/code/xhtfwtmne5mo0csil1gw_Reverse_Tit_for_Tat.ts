// Reverse Tit for Tat (xhtfwtmne5mo0csil1gw) mean=0.8007956201351323 stats={'battles': 5366, 'losses': 3280, 'wins': 1868}
export default function bot({ history }) {
  if (history.length === 0)
    return ["D", null] // Defect on the first round
  const move = history.at(-1).opponent
  if (move == "C")
    return ["D", null]
  else
    return ["C", null]
}