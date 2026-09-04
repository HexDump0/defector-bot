// random (h96pnqtb7v65bsjdip3o) mean=1.1081871264259784 stats={'battles': 3219, 'losses': 2032, 'wins': 1043}
const outcomes: Move[] = ["C", "D"]

const bot: Bot = function(state) {
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]

    return [outcome, null];
}

export default bot;