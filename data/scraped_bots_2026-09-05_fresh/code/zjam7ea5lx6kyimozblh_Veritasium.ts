// Veritasium (zjam7ea5lx6kyimozblh) mean=1.6818479263757369 stats={'battles': 102, 'losses': 34, 'wins': 1}
export default function bot({ history, memory }) {
    memory = memory ?? {}

    if (history.length === 0)
        return ["C", memory]

    const lastOpponentMove = history.at(-1)?.opponent

    return [lastOpponentMove, memory]
}