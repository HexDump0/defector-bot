// Reverse Tit for Tat (xhtfwtmne5mo0csil1gw) mean=0.9808674665959779 stats={'battles': 6183, 'losses': 3783, 'wins': 2143}
export default function bot({ history }) {
  if (history.length === 0)
    return ["D", null] // Defect on the first round
  const move = history.at(-1).opponent
  if (move == "C")
    return ["D", null]
  else
    return ["C", null]
}