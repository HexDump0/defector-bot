// FlippityFloppity v3 (f0kupj5t33q97nk24w79) mean=1.1531337104580046 stats={'battles': 1689, 'losses': 957, 'wins': 568}
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