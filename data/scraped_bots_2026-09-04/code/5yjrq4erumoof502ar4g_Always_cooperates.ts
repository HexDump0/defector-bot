// Always cooperates (5yjrq4erumoof502ar4g) mean=1.1883221344375754 stats={'battles': 4807, 'losses': 3181, 'wins': 478}
export default function bot() {
	const move = "C" // Cooperate on every move
	const memory = null // We don't need to remember anything

	return [move, memory] // Move must come 1st, then memory 2nd
}