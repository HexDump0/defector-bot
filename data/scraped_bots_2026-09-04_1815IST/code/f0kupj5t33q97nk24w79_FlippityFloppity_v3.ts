// FlippityFloppity v3 (f0kupj5t33q97nk24w79) mean=1.195237118184329 stats={'battles': 2884, 'losses': 1713, 'wins': 901}
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