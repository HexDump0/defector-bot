// FlippityFloppity v3 (f0kupj5t33q97nk24w79) mean=1.2052519480758124 stats={'battles': 2333, 'losses': 1368, 'wins': 746}
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