// welp theres no name cap so i gotta expolit this until it gets patched dddddddsdsdfsdfdsf4d5f415214162168456123148541213418+512312312312312312312312312312312312312312312312312312312311231321231321321231321231231231232321213 (559kycyz3k804du524jm) mean=1.5709525028275038 stats={'battles': 2994, 'losses': 1393, 'wins': 311}


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
