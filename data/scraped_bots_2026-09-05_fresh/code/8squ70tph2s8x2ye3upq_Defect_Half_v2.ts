// Defect Half v2 (8squ70tph2s8x2ye3upq) mean=1.4533302061339881 stats={'battles': 4603, 'losses': 2263, 'wins': 2049}
export default (state: State): [Move, Memory] => {
    const memory: Memory = state.memory;
    const history: Match[]  = state.history;

    const count = history.length;

    if (count > 2 && history.filter(h => h.opponent === "D").length > (count * 0.9)) {
        return ["D", memory];  //defect against mostly defecting opponents
    }
    if (count > 2 && history[0].opponent === "C" && history[1].opponent === "D" && history[2].opponent === "C") {
        return ["D", memory]; // Combat sherlock holmes bot by detecting its test sequence and defecting in response. This is a specific counter to the "sherlock holmes" bot that tests for cooperation, defection, cooperation in the first three rounds.
    }

    if (count < 60 - Math.floor(Math.random() * 5)) {
        return ["C", memory]; //Start of friendly
    } else {
        return ["D", memory]; //Fallback to defection
    }
}