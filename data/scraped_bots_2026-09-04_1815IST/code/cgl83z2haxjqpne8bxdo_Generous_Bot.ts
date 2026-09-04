// Generous Bot (cgl83z2haxjqpne8bxdo) mean=0.6028474576271187 stats={'battles': 10, 'losses': 7, 'wins': 3}
export default function bot({ history, memory }) {
    const currentRound = history.length

    // if (currentRound==0) return ["C", null]
    const handshake = ["C", "D", "D", "C"]

    if (memory == null) {
        memory = {
            status: "handshake"
        }
    }

    if (memory.status === "handshake") {
        if (currentRound > 0) {
            const lastOppMove = history.at(-1).opponent
            const expMove = handshake[currentRound - 1]

            if (lastOppMove !== expMove) {
                memory.status = "enemy"
            }
            else if (currentRound === handshake.length) {
                memory.status = "ally"
            }
        }

        if (memory.status === "handshake") {
            const move = handshake[currentRound]
            return [move, memory]
        }
    }

    if (memory.status === "ally") {
        return ["C", memory]
    }

    if (memory.status === "enemy") {
        const lastOppMove = history.at(-1).opponent

        if (lastOppMove === "C") {
            return ["C", memory]
        }
        else {
            const forgive = Math.random() < 0.1
            if (forgive) {
                const move = "C"
            }
            else {
                const move = "D"
            }
            return [move, memory]
        }
    }
}