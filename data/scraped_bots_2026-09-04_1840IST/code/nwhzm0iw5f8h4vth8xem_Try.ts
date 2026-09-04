// Try (nwhzm0iw5f8h4vth8xem) mean=1.467026633770715 stats={'battles': 13, 'losses': 7, 'wins': 0}
export default function bot(state) {
  // Wrapping everything in a try-catch ensures we never crash and forfeit.
  try {
    // 1. Safely initialize history and memory
    const history = state?.history || [];
    let memory = state?.memory || { 
      consecutiveOpponentDefects: 0,
      totalOpponentDefects: 0 
    };

    // 2. Opening move: Start friendly to encourage mutual cooperation
    if (history.length === 0) {
      return ["C", memory];
    }

    const lastRound = history[history.length - 1];
    const opponentLastMove = lastRound.opponent;

    // 3. Update memory statistics
    if (opponentLastMove === "D") {
      memory.consecutiveOpponentDefects++;
      memory.totalOpponentDefects++;
    } else {
      memory.consecutiveOpponentDefects = 0;
    }

    // 4. Base Strategy: Tit-for-Tat (Copy their last move)
    let nextMove = opponentLastMove;

    // 5. Forgiveness Mechanic (The "Olive Branch")
    // If stuck in a mutual defection loop for 5 rounds, try to break it by cooperating.
    if (memory.consecutiveOpponentDefects === 5) {
      nextMove = "C";
    } 
    // If they betray our olive branch, punish them heavily by resetting the counter 
    // so we don't try forgiving again until another 5 rounds pass.
    else if (memory.consecutiveOpponentDefects > 5) {
      nextMove = "D"; 
      memory.consecutiveOpponentDefects = 0; 
    }

    // 6. Hardened Defense: The "Grudge"
    // If we have played enough rounds and they are defecting more than 65% of the time,
    // they are likely a hostile bot. Abandon forgiveness and permanently defect to minimize losses.
    const roundsPlayed = history.length;
    if (roundsPlayed > 15) {
      const defectRate = memory.totalOpponentDefects / roundsPlayed;
      if (defectRate > 0.65) {
        nextMove = "D";
      }
    }

    // Return the move and the updated memory state
    return [nextMove, memory];

  } catch (error) {
    // Ultimate failsafe: If a bug occurs, default to Defect ("D") to protect score, 
    // and preserve whatever memory we can.
    return ["D", state?.memory || {}];
  }
}