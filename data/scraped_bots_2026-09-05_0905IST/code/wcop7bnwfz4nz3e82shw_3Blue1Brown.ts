// 3Blue1Brown (wcop7bnwfz4nz3e82shw) mean=1.6725598793269012 stats={'battles': 2151, 'losses': 826, 'wins': 25}
export default function bot({ history, memory }) {
    memory = memory ?? {}

    if (history.length === 0)
        return ["C", memory]

    const lastOpponentMove = history.at(-1)?.opponent

    return [lastOpponentMove, memory]
}