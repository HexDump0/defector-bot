const strategyNotes = {
  cooperator: "Never defects. A peaceful opponent that sends the bot down the friend path.",
  defector: "Defects every round. Five straight betrayals trigger permanent hard mode.",
  signal: "Opens C–D–C–C–C, the bot’s secret exploit signal, then cooperates.",
  titfortat: "Starts friendly, then copies whatever the bot played in the previous round.",
  grudger: "Cooperates until the bot defects once—then defects for the rest of the match.",
  random: "Chooses cooperate or defect with equal probability on every round.",
}

const payoffs = {
  CC: { bot: 3, opponent: 3, label: "Mutual trust" },
  CD: { bot: 0, opponent: 5, label: "Sucker / Temptation" },
  DC: { bot: 5, opponent: 0, label: "Temptation / Sucker" },
  DD: { bot: 1, opponent: 1, label: "Mutual defection" },
}

let history = []
let memory = null
let scores = { bot: 0, opponent: 0 }
let autoTimer = null

const select = document.querySelector("#opponent-select")
const note = document.querySelector("#opponent-note")
const historyList = document.querySelector("#history-list")
const modeLabel = document.querySelector("#current-mode")
const decisionCopy = document.querySelector("#decision-copy")
const roundLabel = document.querySelector("#round-label")
const autoButton = document.querySelector("#auto-button")

function chooseBotMove(currentHistory, currentMemory) {
  const n = currentHistory.length
  const last = currentHistory[n - 1]
  let nextMemory = currentMemory ? { ...currentMemory } : null

  if (n === 0) {
    return { move: "C", memory: null, reason: "No history yet, so the bot leads with trust and cooperates." }
  }

  if (nextMemory == null) nextMemory = { mode: "observe" }

  if (nextMemory.mode === "observe") {
    if (n >= 5) {
      const opening = currentHistory.slice(0, 5).map((round) => round.opponent).join("")
      if (opening === "CDCCC") nextMemory.mode = "exploit"
      else if (opening === "DDDDD") nextMemory.mode = "hard"
      else nextMemory.mode = "friend"
    } else {
      if (last.opponent === "C") return { move: "C", memory: nextMemory, reason: "The opponent just cooperated, so the bot returns the trust." }
      if (n >= 2 && currentHistory[n - 2].you === "D") return { move: "C", memory: nextMemory, reason: "The bot defected two turns ago, so it cooperates now to break a retaliation loop." }
      return { move: "D", memory: nextMemory, reason: "The opponent defected and no forgiveness rule applies, so the bot retaliates once." }
    }
  }

  if (nextMemory.mode === "exploit" || nextMemory.mode === "hard") {
    const reason = nextMemory.mode === "exploit"
      ? "The CDCCC signal was recognized. Exploit mode defects permanently."
      : "Hard mode is locked. The bot defects permanently."
    return { move: "D", memory: nextMemory, reason }
  }

  if (n >= 10) {
    const recent = currentHistory.slice(-8)
    const defections = recent.reduce((count, round) => count + (round.opponent === "D" ? 1 : 0), 0)
    if (defections >= 2) {
      nextMemory.mode = "hard"
      return { move: "D", memory: nextMemory, reason: `${defections} defections appeared in the last 8 rounds. Friend mode switches permanently to hard.` }
    }
  }

  if (last.opponent === "C") return { move: "C", memory: nextMemory, reason: "The opponent cooperated last round, so the friendly response is cooperation." }
  if (n >= 2 && currentHistory[n - 2].you === "D") return { move: "C", memory: nextMemory, reason: "The bot cooperates to interrupt a possible back-and-forth retaliation loop." }
  if (last.you === "D") return { move: "C", memory: nextMemory, reason: "After its own defection, the bot offers cooperation as a reset." }
  return { move: "D", memory: nextMemory, reason: "The opponent defected last round, so the bot answers with a single defection." }
}

function chooseOpponentMove(kind) {
  if (kind === "cooperator") return "C"
  if (kind === "defector") return "D"
  if (kind === "signal") return ["C", "D", "C", "C", "C"][history.length] || "C"
  if (kind === "titfortat") return history.length ? history.at(-1).you : "C"
  if (kind === "grudger") return history.some((round) => round.you === "D") ? "D" : "C"
  return Math.random() < 0.5 ? "C" : "D"
}

function playRound(manualMove) {
  const decision = chooseBotMove(history, memory)
  const opponentMove = manualMove || chooseOpponentMove(select.value)
  const result = payoffs[decision.move + opponentMove]

  memory = decision.memory
  history.push({ you: decision.move, opponent: opponentMove, result, reason: decision.reason, mode: memory?.mode || null })
  scores.bot += result.bot
  scores.opponent += result.opponent
  render()
}

function render() {
  document.querySelector("#round-count").textContent = String(history.length).padStart(2, "0")
  document.querySelector("#bot-score").textContent = scores.bot
  document.querySelector("#opponent-score").textContent = scores.opponent
  note.textContent = strategyNotes[select.value]

  const mode = memory?.mode || "uninitialized"
  const prettyMode = mode === "uninitialized" ? "Uninitialized" : mode[0].toUpperCase() + mode.slice(1)
  modeLabel.innerHTML = `<i class="${mode}"></i> ${prettyMode}`

  document.querySelectorAll("[data-mode-card]").forEach((card) => {
    card.classList.toggle("active", card.dataset.modeCard === (memory?.mode || "observe"))
  })

  if (!history.length) {
    roundLabel.textContent = "Ready"
    decisionCopy.textContent = "The bot begins every match with an unconditional cooperation."
    historyList.innerHTML = `<div class="empty-state"><div class="empty-coins"><i>C</i><i>D</i></div><p>No moves yet</p><span>Play a round to begin the experiment.</span></div>`
    return
  }

  const latest = history.at(-1)
  roundLabel.textContent = `Round ${history.length}`
  decisionCopy.textContent = latest.reason
  historyList.innerHTML = history.map((round, index) => `
    <div class="history-row">
      <span class="round-no">${String(index + 1).padStart(2, "0")}</span>
      <span class="move-token ${round.you.toLowerCase()}">${round.you}</span>
      <span class="outcome"><b>+${round.result.bot} / +${round.result.opponent}</b>${round.result.label}</span>
      <span class="move-token ${round.opponent.toLowerCase()}">${round.opponent}</span>
    </div>`).reverse().join("")
}

function stopAuto() {
  window.clearInterval(autoTimer)
  autoTimer = null
  autoButton.classList.remove("running")
  autoButton.querySelector("span").textContent = "▶"
  autoButton.setAttribute("aria-label", "Auto-play rounds")
}

function toggleAuto() {
  if (autoTimer) return stopAuto()
  autoButton.classList.add("running")
  autoButton.querySelector("span").textContent = "Ⅱ"
  autoButton.setAttribute("aria-label", "Pause auto-play")
  playRound()
  autoTimer = window.setInterval(playRound, 850)
}

function reset() {
  stopAuto()
  history = []
  memory = null
  scores = { bot: 0, opponent: 0 }
  render()
}

document.querySelector("#step-button").addEventListener("click", () => playRound())
document.querySelector("#reset-button").addEventListener("click", reset)
autoButton.addEventListener("click", toggleAuto)
select.addEventListener("change", reset)
document.querySelectorAll("[data-manual]").forEach((button) => {
  button.addEventListener("click", () => playRound(button.dataset.manual))
})

render()
