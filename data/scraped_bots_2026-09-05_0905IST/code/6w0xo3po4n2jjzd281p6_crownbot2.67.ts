// crownbot2.67 (6w0xo3po4n2jjzd281p6) mean=1.7271562120266148 stats={'battles': 473, 'losses': 174, 'wins': 68}
export default function bot(state) {
  const C = "C", D = "D";
  const CFG = {
    window: 30,
    tolerate: 3,          // Extended to absorb firstbornv3.2 (3 D opening)
    coopFloor: 0.60,
    exploitFloor: 0.70,
    olives: [6, 16, 36, 80],
    maxSucker: 5,
    maxExits: 3
  };
  let hist = null;

  try {
    const raw = state && Array.isArray(state.history) ? state.history : [];
    const n = raw.length;
    hist = raw;
    const m = loadMem(state ? state.memory : null);
    
    // Round 0: Always start with Cooperation
    if (n === 0) return out(C, m);

    /* ---------- 1. Anti-Detective & Sherlock Holmes Detection ---------- */
    // Sherlock Holmes plays C, D, C on rounds 0, 1, 2
    if (n === 1 && opp(0) === C) return out(C, m);
    if (n === 2 && opp(0) === C && opp(1) === D) {
      m.isSherlock = 1;
      return out(D, m); // Retaliate to force Sherlock into REACTIF mode
    }

    /* ---------- single statistics pass ---------- */
    let oppD = 0, myD = 0, cAfterC = 0, nAfterC = 0, cAfterD = 0, nAfterD = 0;
    let sucker = 0, recPts = 0, recN = 0;
    const w0 = n - CFG.window > 0 ? n - CFG.window : 0;
    const s0 = n - 10 > 0 ? n - 10 : 0;

    for (let i = 0; i < n; i++) {
      const o = opp(i), y = you(i);
      if (o === D) oppD++;
      if (y === D) myD++;
      if (i >= w0 && i > 0) {
        if (you(i - 1) === C) { nAfterC++; if (o === C) cAfterC++; }
        else { nAfterD++; if (o === C) cAfterD++; }
      }
      if (i >= s0) {
        if (y === C && o === D) sucker++;
        recN++; recPts += y === C ? (o === C ? 2 : 0) : (o === C ? 3 : 1);
      }
    }

    let mutualD = 0;
    for (let i = n - 1; i >= 0 && you(i) === D && opp(i) === D; i--) mutualD++;
    let mutualC = 0;
    for (let i = n - 1; i >= 0 && you(i) === C && opp(i) === C; i--) mutualC++;
    
    if (mutualC >= 6) m.olive = 0; // Restore olive budget when peaceful
    
    const pC = (cAfterC + 0.5) / (nAfterC + 1);
    const pD = (cAfterD + 0.5) / (nAfterD + 1);
    const oppRate = oppD / n;
    const lastOpp = opp(n - 1), lastYou = you(n - 1);
    const prevYou = n >= 2 ? you(n - 2) : C;

    /* ---------- 2. Late-Game Betrayal Detection (defecthalfv2 Counter) ---------- */
    // Detect bots that played friendly for 20+ rounds then permanently switched to Defect
    if (n > 25 && m.lateBetrayal !== 1) {
      let earlyCoop = 0;
      for (let i = 0; i < 20; i++) if (opp(i) === C) earlyCoop++;
      const lateStreakD = (opp(n - 1) === D && opp(n - 2) === D && opp(n - 3) === D);
      if (earlyCoop >= 16 && lateStreakD) {
        m.lateBetrayal = 1;
      }
    }
    if (m.lateBetrayal === 1) return out(D, m); // Cancel olive branches permanently

    /* ---------- 3. Pure Defector Fast-Cutoff ---------- */
    if (oppD === n && n >= CFG.tolerate) return out(D, m);

    /* ---------- 4. Absorb Hostile Openings (firstbornv3.2 Counter) ---------- */
    // Handles up to 3 consecutive opening defections if opponent normalizes
    if (n <= 4 && oppD === n && myD < n - 1) {
      return out(C, m); // Offer grace period for rounds 1-3
    }

    /* ---------- 5. Clean Relationship Protection ---------- */
    if (oppD === 0) return out(C, m);

    /* ---------- 6. Periodic Pattern Exploitation ---------- */
    if (isPeriodic(n)) return out(D, m);

    /* ---------- 7. Exploit Unpunished Defection ---------- */
    if (nAfterD >= 3 && pD >= CFG.exploitFloor && oppRate < 0.35 && lastYou === C) {
      return out(D, m);
    }

    /* ---------- 8. Hostile / Parasitic Classification ---------- */
    const unresponsive = nAfterC >= 4 && nAfterD >= 3 && Math.abs(pC - pD) < 0.25 && oppRate > 0.2;
    const parasitic = (nAfterC >= 4 && pC < CFG.coopFloor) || 
                      (n >= 12 && sucker >= CFG.maxSucker) || 
                      (n >= 10 && oppRate > 0.85);

    if (unresponsive || parasitic) {
      m.hard = 1;
      if (unresponsive) m.unresp = 1;
    }

    /* ---------- 9. Hard Mode Execution ---------- */
    if (m.hard) {
      if (m.oliveAt >= 0) {
        if (n < m.oliveAt + 2) return out(C, m);
        const taken = opp(m.oliveAt + 1) === C;
        m.oliveAt = -1;
        if (taken && m.exits < CFG.maxExits) {
          m.exits++; m.hard = 0; m.unresp = 0; m.olive = 0;
          return out(C, m);
        }
      }
      const need = 3;
      if (m.exits < CFG.maxExits && n >= need) {
        let allC = true;
        for (let i = n - need; i < n; i++) if (opp(i) !== C) { allC = false; break; }
        if (allC) {
          m.exits++; m.hard = 0; m.unresp = 0; m.olive = 0;
          return out(C, m);
        }
      }
      if (!m.unresp && m.exits < CFG.maxExits && oppD < n &&
          m.olive < CFG.olives.length && mutualD >= CFG.olives[m.olive]) {
        m.olive++; m.oliveAt = n;
        return out(C, m);
      }
      return out(D, m);
    }

    /* ---------- 10. Strict Contrite Tit-For-Tat Core ---------- */
    if (lastOpp === D) {
      if (lastYou === D) {
        if (m.olive < CFG.olives.length && mutualD >= CFG.olives[m.olive]) {
          m.olive++;
          return out(C, m);
        }
        return out(D, m);
      }
      if (prevYou === D) return out(C, m); // Contrite response
      return out(D, m);
    }
    return out(C, m);

  } catch (err) {
    try {
      const hs = state && state.history;
      const l = hs && hs.length ? hs[hs.length - 1] : null;
      const v = l && l.opponent;
      return [typeof v === "string" && v.charAt(0).toUpperCase() === "D" ? "D" : "C",
              (state && state.memory) || null];
    } catch (e2) { return ["C", null]; }
  }

  /* Helper functions */
  function isPeriodic(n) {
    if (n < 12) return false;
    const from = n - 20 > 0 ? n - 20 : 0;
    let sawC = false, sawD = false;
    for (let i = from; i < n; i++) { if (opp(i) === C) sawC = true; else sawD = true; }
    if (!sawC || !sawD) return false;
    for (let p = 2; p <= 6; p++) {
      let ok = true, checks = 0;
      for (let i = from + p; i < n; i++) {
        checks++;
        if (opp(i) !== opp(i - p)) { ok = false; break; }
      }
      if (!ok || checks < 8) continue;
      for (let i = from > 1 ? from : 1; i < n; i++) if (opp(i) !== you(i - 1)) return true;
    }
    return false;
  }

  function mv(v) {
    if (v === D) return D;
    if (typeof v === "string" && v.length && v.charAt(0).toUpperCase() === "D") return D;
    return C;
  }
  function you(i) { const r = hist[i]; return r ? mv(r.you) : C; }
  function opp(i) { const r = hist[i]; return r ? mv(r.opponent) : C; }

  function loadMem(raw) {
    const base = { olive: 0, hard: 0, unresp: 0, exits: 0, oliveAt: -1, lateBetrayal: 0, isSherlock: 0 };
    if (raw && typeof raw === "object") {
      for (const k of ["olive", "hard", "unresp", "exits", "oliveAt", "lateBetrayal", "isSherlock"]) {
        const v = raw[k];
        if (typeof v === "number" && isFinite(v)) base[k] = v;
      }
      if (base.olive < 0) base.olive = 0;
    }
    return base;
  }
  function out(move, m) { return [move === D ? D : C, m]; }
}