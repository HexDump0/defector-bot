// cop5 (488tgavsgkf9kosrpl3o) mean=1.4335284878128771 stats={'battles': 617, 'losses': 137, 'wins': 388}
export default function bot({ history, memory }) {
  // Inicializace paměti v 1. kole
  // permanentlyDefect: zda soupeř už někdy dal "D" (a tudíž hrajeme navždy "D")
  const botMemory = memory || { permanentlyDefect: false };
  const currentRound = history.length;

  // První kolo: začneme spoluprací "C"
  if (currentRound === 0) {
    return ["C", botMemory];
  }

  // Zjistíme poslední tah soupeře
  const lastOpponentMove = history.at(-1)?.opponent;

  // Pokud soupeř KDYKOLIV v minulosti (nebo v minulém kole) dal "D",
  // zapamatujeme si to a zablokujeme bota trvale na "D"
  if (lastOpponentMove === "D") {
    botMemory.permanentlyDefect = true;
  }

  // PODMÍNKA 1: Pokud jsme v režimu trvalé zrady, dáváme VŽDY "D"
  if (botMemory.permanentlyDefect) {
    return ["D", botMemory];
  }

  // PODMÍNKA 2: Každé 5. kolo (kolo 5, 10, 15...) zkusíme zradit "D"
  if ((currentRound + 1) % 5 === 0) {
    return ["D", botMemory];
  }

  // V ostatních případech dáváme "C"
  return ["C", botMemory];
}