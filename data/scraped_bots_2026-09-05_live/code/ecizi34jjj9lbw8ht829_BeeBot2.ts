// BeeBot2 (ecizi34jjj9lbw8ht829) mean=1.55871810483837 stats={'battles': 8275, 'losses': 0, 'wins': 3569}
export default function bot({ history }) {
    if (history.length === 0) {
        return ["D", null] }
    else {
        const move = history.at(-1).opponent
        return [move,null] }
    }