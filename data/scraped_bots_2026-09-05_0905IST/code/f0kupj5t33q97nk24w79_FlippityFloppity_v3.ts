// FlippityFloppity v3 (f0kupj5t33q97nk24w79) mean=1.1839509064533384 stats={'battles': 5213, 'losses': 3070, 'wins': 1652}
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