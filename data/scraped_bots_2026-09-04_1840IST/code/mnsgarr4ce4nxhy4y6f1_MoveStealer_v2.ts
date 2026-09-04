// MoveStealer v2 (mnsgarr4ce4nxhy4y6f1) mean=1.6084820813134975 stats={'battles': 2396, 'losses': 1077, 'wins': 32}
export default function bot({ history, memory }) {

  if (history.length === 0) {
    return ["C", memory]; 
  }

  const lastOpponentMove = history[history.length - 1].opponent;
  const move = lastOpponentMove;

  return [move, memory];
}