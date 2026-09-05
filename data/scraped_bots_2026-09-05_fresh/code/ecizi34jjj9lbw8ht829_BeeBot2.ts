// BeeBot2 (ecizi34jjj9lbw8ht829) mean=1.5108753266542783 stats={'battles': 4794, 'losses': 0, 'wins': 1903}
export default function bot({ history }) {
    if (history.length === 0) {
        return ["D", null] }
    else {
        const move = history.at(-1).opponent
        return [move,null] }
    }