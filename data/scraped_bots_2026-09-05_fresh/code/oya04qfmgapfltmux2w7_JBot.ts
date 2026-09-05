// JBot (oya04qfmgapfltmux2w7) mean=1.6478974175453402 stats={'battles': 4699, 'losses': 1601, 'wins': 1128}
export default function ({ history, memory }) {
  let m = memory || { bad: 0 };
  
  if (!history.length) {
    return ["C", m];
  }

  let oppLast = history[history.length - 1].opponent;
  if (oppLast === "D") m.bad++;

  return [m.bad / history.length > 0.25 ? "D" : oppLast, m];
}