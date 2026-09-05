// JBot (oya04qfmgapfltmux2w7) mean=1.73349744766028 stats={'battles': 8235, 'losses': 2642, 'wins': 1636}
export default function ({ history, memory }) {
  let m = memory || { bad: 0 };
  
  if (!history.length) {
    return ["C", m];
  }

  let oppLast = history[history.length - 1].opponent;
  if (oppLast === "D") m.bad++;

  return [m.bad / history.length > 0.25 ? "D" : oppLast, m];
}