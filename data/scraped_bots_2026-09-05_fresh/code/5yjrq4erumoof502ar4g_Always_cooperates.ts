// Always cooperates (5yjrq4erumoof502ar4g) mean=1.280108953442689 stats={'battles': 6268, 'losses': 4106, 'wins': 504}
export default function bot() {
	const move = "C" // Cooperate on every move
	const memory = null // We don't need to remember anything

	return [move, memory] // Move must come 1st, then memory 2nd
}