// Meow v2.1 (0tzq24x3owc6b51lqc4j) mean=1.6349500029529398 stats={'battles': 70, 'losses': 27, 'wins': 1}
// Let's first make tit for tat thingy then modify it ig :D

export default function bot( {history} ) {
    const n = history.length

    // yah let's start with cooperate
    if (n === 0) return ["C", null]

    const move = history[n-1].opponent
    return [move, null]
}