// Praesidium (h7kz8qt6tcwntpo3fxs8) mean=1.264444835133833 stats={'battles': 2560, 'losses': 1729, 'wins': 519}
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