// MoveStealer v2 (mnsgarr4ce4nxhy4y6f1) mean=1.6268985890635737 stats={'battles': 1830, 'losses': 831, 'wins': 29}
export default function bot({ history, memory }) {

  if (history.length === 0) {
    return ["C", memory]; 
  }

  const lastOpponentMove = history[history.length - 1].opponent;
  const move = lastOpponentMove;

  return [move, memory];
}