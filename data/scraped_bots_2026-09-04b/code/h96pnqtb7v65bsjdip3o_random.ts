// random (h96pnqtb7v65bsjdip3o) mean=1.1365932851053315 stats={'battles': 3876, 'losses': 2462, 'wins': 1239}
const outcomes: Move[] = ["C", "D"]

const bot: Bot = function(state) {
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]

    return [outcome, null];
}

export default bot;