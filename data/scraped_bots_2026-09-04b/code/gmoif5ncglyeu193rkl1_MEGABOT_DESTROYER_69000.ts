// MEGABOT DESTROYER 69000 (gmoif5ncglyeu193rkl1) mean=1.2158466872185845 stats={'battles': 2365, 'losses': 0, 'wins': 1559}
export default function bot({ history }) {
  if (history.length === 0) return ["D", null]

  const last = history.at(-1).opponent

  // If they defected, defect back
  if (last === "D") return ["D", null]

  // fI cooperatted twice in row, cooperate
  if (
    history.length >= 2 &&
    history.at(-2).opponent === "C"
  ) {
    return ["C", null]
  }

  // ootherwise defect
  return ["D", null]
}
// ples work hard bot