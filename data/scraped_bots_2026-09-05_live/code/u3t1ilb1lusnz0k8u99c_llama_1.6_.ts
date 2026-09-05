// llama(1.6) (u3t1ilb1lusnz0k8u99c) mean=1.575356990832885 stats={'battles': 1192, 'losses': 176, 'wins': 407}
export default function ({ history }) {
    if (history.length < 2) 
        return ["D", null]

    let oneback = history[history.length - 1].opponent
    let twoback = history[history.length - 2].opponent

    if (oneback === "D" && twoback === "D")
        return ["D", null]; 
    else
        return ["C", null]; 
    
}

