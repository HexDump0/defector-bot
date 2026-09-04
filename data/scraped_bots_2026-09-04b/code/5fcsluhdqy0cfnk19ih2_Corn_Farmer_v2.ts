// Corn Farmer v2 (5fcsluhdqy0cfnk19ih2) mean=1.299504731026627 stats={'battles': 2739, 'losses': 825, 'wins': 1767}
type Move = "C" | "D";

type Match = {
  you: Move;
  opponent: Move;
};

type Memory = Record<string, any> | null;

type State = {
  history: Match[];
  memory: Memory;
};

const CORN_HANDSHAKE: Move[] = [
  "C",
  "D",
  "C",
  "C",
  "D",
  "C"
];
const VERIFY_ROUNDS = 6;
const VERIFY_TOLERANCE = 1;

export default function bot(state: State): [Move, Memory] {
    let memory: Memory = state.memory ?? {
        isCornBot: true,
    };
    try{
        const history: Match[] = Array.isArray(state.history) ? state.history : [];
        const round = history.length;
        
        if (memory.isCornBot == false){ return ["D", memory] }
        if (round < CORN_HANDSHAKE.length){
            // put the check in here since we already know we're in the handshaking phase
            if (round >= 1) {
                // check if the opponent is doing the corn handshake, if not we gotta do another strategy
                //      perhaps always defecting?
                if(history[round-1].opponent != CORN_HANDSHAKE[round-1]){
                    memory.isCornBot = false;
                    return ["D", memory];
                }
            }

            return [CORN_HANDSHAKE[round], memory];
        }
        // now that we've done the handshake cornbots will verify us by doing verify rounds w/ tolerance to some defects
        // subtract VERIFY_TOLERANCE here since we can get away with not coperating early from the tolerance
        if (round >= CORN_HANDSHAKE.length + VERIFY_ROUNDS - VERIFY_TOLERANCE) {
            // we are past the verification point, we can now always defect and reap our rewards :P
            return ["D", memory];
        }
        else{
            // ughhh, we gotta verify :/
            return ["C", memory]; // cooperate to gain their trust and verify ourselves
        }
    }
    catch{
        // failsafe so we don't forfeit
        return ["D", memory];
    }

}