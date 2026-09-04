// Munificus (h6vva01qba01xj96rbou) mean=1.2229803083879447 stats={'battles': 2570, 'losses': 1761, 'wins': 459}
export default function bot({ history, memory }) {
    memory = memory ?? {
        fullDefected: false,
        fullCoop: false
    };

    if (history.length === 0) {
        return ["C", memory];
    }

    if (history.length === 1) {
        return ["D", memory];
    }

    if (history.length === 2) {
        if (
            history.at(0).opponent === "D" &&
            history.at(1).opponent === "D"
        ) {
            memory.fullDefected = true;
        } else {
            memory.fullCoop = true;
        }
    }

    if (memory.fullDefected) {
        return ["D", memory];
    } else if (memory.fullCoop) {
        return ["C", memory];
    }

    return ["D", memory];
}