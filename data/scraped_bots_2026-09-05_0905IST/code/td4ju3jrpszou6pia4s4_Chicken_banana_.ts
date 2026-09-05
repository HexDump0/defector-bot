// Chicken banana 🐔 🍌 (td4ju3jrpszou6pia4s4) mean=1.5561396144862838 stats={'battles': 2497, 'losses': 1515, 'wins': 553}
export default function bot({ history, memory }) {
    const n = history.length;
    
    // Initialize memory
    if (n === 0) {
        return ["C", { 
            phase: "normal", 
            probed: false, 
            apologized: 0, 
            cooperateStreak: 0 
        }];
    }

    memory = memory || {};
    memory.phase = memory.phase || "normal";
    memory.probed = memory.probed || false;
    memory.apologized = memory.apologized || 0;
    memory.cooperateStreak = memory.cooperateStreak || 0;

    const last = history[n - 1];
    const lastOpp = last.opponent;

    // Update cooperation streak
    if (lastOpp === "C") {
        memory.cooperateStreak++;
    } else {
        memory.cooperateStreak = 0;
    }

    // 1. Apology Mode (Recover from failed probe/exploit)
    if (memory.apologized > 0) {
        memory.apologized--;
        return ["C", memory];
    }

    // 2. Exploit Mode (Opponent allowed us to defect)
    if (memory.phase === "exploit") {
        if (lastOpp === "D") {
            // They retaliated. Apologize and exit exploit.
            memory.phase = "normal";
            memory.apologized = 2;
            return ["C", memory];
        } else {
            // Continue exploiting
            return ["D", memory];
        }
    }

    // 3. Aggression Detection (Early Rounds)
    if (n <= 3) {
        if (n === 1 && lastOpp === "D") return ["D", memory];
        if (n === 2) {
            if (history[0].opponent === "D" && history[1].opponent === "D") {
                memory.phase = "punish";
                return ["D", memory];
            }
        }
    }
    
    // Check for high early defection rate (e.g., Firstborn)
    if (n === 5) {
        let defects = 0;
        for (let i = 0; i < 5; i++) if (history[i].opponent === "D") defects++;
        if (defects >= 3) {
            memory.phase = "punish";
            return ["D", memory];
        }
    }

    // 4. Probe Logic
    if (!memory.probed && n >= 12 && memory.cooperateStreak >= 12) {
        memory.probed = true;
        memory.phase = "exploit_test";
        return ["D", memory];
    }

    if (memory.phase === "exploit_test") {
        if (lastOpp === "C") {
            // Didn't retaliate to probe -> Exploit!
            memory.phase = "exploit";
            return ["D", memory];
        } else {
            // Retaliated to probe -> Apologize!
            memory.phase = "normal";
            memory.apologized = 2;
            return ["C", memory];
        }
    }

    // 5. Punish Mode (For persistent defectors)
    if (memory.phase === "punish") {
        if (memory.cooperateStreak >= 2) {
            // Forgive if they cooperate twice
            memory.phase = "normal";
            return ["C", memory];
        }
        return ["D", memory];
    }

    // 6. Normal Play (TF2T - Resilient to noise, strict against delayed defectors)
    if (n >= 2) {
        const prevOpp = history[n - 2].opponent;
        if (lastOpp === "D" && prevOpp === "D") {
            return ["D", memory];
        }
    }

    return ["C", memory];
}