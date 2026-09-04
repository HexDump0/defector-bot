// apex5a (qqe64b5y7rhjmypdykll) mean=1.5587590384792338 stats={'battles': 2555, 'losses': 1194, 'wins': 222}
export default function bot({ history, memory }) {
  memory = memory || { streak: 0, punish: false, locked: false };
  if (!history.length) return ["C", memory];

  const last = history.at(-1).opponent;

  memory.streak = last === "D" ? memory.streak + 1 : 0;
  if (memory.streak >= 4) memory.locked = true;

  if (memory.locked) return ["D", memory];

  if (last === "D" && !memory.punish) {
    memory.punish = true;
    return ["D", memory];
  }

  memory.punish = false;
  return ["C", memory];
}
