// FirstBot (hmh5rx3e657tsspmgm8x) mean=1.3647240849386446 stats={'battles': 5526, 'losses': 0, 'wins': 3289}
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