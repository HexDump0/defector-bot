// AaravC Bot 1 (g2k1w195iwpteq51bhko) mean=1.3877539222685433 stats={'battles': 1626, 'losses': 669, 'wins': 861}
export default function bot ({ history, memory}) {
 memory= memory ?? {
  round: 0,
  oppDefections: 0,
  streak: 0,
  lastOppMove: null,
  exploiting: false,
  punishing: false,
}

memory.round++

if (history.length ===0) {
 return ["C", memory]
}

const oppMove = history.at(-1).opponent

memory.streak = (oppMove === memory.lastOppMove) ? memory.streak + 1 : 1
memory.lastOppMove = oppMove
if (oppMove === "D") memory.oppDefections++

const oppDefectRate = memory.oppDefections/memory.round

if (memory.exploiting || memory.punishing) {
 return ["D", memory]
}

 if (memory.round >= 12 && memory.oppDefections === 0) {
 memory.exploiting = true
 return ["D", memory]
}

if (memory.round >= 8 && oppDefectRate >= 0.85) {
 memory.punishing = true
 return ["D", memory]
}

if (oppMove === "D") {
 const forgiveChance =
  memory.streak === 1 ? 0.25 :
  memory.streak === 2 ? 0.08: 0

 const move = Math.random() < forgiveChance ? "C" : "D"
 return [move, memory]
 }
return ["C", memory]
}




