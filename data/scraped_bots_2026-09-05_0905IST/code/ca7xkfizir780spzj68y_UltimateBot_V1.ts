// UltimateBot V1 (ca7xkfizir780spzj68y) mean=1.5261732247125914 stats={'battles': 1663, 'losses': 928, 'wins': 409}
const WINDOW = 10;
const COOPERATION_THRESHOLD = 0.6;
const EXPLOIT_THRESHOLD = 0.35;
const MIN_DEFECT_RESPONSE_SAMPLES = 2;
const OLIVE_BRANCH_SCHEDULE = [5, 20];

function freshMemory() {
    return {
        seen: 0,
        opponentC: 0,
        opponentD: 0,
        mutualDStreak: 0,
        olives: 0
    };
}

function updateMemory(history, memory) {
    const n = history.length;
    if (!memory || memory.seen !== n - 1) return freshMemory();

    const last = history[n - 1];
    if (last.opponent === "D") memory.opponentD++;
    else memory.opponentC++;

    if (last.you === "D" && last.opponent === "D") memory.mutualDStreak++;
    else memory.mutualDStreak = 0;

    memory.seen = n;
    return memory;
}

function responseRates(history) {
    let cooperateAfterC = 0, samplesAfterC = 0;
    let cooperateAfterD = 0, samplesAfterD = 0;
    const start = Math.max(1, history.length - WINDOW);

    for (let i = start; i < history.length; i++) {
        if (history[i - 1].you === "C") {
            samplesAfterC++;
            if (history[i].opponent === "C") cooperateAfterC++;
        } else {
            samplesAfterD++;
            if (history[i].opponent === "C") cooperateAfterD++;
        }
    }
    return {
        pC: (cooperateAfterC + 0.5) / (samplesAfterC + 1),
        pD: (cooperateAfterD + 0.5) / (samplesAfterD + 1),
        samplesAfterD
    };
}

function decide(history, memory) {
    const n = history.length;
    if (n === 0) return ["C", freshMemory()];

    memory = updateMemory(history, memory);
    const last = history[n - 1];
    const previous = n >= 2 ? history[n - 2] : null;

    if (n === 3 && memory.opponentD === 0) {
        return ["D", memory];
    }
    if (n === 4 && history[3].you === "D" && last.opponent === "C") {
        return ["C", memory];
    }

    if (memory.mutualDStreak === 4 || memory.mutualDStreak === 19) {
        return ["D", memory];
    }
    if (memory.mutualDStreak === 5 || memory.mutualDStreak === 20) {
        memory.olives++;
        return ["C", memory];
    }

    if (memory.opponentD === 0 && n > 4) return ["C", memory];

    const { pC, pD, samplesAfterD } = responseRates(history);

    if (samplesAfterD >= MIN_DEFECT_RESPONSE_SAMPLES && pD >= EXPLOIT_THRESHOLD) {
        return ["D", memory];
    }

    if (pC >= COOPERATION_THRESHOLD) {
        const theirDWasProvoked = last.opponent === "D" && previous !== null && previous.you === "D";
        if (last.opponent === "D" && !theirDWasProvoked) return ["D", memory];
        return ["C", memory];
    }

    if (memory.opponentC > 0 && memory.olives < OLIVE_BRANCH_SCHEDULE.length && memory.mutualDStreak >= OLIVE_BRANCH_SCHEDULE[memory.olives]) {
        memory.olives++;
        return ["C", memory];
    }

    return ["D", memory];
}

export default function bot(state) {
    let memory = state && state.memory ? state.memory : null;
    try {
        const history = state && Array.isArray(state.history) ? state.history : [];
        const [move, nextMemory] = decide(history, memory);
        return [move === "C" ? "C" : "D", nextMemory];
    } catch {
        return ["D", memory || freshMemory()];
    }
}