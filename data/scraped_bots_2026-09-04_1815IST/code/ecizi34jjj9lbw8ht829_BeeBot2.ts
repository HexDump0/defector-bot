// BeeBot2 (ecizi34jjj9lbw8ht829) mean=1.480090308115418 stats={'battles': 4479, 'losses': 0, 'wins': 1765}
export default function bot({ history }) {
    if (history.length === 0) {
        return ["D", null] }
    else {
        const move = history.at(-1).opponent
        return [move,null] }
    }