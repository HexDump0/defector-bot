// MoveStealer v2 (mnsgarr4ce4nxhy4y6f1) mean=1.6259815955567933 stats={'battles': 2371, 'losses': 1065, 'wins': 32}
export default function bot({ history, memory }) {

  if (history.length === 0) {
    return ["C", memory]; 
  }

  const lastOpponentMove = history[history.length - 1].opponent;
  const move = lastOpponentMove;

  return [move, memory];
}