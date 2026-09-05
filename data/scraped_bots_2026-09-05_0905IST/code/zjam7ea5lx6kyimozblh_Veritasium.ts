// Veritasium (zjam7ea5lx6kyimozblh) mean=1.6454594601478305 stats={'battles': 2118, 'losses': 817, 'wins': 27}
export default function bot({ history, memory }) {
    memory = memory ?? {}

    if (history.length === 0)
        return ["C", memory]

    const lastOpponentMove = history.at(-1)?.opponent

    return [lastOpponentMove, memory]
}