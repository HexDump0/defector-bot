// random (h96pnqtb7v65bsjdip3o) mean=1.1918945031478627 stats={'battles': 4391, 'losses': 2789, 'wins': 1400}
const outcomes: Move[] = ["C", "D"]

const bot: Bot = function(state) {
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]

    return [outcome, null];
}

export default bot;