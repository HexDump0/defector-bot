// Reactant V2 (jnjtsrog751s66binnaw) mean=1.6226107546180508 stats={'battles': 1971, 'losses': 1312, 'wins': 34}
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