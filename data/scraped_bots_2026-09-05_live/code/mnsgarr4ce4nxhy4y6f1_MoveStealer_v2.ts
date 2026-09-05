// MoveStealer v2 (mnsgarr4ce4nxhy4y6f1) mean=1.6965216991464185 stats={'battles': 6167, 'losses': 2490, 'wins': 91}
export default function bot({ history, memory }) {

  if (history.length === 0) {
    return ["C", memory]; 
  }

  const lastOpponentMove = history[history.length - 1].opponent;
  const move = lastOpponentMove;

  return [move, memory];
}