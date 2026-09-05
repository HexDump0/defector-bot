// random (h96pnqtb7v65bsjdip3o) mean=1.0742237855973853 stats={'battles': 8268, 'losses': 5109, 'wins': 2697}
const outcomes: Move[] = ["C", "D"]

const bot: Bot = function(state) {
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]

    return [outcome, null];
}

export default bot;