// the thinker (4ym9xp8mrv6ijnjy7zll) mean=1.5750025214267953 stats={'battles': 4519, 'losses': 2612, 'wins': 1295}
export default function bot({history, memory}) {
    const round = history.length;
    if (round === 0) return ["C", initMemory()];
    const m = memory ?? initMemory();
    const last = history.at(-1);
    const lastOpponentMove = last.opponent;
    m.recent.push(lastOpponentMove);
    if (m.recent.length > 3) m.recent.shift();
    const shortDefectRate =
        m.recent.length > 0
            ? m.recent.filter(x => x === "D").length / m.recent.length
            : 0;
    m.coopStreak = lastOpponentMove === "C" ? m.coopStreak + 1 : 0;
    const payoff = payoffOf(last.you, last.opponent);
    m.payoffs.push(payoff);
    if (m.payoffs.length > 6) m.payoffs.shift();
    const avgPayoff = m.payoffs.reduce((a, b) => a + b, 0) / m.payoffs.length;
    if (m.testPending > 0) {
        m.testPending--;
        if (m.testPending === 0) {
            if (lastOpponentMove === "C") {
                m.confirmedSoft = true;
                m.retaliatory = false;
            } else {
                m.confirmedSoft = false;
                m.retaliatory = true;
            }
        }
    }
    const TEST_THRESHOLD = 70;
    const RETEST_THRESHOLD = 20;
    let move;
    if (m.payoffs.length >= 4 && avgPayoff <= 0.8) {
        move = "D";
        m.confirmedSoft = false;
    } else if (m.confirmedSoft) {
        if (lastOpponentMove === "D") {
            m.confirmedSoft = false;
            move = "D";
        } else {
            move = "D";
        }
    } else if (shortDefectRate >= 0.5) {
        move = lastOpponentMove === "D" ? "D" : "C";
    } else if (m.testPending === 0 && m.coopStreak >= (m.retaliatory ? RETEST_THRESHOLD : TEST_THRESHOLD)) {
        move = "D";
        m.testPending = 2;
    } else if (lastOpponentMove === "D") {
        move = Math.random() < 0.4 ? "C" : "D";
    } else {
        move = "C";
    }

	return [move, m] // Move must come 1st, then memory 2nd
}

function payoffOf(you, opp) {
    if (you === "C" && opp === "C") return 2;
    if (you === "D" && opp === "C") return 3;
    if (you === "C" && opp === "D") return 0;
    return 1;
}

function initMemory() {
    return {
        recent: [],
        coopStreak: 0,
        payoffs: [],
        confirmedSoft: false,
        retaliatory: false,
        testPending: 0
    };
}