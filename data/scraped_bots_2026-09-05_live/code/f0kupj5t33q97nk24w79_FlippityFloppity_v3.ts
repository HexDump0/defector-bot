// FlippityFloppity v3 (f0kupj5t33q97nk24w79) mean=1.1608304275582446 stats={'battles': 6675, 'losses': 3921, 'wins': 2131}
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