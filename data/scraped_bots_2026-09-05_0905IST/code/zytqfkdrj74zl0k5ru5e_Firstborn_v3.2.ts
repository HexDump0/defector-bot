// Firstborn v3.2 (zytqfkdrj74zl0k5ru5e) mean=1.3190024736535064 stats={'battles': 5445, 'losses': 0, 'wins': 3863}
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