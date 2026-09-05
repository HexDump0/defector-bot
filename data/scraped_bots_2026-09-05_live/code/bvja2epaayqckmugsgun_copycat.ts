// copycat (bvja2epaayqckmugsgun) mean=0 stats={'battles': 9969, 'losses': 9959, 'wins': 0}
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
  return [state.history.slice(0,-1).opponent, null]
}