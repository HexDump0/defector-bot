// LukeStarterBot (zp892mn9vcklnapgwot5) mean=1.5990625037594928 stats={'battles': 896, 'losses': 265, 'wins': 255}
export default function bot({ history, memory }) {
    memory = memory ?? { opponentDefected: false }
    if (history.lenght === 0)
        return ["C", null]

    const lastOpponentMove = history.at(-1)?.opponent
    if (lastOpponentMove === "D")
        memory.opponentDefected = true

    const move = memory.opponentDefected ? "D" : "C"
    return [move, memory]
}