// Dilemmator (ezr2j2rlzea0him3tc57) mean=1.5989807555431097 stats={'battles': 34, 'losses': 10, 'wins': 24}
export default function bot({ history, memory }) {

    memory = memory ?? { strikes: 0, state: "normal" };

    if (history.length === 0) return ["C", memory];

    const opMove = history.at(-1).opponent;
    if (opMove === "D") memory.strikes++;

    if (memory.strikes >= 3) return ["D", memory];

    if (memory.state === "exploiting") return ["D", memory];

    if (history.length === 15 && memory.strikes === 0) {
        memory.state = "testing";
        return ["D", memory];
    }

    if (memory.state === "testing") {
        if (opMove === "C") {
            memory.state = "exploiting";
            return ["D", memory];
        } else {
            memory.state = "apologizing";
            return ["C", memory];
        }
    }

    if (memory.state === "apologizing") {
        memory.state = "normal";
        return ["C", memory];
    }

    if (history.length > 1) {
        const prevOpMove = history.at(-2).opponent;
        if (opMove === "D" && prevOpMove === "D") {
            return ["D", memory];
        }
    }
    return ["C", memory];
}