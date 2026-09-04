/**
 * Contrite Meta v1
 *
 * Population-aware strategy for Defector's current 2/3/1/0 payoff matrix.
 *
 * Principles:
 * - preserve 2-point cooperation with opponents that have never defected;
 * - punish unprovoked defections without entering automatic revenge loops;
 * - exploit opponents that demonstrably keep cooperating after our D;
 * - defect against hostile or unconditional periodic behavior;
 * - offer sparse recovery attempts only to opponents that cooperated before;
 * - never depend on a fixed final round.
 *
 * The tournament calls this synchronously as:
 *   ({ history, memory }) => ["C" | "D", memory]
 */

const WINDOW = 15
const COOPERATION_THRESHOLD = 0.7
const EXPLOIT_THRESHOLD = 0.4
const MIN_DEFECT_RESPONSE_SAMPLES = 3
const OLIVE_BRANCH_SCHEDULE = [5, 20, 70]

function freshMemory() {
	return {
		seen: 0,
		opponentC: 0,
		opponentD: 0,
		mutualDStreak: 0,
		olives: 0,
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

	// Under normal tournament execution, memory.seen is n - 1. Rebuild if
	// memory was malformed or became inconsistent instead of risking a crash.
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

	memory.seen = n
	return memory
}

function smoothedRate(successes, samples) {
	// Jeffreys-style smoothing prevents tiny samples from producing certainty.
	return (successes + 0.5) / (samples + 1)
}

function responseRates(history) {
	let cooperateAfterC = 0
	let samplesAfterC = 0
	let cooperateAfterD = 0
	let samplesAfterD = 0
	const start = Math.max(1, history.length - WINDOW)

	// Their move at i can be a response to our move at i - 1.
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
		pC: smoothedRate(cooperateAfterC, samplesAfterC),
		pD: smoothedRate(cooperateAfterD, samplesAfterD),
		samplesAfterD,
	}
}

function isUnconditionalPeriodic(history) {
	const n = history.length
	const PERIOD_WINDOW = 20
	if (n < 12) return false

	const start = Math.max(0, n - PERIOD_WINDOW)
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

		// Do not call ordinary lag-one tit-for-tat an unconditional pattern.
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

function decide(history, memory) {
	const n = history.length
	if (n === 0) return ["C", freshMemory()]

	memory = updateMemory(history, memory)
	const last = history[n - 1]
	const previous = n >= 2 ? history[n - 2] : null

	// Never disturb pristine cooperation. Probing cannot distinguish an
	// always-cooperator from a grudger without risking the whole relationship.
	if (memory.opponentD === 0) return ["C", memory]

	// Fixed alternators and other short unconditional cycles are best met by D.
	if (isUnconditionalPeriodic(history)) return ["D", memory]

	const { pC, pD, samplesAfterD } = responseRates(history)

	// If they have repeatedly cooperated after our D, continued defection has
	// demonstrated positive value. Re-evaluate every turn so retaliation exits
	// this behavior instead of locking us into it forever.
	if (
		samplesAfterD >= MIN_DEFECT_RESPONSE_SAMPLES &&
		pD >= EXPLOIT_THRESHOLD
	)
		return ["D", memory]

	// A responsive opponent is valuable. Punish only an unprovoked D. If their
	// D followed our D, cooperate to break a retaliation loop (contrition).
	if (pC >= COOPERATION_THRESHOLD) {
		const theirDWasProvoked =
			last.opponent === "D" &&
			previous !== null &&
			previous.you === "D"

		if (last.opponent === "D" && !theirDWasProvoked)
			return ["D", memory]

		return ["C", memory]
	}

	// In an unproductive DD loop, occasionally test for recovery only if this
	// opponent has cooperated before. Never donate points to a pure defector.
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
		const history =
			state && Array.isArray(state.history) ? state.history : []
		const [move, nextMemory] = decide(history, memory)
		return [move === "C" ? "C" : "D", nextMemory]
	} catch {
		// A conservative valid move is much better than forfeiting the battle.
		return ["D", memory ?? freshMemory()]
	}
}
