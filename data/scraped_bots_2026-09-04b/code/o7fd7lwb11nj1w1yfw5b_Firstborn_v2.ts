// Firstborn v2 (o7fd7lwb11nj1w1yfw5b) mean=1.2405308187380744 stats={'battles': 2713, 'losses': 0, 'wins': 1794}
export default function({history, mem}){
    let hasdefected=false;
    const N = history.length;
    if(N<=3){ return ["D", null]}
    for(let i = 0; i<N; i++){
        if(history[i].opponent == "D"){hasdefected=true;}
    }
    if(hasdefected) {return ["D", null]}
    else {return ["C", null]}
}