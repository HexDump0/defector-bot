// Reactant V1 (v1pflrapnu22r3jyt4bf) mean=1.5919140224065451 stats={'battles': 859, 'losses': 577, 'wins': 12}
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