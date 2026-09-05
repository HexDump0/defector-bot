// RanBot3003 (q13jnl8k1jlxfq3c1d58) mean=1.1827085762426122 stats={'battles': 389, 'losses': 241, 'wins': 129}
export default function bot({ history, memory }) {
    if (!memory) {
        memory = {};
    }
    if (history.length === 0) {
        return ['C', memory];
    }
    let opponentOnlyCooperate = true;
    let opponentOnlyDeflect = true;
    history.forEach(match => {
        if (match.opponent == 'D') {
            opponentOnlyCooperate = false;
        }
        if (match.opponent == 'C') {
            opponentOnlyDeflect = false;
        }
    });
    if (opponentOnlyCooperate || opponentOnlyDeflect) {
        return ['D', memory];
    }
    if (Math.random() >= 0.5) {
        return ['C', memory];
    }
    else {
        return ['D', memory];
    }
}
//# sourceMappingURL=bot1.js.map