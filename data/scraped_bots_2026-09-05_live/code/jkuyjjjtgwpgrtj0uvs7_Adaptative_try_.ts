// Adaptative (try) (jkuyjjjtgwpgrtj0uvs7) mean=0 stats={'battles': 4, 'losses': 4, 'wins': 0}
export default function bot({memory, history}){
    memory ??= {
        rounds: 0,
        cooperations: 0,
        defections: 0,
        model: {
            C: {C: 1, D: 1},
            D: {C: 1, D: 1}
        }
    };

    let move = "C";

    // Keep a count of the moves and update the memory counter

    const lastMove = history.at(-1)?.opponent;

    if (lastMove === "C"){
        memory.cooperations++;
    } else if (lastMove === "D"){
        memory.defections++;
    }

    memory.rounds = memory.cooperations + memory.defections;


    // Calculate defect rate in diffferent windows 

    function defectRate(history, n){
        const recent = history.slice(-n);
        if (recent.length === 0) return 0

        return recent.filter(x => x.opponent === "D").length / recent.length;
    }

    const d5 = defectRate(history, 5);
    const d10 = defectRate(history, 10);
    const d30 = defectRate(history, 30)

    const alwaysD = oponent.defections >= 5 && opponent.cooperations === 0;

    const prediction =
        0.5 * d5 +
        0.3 * d10 +
        0.2 * d30;


    const previous = history.at(-1);
    if (previous){
        memory.model[previous.you][previous.opponent]++;
    }

    const retalation = previous && previous.you === "D" && previous.opponent === "D";
    const unprovokedDefection = previous && previous.you === "C" && previous.opponent === "D";

    // Probability

    function probDefect(model, ourMove){
        const data = model[ourMove];

        return data.D / (data.C + data.D)
    }

    const pDifC = probDefect(memory.model, "C");
    const pDifD = probDefect(memory.model, "D")

    const cSamples = memory.model.C.C + memory.model.C.D -2;
    const dSamples = memory.model.D.C + memory.model.D.D -2;

    const expectedD = (1 - pDifD) * 3 + pDifD * 1;
    const expectedC = (1 - pDifC) * 2 + pDifC * 0;


    if (cSamples < 2 && dSamples < 2){
        move = "C";
    }else if (alwaysD){
        move = "D";
    } else if (unprovokedDefection && pDifC > 0.65 && cSamples >= 3){
        move = "D";
    } else if (prediction > 0.85 && history.length >= 5){
        move = "D";
    } else if (expectedD > expectedC){
        move = "D";
    } else {
        move = "C";
    }
    return[move, memory]
}