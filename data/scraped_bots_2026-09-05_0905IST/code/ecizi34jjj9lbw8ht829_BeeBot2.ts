// BeeBot2 (ecizi34jjj9lbw8ht829) mean=1.495491476949571 stats={'battles': 6804, 'losses': 0, 'wins': 2841}
export default function bot({ history }) {
    if (history.length === 0) {
        return ["D", null] }
    else {
        const move = history.at(-1).opponent
        return [move,null] }
    }