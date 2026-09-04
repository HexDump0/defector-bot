// cop7 (w9c62uboevec4hh06hgn) mean=1.4171646748370326 stats={'battles': 619, 'losses': 157, 'wins': 375}
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

  // Pokud soupeř KDYKOLIV dal "D", zablokujeme bota trvale na "D"
  if (lastOpponentMove === "D") {
    botMemory.permanentlyDefect = true;
  }

  // 1. Pokud je aktivní trvalá zrada, dáváme VŽDY "D"
  if (botMemory.permanentlyDefect) {
    return ["D", botMemory];
  }

  // 2. Každé 3. kolo (kolo 3, 6, 9, 12...) zkusíme zradit "D"
  if ((currentRound + 1) % 3 === 0) {
    return ["D", botMemory];
  }

  // V ostatních případech dáváme "C"
  return ["C", botMemory];
}