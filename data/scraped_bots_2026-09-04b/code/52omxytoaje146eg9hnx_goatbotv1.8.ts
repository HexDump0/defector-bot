// goatbotv1.8 (52omxytoaje146eg9hnx) mean=1.5895182390057512 stats={'battles': 989, 'losses': 458, 'wins': 436}
export default function bot({ history, memory }) {
  const C = "C", D = "D";

  const init = () => ({
    oppC: 0,
    oppD: 0,
    score: 0,
    mode: "probe",
    punish: 0,
    exploit: 0,
    olive: 0,
    testIdx: 0,
    failedTests: 0,
    lastTestRound: -999,
    everDefected: false,
    hardLock: false,
    cooldown: 0,
    chaos: 0
  });

  try {
    memory = memory && typeof memory === "object" ? memory : init();
    const n = history.length;
    if (n === 0) return [C, memory];

    const last = history[n - 1];
    const myLast = last.you === D ? D : C;
    const oppLast = last.opponent === D ? D : C;

    if (oppLast === C) memory.oppC++;
    else memory.oppD++;

    memory.score +=
      myLast === C && oppLast === C ? 2 :
      myLast === D && oppLast === C ? 3 :
      myLast === C && oppLast === D ? 0 : 1;

    if (myLast === D) memory.everDefected = true;

    if (n >= 2) {
      const p = history[n - 2].opponent === D ? 1 : 0;
      const q = oppLast === D ? 1 : 0;
      if (p !== q) memory.chaos = Math.min(memory.chaos + 1, 100);
      else memory.chaos = Math.max(memory.chaos - 1, 0);
    }

    const total = memory.oppC + memory.oppD;
    const defRate = total ? memory.oppD / total : 0;
    const coopRate = 1 - defRate;
    const avg = memory.score / n;
    const noisy = n >= 18 && memory.chaos >= 10 && defRate > 0.2 && defRate < 0.8;

    if (memory.cooldown > 0) memory.cooldown--;
    if (memory.punish > 0) memory.punish--;

    if (n < 6) {
      const open = [C, C, D, C, C, D];
      return [open[n], memory];
    }

    let dd = 0;
    for (let i = n - 1; i >= 0 && i >= n - 10; i--) {
      if (history[i].you === D && history[i].opponent === D) dd++;
      else break;
    }

    if (
      defRate > 0.72 ||
      (n >= 20 && avg < 0.9) ||
      (noisy && defRate > 0.45)
    ) memory.hardLock = true;

    if (memory.hardLock) {
      if (coopRate > 0.52 && n % 17 === 0) return [C, memory];
      if (coopRate > 0.62 && memory.oppC > memory.oppD + 4) memory.hardLock = false;
      else return [D, memory];
    }

    if (memory.exploit > 0) {
      if (oppLast === D) memory.exploit = 0;
      else return [D, memory];
    }

    if (
      n >= 8 &&
      defRate < 0.05 &&
      memory.everDefected
    ) {
      memory.exploit = 1;
      return [D, memory];
    }

    const testSchedule = [4, 12, 30, 70, 160];
    if (
      memory.failedTests < 2 &&
      memory.testIdx < testSchedule.length &&
      n - memory.lastTestRound > 12 &&
      oppLast === C &&
      defRate < 0.35
    ) {
      const coopStreakNeeded = testSchedule[memory.testIdx];
      let cc = 0;
      for (let i = n - 1; i >= 0; i--) {
        if (history[i].you === C && history[i].opponent === C) cc++;
        else break;
      }
      if (cc >= coopStreakNeeded) {
        memory.lastTestRound = n;
        memory.testIdx++;
        memory.punish = 1;
        return [D, memory];
      }
    }

    if (n >= 2 && history[n - 2].you === D && oppLast === D) {
      memory.failedTests++;
    }

    if (dd >= 4 && memory.cooldown === 0 && defRate < 0.6) {
      memory.cooldown = 7;
      return [C, memory];
    }

    if (oppLast === D) {
      if (memory.punish > 0 && defRate < 0.55) return [C, memory];
      if (defRate > 0.55) return [D, memory];
      if (n % 3 === 0 && defRate < 0.35) return [C, memory];
      return [D, memory];
    }

    if (n >= 96) {
      if (defRate < 0.08) return [D, memory];
      if (defRate > 0.5) return [D, memory];
    }

    return [C, memory];
  } catch {
    const safe = {
      oppC: 0, oppD: 0, score: 0, mode: "probe", punish: 0, exploit: 0,
      olive: 0, testIdx: 0, failedTests: 0, lastTestRound: -999,
      everDefected: false, hardLock: true, cooldown: 0, chaos: 0
    };
    if (history && history.length) {
      const opp = history[history.length - 1].opponent === "D" ? "D" : "C";
      return [opp, safe];
    }
    return [D, safe];
  }
}