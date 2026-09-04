use std::time::Instant;

use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::{model::CompiledBot, sandbox::Sandbox};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Move {
    #[serde(rename = "C")]
    Cooperate,
    #[serde(rename = "D")]
    Defect,
}

impl Move {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Cooperate => "C",
            Self::Defect => "D",
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct BattleConfig {
    pub seed: u64,
    pub rounds: Option<usize>,
    pub timeout_ms: u64,
}

impl Default for BattleConfig {
    fn default() -> Self {
        Self {
            seed: 1,
            rounds: None,
            timeout_ms: 10,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BattleResult {
    pub planned_rounds: usize,
    pub completed_rounds: usize,
    pub moves: Vec<[Move; 2]>,
    pub errors: [Option<String>; 2],
    pub scores: [f64; 2],
    pub elapsed_ns: u128,
    pub bot_call_ns: u128,
    pub max_move_ns: u128,
}

#[derive(Debug, Clone, Serialize)]
struct RoundView {
    you: Move,
    opponent: Move,
}

pub fn play_battle(bots: [&CompiledBot; 2], config: BattleConfig) -> BattleResult {
    let started = Instant::now();
    let mut rng = ChaCha8Rng::seed_from_u64(config.seed);
    let planned_rounds = config.rounds.unwrap_or_else(|| sample_rounds(&mut rng));
    let sandbox_seeds = [rng.random(), rng.random()];
    let attempts = [
        Sandbox::new(bots[0], sandbox_seeds[0], config.timeout_ms),
        Sandbox::new(bots[1], sandbox_seeds[1], config.timeout_ms),
    ];
    let mut errors: [Option<String>; 2] = [
        attempts[0].as_ref().err().map(ToString::to_string),
        attempts[1].as_ref().err().map(ToString::to_string),
    ];
    let [first, second] = attempts;
    let mut sandboxes = [first.ok(), second.ok()];

    let mut histories: [Vec<RoundView>; 2] = [Vec::new(), Vec::new()];
    let mut memories = [Value::Null, Value::Null];
    let mut moves = Vec::with_capacity(planned_rounds);
    let mut bot_call_ns = 0_u128;
    let mut max_move_ns = 0_u128;

    if errors.iter().all(Option::is_none) {
        for _ in 0..planned_rounds {
            let mut round_moves = [Move::Cooperate, Move::Cooperate];
            let mut next_memories = [Value::Null, Value::Null];
            let mut round_errored = false;

            for index in 0..2 {
                let state = json!({
                    "history": histories[index],
                    "memory": memories[index],
                });
                match sandboxes[index]
                    .as_mut()
                    .expect("checked above")
                    .call(&state)
                {
                    Ok(output) => {
                        round_moves[index] = output.movement;
                        next_memories[index] = output.memory;
                        bot_call_ns += output.elapsed_ns;
                        max_move_ns = max_move_ns.max(output.elapsed_ns);
                    }
                    Err(error) => {
                        errors[index] = Some(error.to_string());
                        round_errored = true;
                    }
                }
            }

            if round_errored {
                break;
            }

            memories = next_memories;
            histories[0].push(RoundView {
                you: round_moves[0],
                opponent: round_moves[1],
            });
            histories[1].push(RoundView {
                you: round_moves[1],
                opponent: round_moves[0],
            });
            moves.push(round_moves);
        }
    }

    let scores = calculate_scores(&moves, &errors);
    BattleResult {
        planned_rounds,
        completed_rounds: moves.len(),
        moves,
        errors,
        scores,
        elapsed_ns: started.elapsed().as_nanos(),
        bot_call_ns,
        max_move_ns,
    }
}

pub fn sample_rounds(rng: &mut impl Rng) -> usize {
    let uniform: f64 = rng.random();
    (100.0 - 20.0 * (-uniform).ln_1p()).floor() as usize
}

pub fn calculate_scores(rounds: &[[Move; 2]], errors: &[Option<String>; 2]) -> [f64; 2] {
    match (errors[0].is_some(), errors[1].is_some()) {
        (true, true) => return [0.0, 0.0],
        (true, false) => return [0.0, 3.0],
        (false, true) => return [3.0, 0.0],
        (false, false) => {}
    }

    let mut totals = [0.0, 0.0];
    for round in rounds {
        let pair = match round {
            [Move::Cooperate, Move::Cooperate] => [2.0, 2.0],
            [Move::Cooperate, Move::Defect] => [0.0, 3.0],
            [Move::Defect, Move::Cooperate] => [3.0, 0.0],
            [Move::Defect, Move::Defect] => [1.0, 1.0],
        };
        totals[0] += pair[0];
        totals[1] += pair[1];
    }
    if rounds.is_empty() {
        return [0.0, 0.0];
    }
    let count = rounds.len() as f64;
    [totals[0] / count, totals[1] / count]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scoring_matches_current_matrix_and_forfeits() {
        let rounds = [
            [Move::Cooperate, Move::Cooperate],
            [Move::Defect, Move::Cooperate],
            [Move::Defect, Move::Defect],
        ];
        assert_eq!(calculate_scores(&rounds, &[None, None]), [2.0, 1.0]);
        assert_eq!(
            calculate_scores(&rounds, &[Some("bad".into()), None]),
            [0.0, 3.0]
        );
    }

    #[test]
    fn sampled_battles_are_never_shorter_than_100() {
        let mut rng = ChaCha8Rng::seed_from_u64(9);
        assert!((0..10_000).all(|_| sample_rounds(&mut rng) >= 100));
    }
}
