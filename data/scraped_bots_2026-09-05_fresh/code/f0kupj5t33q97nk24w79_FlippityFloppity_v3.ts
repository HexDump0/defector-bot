// FlippityFloppity v3 (f0kupj5t33q97nk24w79) mean=1.104169480868644 stats={'battles': 3173, 'losses': 1884, 'wins': 986}
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