// Firstborn v2 (o7fd7lwb11nj1w1yfw5b) mean=1.2566043645888831 stats={'battles': 5525, 'losses': 0, 'wins': 3909}
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