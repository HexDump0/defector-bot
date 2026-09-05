// MoveStealer v2 (mnsgarr4ce4nxhy4y6f1) mean=1.6270803563029068 stats={'battles': 2665, 'losses': 1176, 'wins': 36}
export default function bot({ history, memory }) {

  if (history.length === 0) {
    return ["C", memory]; 
  }

  const lastOpponentMove = history[history.length - 1].opponent;
  const move = lastOpponentMove;

  return [move, memory];
}