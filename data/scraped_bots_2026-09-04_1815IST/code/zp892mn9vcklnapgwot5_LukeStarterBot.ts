// LukeStarterBot (zp892mn9vcklnapgwot5) mean=1.6212444771288965 stats={'battles': 871, 'losses': 260, 'wins': 245}
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