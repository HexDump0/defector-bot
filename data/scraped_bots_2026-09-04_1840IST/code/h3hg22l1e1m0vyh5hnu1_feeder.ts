// feeder (h3hg22l1e1m0vyh5hnu1) mean=1.3593480047640065 stats={'battles': 34, 'losses': 0, 'wins': 29}
export default function feed({history, memory}){
    let move
    const opp0 = history[0]
    const opp1 = history[1]
    const opp2 = history[2]
    if (history.length == 0){
        move = "D"
    }
    else if(history.length == 1){
        move = "C"
    }
    else if(history.length == 2){
        move = "C"
    }

    if(opp0 === "C"&& opp1 === "D"&& opp2 === "C"){
        move = "C"
    }
    else{
        move = "D"
    }
    return [move, memory]
}