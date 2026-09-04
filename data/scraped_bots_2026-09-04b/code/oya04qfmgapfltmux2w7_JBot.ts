// JBot (oya04qfmgapfltmux2w7) mean=1.6069792386676556 stats={'battles': 3909, 'losses': 1367, 'wins': 962}
export default function ({ history, memory }) {
  let m = memory || { bad: 0 };
  
  if (!history.length) {
    return ["C", m];
  }

  let oppLast = history[history.length - 1].opponent;
  if (oppLast === "D") m.bad++;

  return [m.bad / history.length > 0.25 ? "D" : oppLast, m];
}