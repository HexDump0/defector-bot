// Dilemma-Bot-Hackclub (ffud06li3hxnz0ovmddi) mean=1.6063670550089766 stats={'battles': 238, 'losses': 81, 'wins': 44}
export default function bot({ history, memory }) {

    if (memory === null) {
        memory = { betrayals: 0 };
    }

    if (history.length === 0) {
        return ["C", memory];
    }

    const lastOpponentMove = history.at(-1).opponent;

    if (lastOpponentMove === "D") {
        memory.betrayals += 1;
    }

    if (memory.betrayals >= 3) {
        return ["D", memory];
    }

    return [lastOpponentMove, memory];
}