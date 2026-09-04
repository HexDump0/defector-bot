// Always cooperates (5yjrq4erumoof502ar4g) mean=1.218088500589307 stats={'battles': 6024, 'losses': 3966, 'wins': 501}
export default function bot() {
	const move = "C" // Cooperate on every move
	const memory = null // We don't need to remember anything

	return [move, memory] // Move must come 1st, then memory 2nd
}