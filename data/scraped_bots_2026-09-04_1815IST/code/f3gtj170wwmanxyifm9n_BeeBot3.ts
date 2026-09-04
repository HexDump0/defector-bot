// BeeBot3 (f3gtj170wwmanxyifm9n) mean=1.4145089084323796 stats={'battles': 4345, 'losses': 0, 'wins': 1660}
export default function bot({ history }) {
    const lastOpponentMove = history.at(-1)?.opponent
    const secondLastOpponentMove = history.at(-2)?.opponent
    const thirdLastOpponentMove = history.at(-3)?.opponent
    
    if (history.length === 0) {
        return ["D", null] }
    else if (lastOpponentMove === "C" &&  secondLastOpponentMove === "D" && thirdLastOpponentMove === "C") {
        return ["C",null] }
    else {
        const move = history.at(-1).opponent
        return [move,null] }
    }
