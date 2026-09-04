// Reactant V1 (v1pflrapnu22r3jyt4bf) mean=1.5703112483693775 stats={'battles': 1986, 'losses': 1326, 'wins': 30}
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