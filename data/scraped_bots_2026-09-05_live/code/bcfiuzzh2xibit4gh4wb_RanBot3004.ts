// RanBot3004 (bcfiuzzh2xibit4gh4wb) mean=1.2375826892149504 stats={'battles': 377, 'losses': 245, 'wins': 51}
export default function bot({ history, memory }) {
    if (!memory) {
        memory = {};
    }
    if (history.length === 0) {
        return ['C', memory];
    }
    let opponentOnlyCooperate = true;
    let opponentOnlyDeflect = true;
    let opponentCooperations = 0;
    let opponentDeflections = 0;
    history.forEach(match => {
        if (match.opponent == 'D') {
            opponentOnlyCooperate = false;
            opponentDeflections += 1;
        }
        if (match.opponent == 'C') {
            opponentOnlyDeflect = false;
            opponentCooperations += 1;
        }
    });
    let coopChance = opponentCooperations / history.length;
    let deflChance = opponentDeflections / history.length;
    if (opponentOnlyCooperate || opponentOnlyDeflect) {
        return ['D', memory];
    }
    return ['C', memory];
}
//# sourceMappingURL=bot1.js.map