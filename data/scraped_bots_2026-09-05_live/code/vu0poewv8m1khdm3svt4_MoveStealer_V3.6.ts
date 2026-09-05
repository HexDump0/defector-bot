// MoveStealer V3.6 (vu0poewv8m1khdm3svt4) mean=1.7015888289744854 stats={'battles': 2089, 'losses': 1054, 'wins': 34}
export default function bot({ history, memory }) {

  if (history.length < 6) {
    return ["C", memory]; 
  }

  const lastOpponentMove = history[history.length - 5].opponent;
  const move = lastOpponentMove;

  return [move, memory];
}