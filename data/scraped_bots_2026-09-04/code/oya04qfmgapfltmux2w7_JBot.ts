// JBot (oya04qfmgapfltmux2w7) mean=1.5987411331711814 stats={'battles': 3247, 'losses': 1176, 'wins': 810}
export default function ({ history, memory }) {
  let m = memory || { bad: 0 };
  
  if (!history.length) {
    return ["C", m];
  }

  let oppLast = history[history.length - 1].opponent;
  if (oppLast === "D") m.bad++;

  return [m.bad / history.length > 0.25 ? "D" : oppLast, m];
}