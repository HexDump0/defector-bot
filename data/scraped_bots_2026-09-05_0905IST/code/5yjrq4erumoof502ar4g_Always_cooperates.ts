// Always cooperates (5yjrq4erumoof502ar4g) mean=1.332386516371383 stats={'battles': 8400, 'losses': 5371, 'wins': 539}
export default function bot() {
	const move = "C" // Cooperate on every move
	const memory = null // We don't need to remember anything

	return [move, memory] // Move must come 1st, then memory 2nd
}