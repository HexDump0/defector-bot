// MoveStealer v2 (mnsgarr4ce4nxhy4y6f1) mean=1.5900905844172277 stats={'battles': 1204, 'losses': 575, 'wins': 18}
export default function bot({ history, memory }) {

  if (history.length === 0) {
    return ["C", memory]; 
  }

  const lastOpponentMove = history[history.length - 1].opponent;
  const move = lastOpponentMove;

  return [move, memory];
}