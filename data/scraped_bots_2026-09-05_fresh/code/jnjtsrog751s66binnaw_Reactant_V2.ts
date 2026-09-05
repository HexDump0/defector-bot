// Reactant V2 (jnjtsrog751s66binnaw) mean=1.599328257322589 stats={'battles': 2250, 'losses': 1498, 'wins': 39}
export default function bot({ history, memory }) {
    if (history.length === 0) return ["C", { streak: 0 }]

    memory = memory ?? { streak: 0 }
    const lastOpponentMove = history.at(-1).opponent

    if (lastOpponentMove === "D") {
        memory.streak += 1
    } else {
        memory.streak = 0
    }

    // Every 10 rounds while locked in conflict, offer an olive branch
    const round = history.length
    if (memory.streak >= 2 && round % 10 === 0) {
        return ["C", memory]
    }

    const move = memory.streak >= 2 ? "D" : "C"
    return [move, memory]
}