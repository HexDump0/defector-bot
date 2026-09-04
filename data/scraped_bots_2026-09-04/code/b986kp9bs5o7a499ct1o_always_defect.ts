// always defect (b986kp9bs5o7a499ct1o) mean=1.2423773807065033 stats={'battles': 4799, 'losses': 0, 'wins': 3624}
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