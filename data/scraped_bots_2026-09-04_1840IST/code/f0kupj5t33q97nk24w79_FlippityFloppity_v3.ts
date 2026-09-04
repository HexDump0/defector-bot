// FlippityFloppity v3 (f0kupj5t33q97nk24w79) mean=1.1684634279696686 stats={'battles': 2911, 'losses': 1731, 'wins': 908}
// flipflopper
export default function bot({ history, memory }) {
    let move
    if (memory == null || memory == "D") {
        move = "C"
    } else {
        move = "D"
    }
    memory = move

    return [move, memory]
}