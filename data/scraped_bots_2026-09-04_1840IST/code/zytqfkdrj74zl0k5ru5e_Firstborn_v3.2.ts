// Firstborn v3.2 (zytqfkdrj74zl0k5ru5e) mean=1.2587734559375594 stats={'battles': 3265, 'losses': 0, 'wins': 2205}
export default function({history, mem}){
    let hasdefected=false;
    const N = history.length;
    if(N<3){ return ["D", null]}
    if(N == 2 && history[0].opponent=="C" && history[2].opponent=="C") {return ["C", null]}
    for(let i = 2; i<N; i++){
        if(history[i].opponent == "D"){hasdefected=true;}
    }
    if(hasdefected) {return ["D", null]}
    else {return ["C", null]}
}