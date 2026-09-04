// Reactant V1 (v1pflrapnu22r3jyt4bf) mean=1.554282074804136 stats={'battles': 1960, 'losses': 1308, 'wins': 29}
export default function bot({ history, memory }) {
    if (history.length === 0) return ["C", { streak: 0 }]

    memory = memory ?? { streak: 0 }
    const lastOpponentMove = history.at(-1).opponent

    if (lastOpponentMove === "D") {
        memory.streak += 1
    } else {
        memory.streak = 0
    }

    // Forgive a single defection (could be noise), but retaliate on repeats
    const move = memory.streak >= 2 ? "D" : "C"

    return [move, memory]
}