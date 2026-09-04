// Grudger (jv8d86ecqxc12ldoro4k) mean=1.6433206181139315 stats={'battles': 6116, 'losses': 1759, 'wins': 2297}
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