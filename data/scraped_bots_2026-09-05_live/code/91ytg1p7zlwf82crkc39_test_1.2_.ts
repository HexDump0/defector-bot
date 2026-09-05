// test(1.2) (91ytg1p7zlwf82crkc39) mean=1.5479372966581384 stats={'battles': 1209, 'losses': 721, 'wins': 21}
export default function ({ history }) {
    if (history.length < 2) 
        return ["C", null]

    let oneback = history[history.length - 1].opponent
    let twoback = history[history.length - 2].opponent

    if (oneback === "D" && twoback === "D")
        return ["D", null]; 
    else
        return ["C", null]; 
    
}

