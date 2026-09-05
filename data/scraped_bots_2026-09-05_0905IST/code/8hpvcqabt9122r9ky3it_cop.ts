// cop (8hpvcqabt9122r9ky3it) mean=1.6420793531499056 stats={'battles': 2938, 'losses': 758, 'wins': 757}
export default function bot({ history, memory }) {
  // Inicializace paměti v prvním kole (zatím soupeř nezradil)
  const currentMemory = memory ?? { opponentDefected: false };

  // Pokud je historie prázdná (1. kolo), začínáme spoluprací
  if (history.length === 0) {
    return ["C", currentMemory];
  }

  // Zjištění posledního tahu soupeře
  const lastMatch = history[history.length - 1];
  const lastOpponentMove = lastMatch ? lastMatch.opponent : "C";

  // Pokud soupeř v minulém kole zradil, zapamatujeme si to navždy
  if (lastOpponentMove === "D") {
    currentMemory.opponentDefected = true;
  }

  // Pokud soupeř už někdy zradil, hrajeme "D", jinak pokračujeme v "C"
  const move = currentMemory.opponentDefected ? "D" : "C";

  // Vrácení tahu a aktualizované paměti
  return [move, currentMemory];
}