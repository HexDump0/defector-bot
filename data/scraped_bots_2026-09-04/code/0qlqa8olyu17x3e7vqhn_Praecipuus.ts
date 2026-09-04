// Praecipuus (0qlqa8olyu17x3e7vqhn) mean=1.4981041782224287 stats={'battles': 2585, 'losses': 306, 'wins': 1360}
export default function bot({ history, memory }) {
    memory = memory ?? {
        alwaysDefected: false,
        alwaysCoop: false,
        titForTat: false,
        isRandom: false,
        isBetrayed: 0,
        cntDefected: 0,
        cntCoop: 0
    };

    if (history.length !== 0) {
        if (history.at(-1).opponent === "D") memory.cntDefected++;
        else memory.cntCoop++;
    }

    if (history.length === 20) {
        if (Math.abs(memory.cntCoop - memory.cntDefected) <= 4) memory.isRandom = true;
    }

    if (history.length === 0) {
        return ["D", memory];
    } else if (history.at(0).opponent === "D") {
        memory.alwaysDefected = true;
    }

    if (history.length === 2) {
        if (history.at(1).opponent === "C") {
            memory.alwaysCoop = true;
        } else {
            memory.titForTat = true;
        }
    }

    if (history.length > 10 && history.at(-1).opponent === "D") {
        memory.isBetrayed++;
    }

    if (memory.alwaysDefected || memory.alwaysCoop || memory.isRandom || 
        history.length >= 101 || memory.isBetrayed >= 2 || history.length % 67 === 0) {
        return ["D", memory];
    } else {
        if (history.length)
        return ["C", memory];
    }
}