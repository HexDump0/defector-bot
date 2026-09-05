// Meow v2.2 (c0bx66fpmc5hicym7tdw) mean=1.5010605675941948 stats={'battles': 84, 'losses': 39, 'wins': 2}
// Let's first make tit for tat thingy then modify it ig :D
// I heard another algorithm is little better with smth like tit for tat but if we not winning, we change strat

export default function bot( {history} ) {
    const n = history.length

    // yah let's start with cooperate
    if (n === 0) return ["C", null]

    const { you, opponent } = history[n-1]

    const good = (you==="D" && opponent==="C") || (you==="C" && opponent==="C")
    const move = good ? you: (you==="C" ? "D": "C")
    return [move, null]
}