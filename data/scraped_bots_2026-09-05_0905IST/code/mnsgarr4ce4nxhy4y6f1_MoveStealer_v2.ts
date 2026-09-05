// MoveStealer v2 (mnsgarr4ce4nxhy4y6f1) mean=1.6669178060580685 stats={'battles': 4702, 'losses': 1955, 'wins': 75}
export default function bot({ history, memory }) {

  if (history.length === 0) {
    return ["C", memory]; 
  }

  const lastOpponentMove = history[history.length - 1].opponent;
  const move = lastOpponentMove;

  return [move, memory];
}