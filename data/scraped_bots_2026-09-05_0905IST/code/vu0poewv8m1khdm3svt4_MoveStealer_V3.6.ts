// MoveStealer V3.6 (vu0poewv8m1khdm3svt4) mean=1.6528457679089135 stats={'battles': 669, 'losses': 320, 'wins': 9}
export default function bot({ history, memory }) {

  if (history.length < 6) {
    return ["C", memory]; 
  }

  const lastOpponentMove = history[history.length - 5].opponent;
  const move = lastOpponentMove;

  return [move, memory];
}