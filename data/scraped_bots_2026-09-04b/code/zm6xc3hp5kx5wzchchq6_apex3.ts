// apex3 (zm6xc3hp5kx5wzchchq6) mean=1.3847843328247385 stats={'battles': 2454, 'losses': 1468, 'wins': 823}
export default function bot({ history, memory }) {
  memory = memory || { limit: 2, count: 0, failed: false };
  if (history.length === 0) return ["D", memory];

  const last = history.at(-1).opponent;

  // SUCCESS: They cooperated! Reset and steal.
  if (last === "C") {
    memory.count = 0;
    memory.limit = Math.floor(Math.random() * 4) + 2;
    memory.failed = false;
    return ["D", memory];
  }

  // LURING: Sending C's to try and trigger them.
  if (memory.count < memory.limit) {
    memory.count++;
    return ["C", memory];
  }

  // SAFETY SWITCH: If we reached the limit and they still defected, 
  // stop wasting points. Defect until they show a sign of life.
  memory.failed = true;
  if (last === "D" && memory.failed) {
    return ["D", memory];
  }

  // Reset lure if they ever stop defecting
  memory.count = 0;
  return ["C", memory];
}
