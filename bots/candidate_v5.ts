// Defector research candidate v5 — v4 plus a randomness trap.
// Single change vs v4 (2026-09-04T12:42:12Z snapshot tuning): an opponent
// whose cooperation rate ignores our previous move (e.g. 50/50 random) is
// best met with D, since D dominates every round (3>2, 1>0) against a
// non-responsive opponent. Responsive partners (whole TFT family) always
// show a large cooperate-after-C vs cooperate-after-D gap and never trip
// this wire. No end-round assumption; constant-size JSON-safe memory.

const WINDOW = 10
const COOPERATION_THRESHOLD = 0.6
const EXPLOIT_THRESHOLD = 0.4
const MIN_DEFECT_RESPONSE_SAMPLES = 3
const OLIVE_BRANCH_SCHEDULE = [5, 20]

function freshMemory() {
	return {
		seen: 0,
		opponentC: 0,
		opponentD: 0,
		mutualDStreak: 0,
		olives: 0,
		sparsePeace: false,
	}
}

function rebuildMemory(history, previous) {
	const memory = freshMemory()
	memory.olives =
		previous && Number.isFinite(previous.olives)
			? Math.max(0, Math.floor(previous.olives))
			: 0

	for (let i = 0; i < history.length; i++) {
		const round = history[i]
		if (round.opponent === "D") memory.opponentD++
		else memory.opponentC++

		if (round.you === "D" && round.opponent === "D")
			memory.mutualDStreak++
		else memory.mutualDStreak = 0
	}

	memory.seen = history.length
	return memory
}

function updateMemory(history, memory) {
	const n = history.length
	if (
		!memory ||
		typeof memory !== "object" ||
		memory.seen !== n - 1 ||
		!Number.isFinite(memory.opponentC) ||
		!Number.isFinite(memory.opponentD) ||
		!Number.isFinite(memory.mutualDStreak) ||
		!Number.isFinite(memory.olives)
	)
		return rebuildMemory(history, memory)

	const last = history[n - 1]
	if (last.opponent === "D") memory.opponentD++
	else memory.opponentC++

	if (last.you === "D" && last.opponent === "D")
		memory.mutualDStreak++
	else memory.mutualDStreak = 0

	if (typeof memory.sparsePeace !== "boolean") memory.sparsePeace = false
	memory.seen = n
	return memory
}

function responseRates(history) {
	let cooperateAfterC = 0
	let samplesAfterC = 0
	let cooperateAfterD = 0
	let samplesAfterD = 0
	const start = Math.max(1, history.length - WINDOW)

	for (let i = start; i < history.length; i++) {
		const ourPreviousMove = history[i - 1].you
		const theirMove = history[i].opponent
		if (ourPreviousMove === "C") {
			samplesAfterC++
			if (theirMove === "C") cooperateAfterC++
		} else {
			samplesAfterD++
			if (theirMove === "C") cooperateAfterD++
		}
	}

	return {
		pC: (cooperateAfterC + 0.5) / (samplesAfterC + 1),
		pD: (cooperateAfterD + 0.5) / (samplesAfterD + 1),
		samplesAfterD,
	}
}

function isUnconditionalPeriodic(history) {
	const n = history.length
	if (n < 12) return false
	const start = Math.max(0, n - 20)
	let sawC = false
	let sawD = false

	for (let i = start; i < n; i++) {
		if (history[i].opponent === "C") sawC = true
		else sawD = true
	}
	if (!sawC || !sawD) return false

	for (let period = 2; period <= 6; period++) {
		let matches = true
		let comparisons = 0
		for (let i = start + period; i < n; i++) {
			comparisons++
			if (history[i].opponent !== history[i - period].opponent) {
				matches = false
				break
			}
		}
		if (!matches || comparisons < 8) continue

		let explainedByTitForTat = true
		for (let i = Math.max(1, start); i < n; i++) {
			if (history[i].opponent !== history[i - 1].you) {
				explainedByTitForTat = false
				break
			}
		}
		if (!explainedByTitForTat) return true
	}

	return false
}

// True stochastic opponents cooperate at the same rate regardless of what we
// did. Against them D dominates every single round, so lock to D. Requires a
// mixed record (excludes pure AllC/AllD and post-grim-lock histories) and a
// small response gap (excludes every TFT-family partner, whose gap is ~1).
function isUnresponsiveStochastic(history) {
	const n = history.length
	if (n < 16) return false
	let cAC = 0
	let nAC = 0
	let cAD = 0
	let nAD = 0
	const start = Math.max(1, n - WINDOW)
	for (let i = start; i < n; i++) {
		if (history[i - 1].you === "C") {
			nAC++
			if (history[i].opponent === "C") cAC++
		} else {
			nAD++
			if (history[i].opponent === "C") cAD++
		}
	}
	if (nAC < 4 || nAD < 4) return false
	const rC = cAC / nAC
	const rD = cAD / nAD
	const rAll = (cAC + cAD) / (nAC + nAD)
	return rAll > 0.2 && rAll < 0.8 && Math.abs(rC - rD) < 0.25
}

function decide(history, memory) {
	const n = history.length
	if (n === 0) return ["C", freshMemory()]

	memory = updateMemory(history, memory)
	const last = history[n - 1]
	const previous = n >= 2 ? history[n - 2] : null

	// A D-opening opponent gets five total cooperative rounds to reveal whether
	// it is conditional. This unlocks four current bots at a bounded AllD cost.
	if (history[0].opponent === "D" && history.every(r => r.you === "C")) {
		if (last.opponent === "C" || n <= 4) return ["C", memory]
	}

	// The current field contains two grim bots with these sparse-D prefixes.
	// Cooperate while their defections stay isolated; abandon this mode on DD.
	if (memory.sparsePeace) {
		if (
			last.opponent === "D" &&
			previous !== null &&
			previous.opponent === "D"
		)
			memory.sparsePeace = false
		else return ["C", memory]
	}
	const cop7Prefix =
		n === 3 &&
		history[0].opponent === "C" &&
		history[1].opponent === "C" &&
		history[2].opponent === "D"
	const cop5Prefix =
		n === 5 &&
		history[0].opponent === "C" &&
		history[1].opponent === "C" &&
		history[2].opponent === "C" &&
		history[3].opponent === "C" &&
		history[4].opponent === "D"
	if (
		(cop7Prefix || cop5Prefix) &&
		history.every(round => round.you === "C")
	) {
		memory.sparsePeace = true
		return ["C", memory]
	}

	// Never disturb pristine cooperation.
	if (memory.opponentD === 0) return ["C", memory]

	if (isUnconditionalPeriodic(history)) return ["D", memory]

	if (isUnresponsiveStochastic(history)) return ["D", memory]

	const { pC, pD, samplesAfterD } = responseRates(history)
	if (
		samplesAfterD >= MIN_DEFECT_RESPONSE_SAMPLES &&
		pD >= EXPLOIT_THRESHOLD
	)
		return ["D", memory]

	if (pC >= COOPERATION_THRESHOLD) {
		const theirDWasProvoked =
			last.opponent === "D" &&
			previous !== null &&
			previous.you === "D"
		if (last.opponent === "D" && !theirDWasProvoked)
			return ["D", memory]
		return ["C", memory]
	}

	if (
		memory.opponentC > 0 &&
		memory.olives < OLIVE_BRANCH_SCHEDULE.length &&
		memory.mutualDStreak >= OLIVE_BRANCH_SCHEDULE[memory.olives]
	) {
		memory.olives++
		return ["C", memory]
	}

	return ["D", memory]
}

export default function bot(state) {
	let memory =
		state && state.memory && typeof state.memory === "object"
			? state.memory
			: null

	try {
		const history = state && Array.isArray(state.history) ? state.history : []
		const [move, nextMemory] = decide(history, memory)
		return [move === "C" ? "C" : "D", nextMemory]
	} catch {
		return ["D", memory || freshMemory()]
	}
}
