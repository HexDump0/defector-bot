// Veritasium (zjam7ea5lx6kyimozblh) mean=1.727650063840763 stats={'battles': 3607, 'losses': 1363, 'wins': 55}
export default function bot({ history, memory }) {
    memory = memory ?? {}

    if (history.length === 0)
        return ["C", memory]

    const lastOpponentMove = history.at(-1)?.opponent

    return [lastOpponentMove, memory]
}