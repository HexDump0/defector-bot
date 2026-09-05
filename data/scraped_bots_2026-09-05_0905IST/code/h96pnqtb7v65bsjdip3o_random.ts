// random (h96pnqtb7v65bsjdip3o) mean=1.1569344427415633 stats={'battles': 6809, 'losses': 4213, 'wins': 2226}
const outcomes: Move[] = ["C", "D"]

const bot: Bot = function(state) {
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]

    return [outcome, null];
}

export default bot;