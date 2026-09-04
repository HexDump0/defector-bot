// the thinker v2 (gn66dhad6osgbedjdeb5) mean=1.5831144523371148 stats={'battles': 4442, 'losses': 2809, 'wins': 92}
export default function bot({ history, memory }) {
    const round = history.length;
    if (round === 0) return ["C", initMemory()];
    const m = memory ?? initMemory();
    const last = history.at(-1);
    m.everCooperated = m.everCooperated || last.opponent === "C";
    const move = last.opponent === "D"
        ? (Math.random() < 0.12 ? "C" : "D")
        : "C";
    return [move, m];
}

function initMemory() {
    return { everCooperated: false };
}