// 3Blue1Brown (wcop7bnwfz4nz3e82shw) mean=1.6956395627116894 stats={'battles': 3603, 'losses': 1366, 'wins': 50}
export default function bot({ history, memory }) {
    memory = memory ?? {}

    if (history.length === 0)
        return ["C", memory]

    const lastOpponentMove = history.at(-1)?.opponent

    return [lastOpponentMove, memory]
}