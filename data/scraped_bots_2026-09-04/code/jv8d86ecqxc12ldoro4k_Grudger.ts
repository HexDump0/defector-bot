// Grudger (jv8d86ecqxc12ldoro4k) mean=1.6107035146109794 stats={'battles': 4935, 'losses': 1445, 'wins': 1921}
export default function bot({ history, memory }) {
	// If memory is null, set it to an object with a property to track whether the opponent has defected
	memory = memory ?? { opponentDefected: false }

	// Get the opponent's last move
	const lastOpponentMove = history.at(-1)?.opponent
	if (lastOpponentMove === "D")
		memory.opponentDefected = true

	const move = memory.opponentDefected ? "D" : "C"
	return [move, memory]
}