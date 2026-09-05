// A Rational Individual (cnfw6hbqwcpgd6umf8jw) mean=1.5616176395262014 stats={'battles': 7967, 'losses': 4109, 'wins': 2587}
export default state => {
    const memory = state.memory;
    const history = state.history;

    const opp_d_stats = history.filter(h => h.opponent === "D").length;
    const opp_c_stats = history.filter(h => h.opponent === "C").length;

    const total_stats = opp_d_stats + opp_c_stats;

    if (total_stats === 0) {
        return ["C", memory]; //Start of friendly
    }

    if (opp_c_stats / total_stats > 0.5 && (total_stats < 100 || Math.random() < 0.5 )) { //At the end of the game, hammer out defects so that we get just a few more points than the opponent
        return ["C", memory]; //Cooperate if opponent cooperates more than 50% of the time
    }

    return ["D", memory]; //Fallback to defection
}