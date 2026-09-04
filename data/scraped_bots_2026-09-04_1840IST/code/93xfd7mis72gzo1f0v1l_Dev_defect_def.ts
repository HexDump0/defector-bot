// Dev defect def (93xfd7mis72gzo1f0v1l) mean=1.2500845324793108 stats={'battles': 4220, 'losses': 0, 'wins': 2837}
// "C" represents cooperation, "D" represents defection.
type Move = "C" | "D"
// A match has 2 moves, 1 by you and 1 by your opponent.
type Match = {
you: Move
opponent: Move
}
// You can put anything you want in memory, or nothing at all.
type Memory = unknown
type State = {
history: Match[] // Every round so far
memory: Memory // Whatever you saved to your memory last round
}
// A bot looks at its existing state (the history and its memory), and outputs its next move and an updated memory.
export default function bot(state: State): [Move, Memory] {
  return ["D", null]
}