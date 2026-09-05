// random (h96pnqtb7v65bsjdip3o) mean=1.134903485535348 stats={'battles': 4671, 'losses': 2956, 'wins': 1498}
const outcomes: Move[] = ["C", "D"]

const bot: Bot = function(state) {
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]

    return [outcome, null];
}

export default bot;