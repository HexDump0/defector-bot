// Statistical🤓 (lnpwzkmovviwy5km4vty) mean=1.039398747793669 stats={'battles': 3542, 'losses': 2399, 'wins': 986}
export default function bot({ history, memory }) {
  memory = memory ?? { weWon: false }

  if (history.length === 0) {
    return ["D", memory] // First move
  }

  const lastOpponentMove = history.at(-1)?.opponent
  const lastMove = history.at(-1)?.you

  if (lastOpponentMove === "D") {
    memory.weWon = false
  } else {
    memory.weWon = true
  }

  if (memory.weWon) {
    return [lastMove, memory]
  } else {
    const move = lastMove === "C" ? "D" : "C"
    return [move, memory]
  }
}