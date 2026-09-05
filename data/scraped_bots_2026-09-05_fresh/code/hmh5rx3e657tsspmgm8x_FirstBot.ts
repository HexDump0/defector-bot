// FirstBot (hmh5rx3e657tsspmgm8x) mean=1.3167289216175178 stats={'battles': 3446, 'losses': 0, 'wins': 1969}
export default function({history, mem}){
    let hasdefected=false;
    const N = history.length;
    if(N==0){ return ["D", null]}
    for(let i = 0; i<N; i++){
        if(history[i].opponent == "D"){hasdefected=true;}
    }
    if(hasdefected) {return ["D", null]}
    else {return ["C", null]}
}