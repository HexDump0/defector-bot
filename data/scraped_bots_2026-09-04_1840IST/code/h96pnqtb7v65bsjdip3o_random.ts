// random (h96pnqtb7v65bsjdip3o) mean=1.1880781352132477 stats={'battles': 4411, 'losses': 2805, 'wins': 1404}
const outcomes: Move[] = ["C", "D"]

const bot: Bot = function(state) {
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]

    return [outcome, null];
}

export default bot;