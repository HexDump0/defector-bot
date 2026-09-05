// 3Blue1Brown (wcop7bnwfz4nz3e82shw) mean=1.668262102793629 stats={'battles': 125, 'losses': 48, 'wins': 2}
export default function bot({ history, memory }) {
    memory = memory ?? {}

    if (history.length === 0)
        return ["C", memory]

    const lastOpponentMove = history.at(-1)?.opponent

    return [lastOpponentMove, memory]
}