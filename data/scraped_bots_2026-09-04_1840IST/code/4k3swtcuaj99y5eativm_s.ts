// s (4k3swtcuaj99y5eativm) mean=1.6776958601654528 stats={'battles': 6, 'losses': 0, 'wins': 5}
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