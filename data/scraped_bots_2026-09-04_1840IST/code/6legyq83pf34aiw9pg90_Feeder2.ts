// Feeder2 (6legyq83pf34aiw9pg90) mean=0 stats={'battles': 7, 'losses': 6, 'wins': 0}
export default function feed({history, memory}){
    let move
    const opp0 = history[0].opponent
    const opp1 = history[1].opponent
    const opp2 = history[2].opponent
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