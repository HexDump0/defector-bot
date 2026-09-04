// Grudger (jv8d86ecqxc12ldoro4k) mean=1.6175064561697434 stats={'battles': 5579, 'losses': 1624, 'wins': 2139}
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