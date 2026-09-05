// Gridger (kd1iudis7wmk8o7jizd3) mean=1.703855443262889 stats={'battles': 39, 'losses': 8, 'wins': 11}
export default function bot({history, memory}){
    memory =  memory ?? {opponentDefected: false}

    const lastOpponentMove = history.at(-1)?.opponent
    if (lastOpponentMove === "D")
        memory.opponentDefected = true
    const move = memory.opponentDefected ? "D" : "C"
    return [move, memory]
}