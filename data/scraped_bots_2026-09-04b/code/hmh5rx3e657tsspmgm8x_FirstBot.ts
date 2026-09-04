// FirstBot (hmh5rx3e657tsspmgm8x) mean=1.3265149364431057 stats={'battles': 2678, 'losses': 0, 'wins': 1501}
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