// Always cooperates (5yjrq4erumoof502ar4g) mean=1.175724609769779 stats={'battles': 9890, 'losses': 6240, 'wins': 551}
export default function bot() {
	const move = "C" // Cooperate on every move
	const memory = null // We don't need to remember anything

	return [move, memory] // Move must come 1st, then memory 2nd
}