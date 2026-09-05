// Reactant V3.5.1 (i3jowq5t7qcgzj0gk79f) mean=1.7083921379545464 stats={'battles': 2728, 'losses': 1559, 'wins': 41}
//     Reactant V3.5.1 bot by Elio A.

// TODO
// Add less predictibility        DONE


export default function bot({ history, memory }) {

    if (history.length === 0) return ["C", { Dstreak: 0 , Cstreak: 0, olives : 2, betrayLock: false}] // default starting move

    memory = memory ?? { Dstreak: 0, Cstreak: 0, olives : 3, betrayLock: false } // basic null check

    const lastOpponentMove = history.at(-1).opponent

    if (lastOpponentMove === "D") {
        memory.Dstreak += 1
    } else {
        memory.Dstreak = 0
    }
    if (lastOpponentMove === "C") {
        memory.Cstreak += 1
    } else {
        memory.Cstreak = 0
    }
    if (memory.betrayLock) {
        return ["D", memory]
    }
    // offer an olive branch up to 3 times
    const round = history.length
    if (memory.Dstreak >= 2 && (round === 7 || round === 19) && memory.olives > 0) {
        memory.olives = memory.olives - 1
        return ["C", memory]
    }
    //if (memory.Cstreak >= 5 && Math.random() * 10 > 9) {
    //    memory.olives = memory.olives - 1
    //    memory.betrayLock = true
    //    return ["D", memory]
    //}
    const move = memory.Dstreak >= 2 ? "D" : "C"
    return [move, memory]
}