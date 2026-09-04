use std::{cmp::Ordering, sync::Arc, time::Instant};

use anyhow::Result;
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use rayon::prelude::*;
use serde::Serialize;

use crate::{
    battle::{BattleConfig, BattleResult, play_battle},
    model::{BotStats, CompiledBot, Snapshot},
};

const SCORE_WINDOW: usize = 200;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpponentEvaluation {
    pub id: String,
    pub name: String,
    pub exposure_weight: f64,
    pub battles: usize,
    pub candidate_score: f64,
    pub opponent_score: f64,
    pub differential: f64,
    pub candidate_failures: usize,
    pub opponent_failures: usize,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub candidate_errors: Vec<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub opponent_errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Evaluation {
    pub candidate: String,
    pub source_hash: String,
    pub opponents: usize,
    pub battles: usize,
    pub seed: u64,
    pub weighted_mean_score: f64,
    pub weighted_opponent_score: f64,
    pub weighted_differential: f64,
    pub standard_error: f64,
    pub confidence_95: [f64; 2],
    pub percentiles: [f64; 3],
    pub failures: usize,
    pub opponent_failures: usize,
    pub elapsed_seconds: f64,
    pub battles_per_second: f64,
    pub max_move_ms: f64,
    pub by_opponent: Vec<OpponentEvaluation>,
}

pub fn evaluate_candidate(
    candidate: &CompiledBot,
    snapshot: &Snapshot,
    opponents: &[CompiledBot],
    repetitions: usize,
    seed: u64,
    timeout_ms: u64,
) -> Evaluation {
    let started = Instant::now();
    let exposure = opponent_exposure(snapshot, 1.0);
    let jobs = opponents
        .iter()
        .enumerate()
        .flat_map(|(opponent, _)| (0..repetitions).map(move |repetition| (opponent, repetition)))
        .collect::<Vec<_>>();

    let results = jobs
        .par_iter()
        .map(|&(opponent, repetition)| {
            let battle_seed = mix_seed(seed, opponent as u64, repetition as u64);
            let result = play_battle(
                [candidate, &opponents[opponent]],
                BattleConfig {
                    seed: battle_seed,
                    rounds: None,
                    timeout_ms,
                },
            );
            (opponent, result)
        })
        .collect::<Vec<_>>();

    let mut by_opponent = Vec::with_capacity(opponents.len());
    let mut all_scores = Vec::with_capacity(results.len());
    let mut max_move_ns = 0;
    let mut failures = 0;
    let mut opponent_failures = 0;
    for (index, opponent) in opponents.iter().enumerate() {
        let selected = results
            .iter()
            .filter(|(opponent_index, _)| *opponent_index == index)
            .map(|(_, result)| result)
            .collect::<Vec<_>>();
        let candidate_score = mean(selected.iter().map(|result| result.scores[0]));
        let opponent_score = mean(selected.iter().map(|result| result.scores[1]));
        let failed = selected
            .iter()
            .filter(|result| result.errors[0].is_some())
            .count();
        let opponent_failed = selected
            .iter()
            .filter(|result| result.errors[1].is_some())
            .count();
        let candidate_errors = selected
            .iter()
            .filter_map(|result| result.errors[0].clone())
            .collect::<Vec<_>>();
        let opponent_errors = selected
            .iter()
            .filter_map(|result| result.errors[1].clone())
            .collect::<Vec<_>>();
        failures += failed;
        opponent_failures += opponent_failed;
        for result in selected {
            all_scores.push(result.scores[0]);
            max_move_ns = max_move_ns.max(result.max_move_ns);
        }
        by_opponent.push(OpponentEvaluation {
            id: opponent.id.clone(),
            name: opponent.name.clone(),
            exposure_weight: exposure[index],
            battles: repetitions,
            candidate_score,
            opponent_score,
            differential: candidate_score - opponent_score,
            candidate_failures: failed,
            opponent_failures: opponent_failed,
            candidate_errors,
            opponent_errors,
        });
    }

    by_opponent.sort_by(|left, right| {
        left.candidate_score
            .partial_cmp(&right.candidate_score)
            .unwrap_or(Ordering::Equal)
            .then_with(|| left.name.cmp(&right.name))
    });
    let weighted_mean_score = by_opponent
        .iter()
        .map(|row| row.exposure_weight * row.candidate_score)
        .sum();
    let weighted_opponent_score = by_opponent
        .iter()
        .map(|row| row.exposure_weight * row.opponent_score)
        .sum();
    let standard_error = standard_error(&all_scores);
    let elapsed_seconds = started.elapsed().as_secs_f64();
    let percentiles = [
        percentile(&all_scores, 0.05),
        percentile(&all_scores, 0.50),
        percentile(&all_scores, 0.95),
    ];

    Evaluation {
        candidate: candidate.name.clone(),
        source_hash: candidate.source_hash.clone(),
        opponents: opponents.len(),
        battles: results.len(),
        seed,
        weighted_mean_score,
        weighted_opponent_score,
        weighted_differential: weighted_mean_score - weighted_opponent_score,
        standard_error,
        confidence_95: [
            weighted_mean_score - 1.96 * standard_error,
            weighted_mean_score + 1.96 * standard_error,
        ],
        percentiles,
        failures,
        opponent_failures,
        elapsed_seconds,
        battles_per_second: results.len() as f64 / elapsed_seconds,
        max_move_ms: max_move_ns as f64 / 1_000_000.0,
        by_opponent,
    }
}

#[derive(Debug, Clone)]
struct LeagueBot {
    compiled: Arc<CompiledBot>,
    active: bool,
    stats: BotStats,
    cur_scores: Vec<f64>,
}

impl LeagueBot {
    fn mean_score(&self) -> f64 {
        mean(self.cur_scores.iter().copied())
    }

    fn push_score(&mut self, score: f64) {
        if self.cur_scores.len() == SCORE_WINDOW {
            self.cur_scores.remove(0);
        }
        self.cur_scores.push(score);
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardRow {
    pub rank: usize,
    pub id: String,
    pub name: String,
    pub mean_score: f64,
    pub battles: u64,
    pub wins: u64,
    pub losses: u64,
    pub window: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeagueRun {
    pub battles: usize,
    pub seed: u64,
    pub failures: usize,
    pub elapsed_seconds: f64,
    pub battles_per_second: f64,
    pub rounds_per_second: f64,
    pub total_rounds: usize,
    pub max_move_ms: f64,
}

pub struct LocalLeague {
    bots: Vec<LeagueBot>,
}

impl LocalLeague {
    pub fn from_snapshot(snapshot: &Snapshot, compiled: Vec<CompiledBot>) -> Result<Self> {
        anyhow::ensure!(
            snapshot.bots.len() == compiled.len(),
            "compiled bot count does not match snapshot"
        );
        let bots = snapshot
            .bots
            .iter()
            .zip(compiled)
            .map(|(source, compiled)| LeagueBot {
                compiled: Arc::new(compiled),
                active: source.active,
                stats: source.stats.clone(),
                cur_scores: source.cur_scores.clone(),
            })
            .collect();
        Ok(Self { bots })
    }

    pub fn add_candidate(&mut self, candidate: CompiledBot) {
        self.bots.push(LeagueBot {
            compiled: Arc::new(candidate),
            active: true,
            stats: BotStats::default(),
            cur_scores: Vec::new(),
        });
    }

    pub fn run(&mut self, battles: usize, seed: u64, timeout_ms: u64) -> LeagueRun {
        let started = Instant::now();
        let mut rng = ChaCha8Rng::seed_from_u64(seed);
        let active = self
            .bots
            .iter()
            .enumerate()
            .filter_map(|(index, bot)| bot.active.then_some(index))
            .collect::<Vec<_>>();
        assert!(active.len() >= 2, "at least two active bots are required");

        // Selection depends only on lifetime battle counts. Precomputing the
        // exact schedule lets Boa battles run in parallel without changing the
        // official weighted-without-replacement matchmaking distribution.
        let mut counts = self
            .bots
            .iter()
            .map(|bot| bot.stats.battles)
            .collect::<Vec<_>>();
        let mut schedule = Vec::with_capacity(battles);
        for _ in 0..battles {
            let first = weighted_pick(&active, &counts, None, &mut rng);
            let second = weighted_pick(&active, &counts, Some(first), &mut rng);
            counts[first] += 1;
            counts[second] += 1;
            schedule.push((first, second, rng.random::<u64>()));
        }

        let compiled = self
            .bots
            .iter()
            .map(|bot| Arc::clone(&bot.compiled))
            .collect::<Vec<_>>();
        let results = schedule
            .par_iter()
            .map(|&(first, second, battle_seed)| {
                play_battle(
                    [&compiled[first], &compiled[second]],
                    BattleConfig {
                        seed: battle_seed,
                        rounds: None,
                        timeout_ms,
                    },
                )
            })
            .collect::<Vec<_>>();

        let mut failures = 0;
        let mut total_rounds = 0;
        let mut max_move_ns = 0;
        for (&(first, second, _), result) in schedule.iter().zip(&results) {
            apply_result(&mut self.bots, first, second, result);
            failures += result.errors.iter().filter(|error| error.is_some()).count();
            total_rounds += result.completed_rounds;
            max_move_ns = max_move_ns.max(result.max_move_ns);
        }
        let elapsed_seconds = started.elapsed().as_secs_f64();
        LeagueRun {
            battles,
            seed,
            failures,
            elapsed_seconds,
            battles_per_second: battles as f64 / elapsed_seconds,
            rounds_per_second: total_rounds as f64 / elapsed_seconds,
            total_rounds,
            max_move_ms: max_move_ns as f64 / 1_000_000.0,
        }
    }

    pub fn leaderboard(&self) -> Vec<LeaderboardRow> {
        let mut bots = self
            .bots
            .iter()
            .filter(|bot| bot.active && bot.stats.battles >= 10)
            .collect::<Vec<_>>();
        bots.sort_by(|left, right| {
            right
                .mean_score()
                .partial_cmp(&left.mean_score())
                .unwrap_or(Ordering::Equal)
                .then_with(|| left.compiled.name.cmp(&right.compiled.name))
        });
        bots.into_iter()
            .take(20)
            .enumerate()
            .map(|(rank, bot)| LeaderboardRow {
                rank: rank + 1,
                id: bot.compiled.id.clone(),
                name: bot.compiled.name.clone(),
                mean_score: bot.mean_score(),
                battles: bot.stats.battles,
                wins: bot.stats.wins,
                losses: bot.stats.losses,
                window: bot.cur_scores.len(),
            })
            .collect()
    }
}

fn apply_result(bots: &mut [LeagueBot], first: usize, second: usize, result: &BattleResult) {
    let [first_score, second_score] = result.scores;
    let first_won = first_score > second_score;
    let second_won = second_score > first_score;

    let (left, right) = if first < second {
        let (left, right) = bots.split_at_mut(second);
        (&mut left[first], &mut right[0])
    } else {
        let (left, right) = bots.split_at_mut(first);
        (&mut right[0], &mut left[second])
    };
    left.stats.battles += 1;
    right.stats.battles += 1;
    left.stats.wins += u64::from(first_won);
    left.stats.losses += u64::from(second_won);
    right.stats.wins += u64::from(second_won);
    right.stats.losses += u64::from(first_won);
    left.push_score(first_score);
    right.push_score(second_score);
}

fn weighted_pick(
    active: &[usize],
    battle_counts: &[u64],
    excluded: Option<usize>,
    rng: &mut impl Rng,
) -> usize {
    let total = active
        .iter()
        .filter(|&&index| Some(index) != excluded)
        .map(|&index| selection_weight(battle_counts[index]))
        .sum::<f64>();
    let mut draw = rng.random::<f64>() * total;
    for &index in active {
        if Some(index) == excluded {
            continue;
        }
        draw -= selection_weight(battle_counts[index]);
        if draw <= 0.0 {
            return index;
        }
    }
    *active
        .iter()
        .rev()
        .find(|&&index| Some(index) != excluded)
        .expect("an eligible bot exists")
}

fn selection_weight(battles: u64) -> f64 {
    (1.0 / (battles as f64 + 1.0)).max(0.05)
}

fn opponent_exposure(snapshot: &Snapshot, candidate_weight: f64) -> Vec<f64> {
    let weights = snapshot
        .bots
        .iter()
        .map(|bot| selection_weight(bot.stats.battles))
        .collect::<Vec<_>>();
    let total = candidate_weight + weights.iter().sum::<f64>();
    let raw = weights
        .iter()
        .map(|&weight| {
            candidate_weight / total * weight / (total - candidate_weight)
                + weight / total * candidate_weight / (total - weight)
        })
        .collect::<Vec<_>>();
    let sum = raw.iter().sum::<f64>();
    raw.into_iter().map(|weight| weight / sum).collect()
}

fn mix_seed(seed: u64, opponent: u64, repetition: u64) -> u64 {
    let mut value = seed ^ opponent.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    value ^= repetition.wrapping_mul(0xBF58_476D_1CE4_E5B9);
    value ^= value >> 30;
    value = value.wrapping_mul(0xBF58_476D_1CE4_E5B9);
    value ^ (value >> 27)
}

fn mean(values: impl Iterator<Item = f64>) -> f64 {
    let (sum, count) = values.fold((0.0, 0_usize), |(sum, count), value| {
        (sum + value, count + 1)
    });
    if count == 0 { 0.0 } else { sum / count as f64 }
}

fn standard_error(values: &[f64]) -> f64 {
    if values.len() < 2 {
        return 0.0;
    }
    let average = mean(values.iter().copied());
    let variance = values
        .iter()
        .map(|value| (value - average).powi(2))
        .sum::<f64>()
        / (values.len() - 1) as f64;
    (variance / values.len() as f64).sqrt()
}

fn percentile(values: &[f64], quantile: f64) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let mut sorted = values.to_vec();
    sorted.sort_by(f64::total_cmp);
    let index = ((sorted.len() - 1) as f64 * quantile).round() as usize;
    sorted[index]
}
