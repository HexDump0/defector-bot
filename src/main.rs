use std::{
    fs,
    path::{Path, PathBuf},
    time::Instant,
};

use anyhow::{Context, Result, bail};
use clap::{Parser, Subcommand};
use defector_lab::{
    BattleConfig, CompiledBot, LocalLeague, Snapshot, evaluate_candidate, play_battle,
};
use rayon::ThreadPoolBuilder;

const DEFAULT_SNAPSHOT: &str = "data/scraped_bots_2026-09-04/bots.json";

#[derive(Debug, Parser)]
#[command(name = "defector-lab", version, about)]
struct Cli {
    /// Scraped bots.json to load.
    #[arg(long, global = true, default_value = DEFAULT_SNAPSHOT)]
    snapshot: PathBuf,

    /// Worker threads used for independent battles (0 = Rayon default).
    #[arg(long, global = true, default_value_t = 0)]
    threads: usize,

    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Inspect the scraped population and its imported live leaderboard.
    Info {
        #[arg(long)]
        json: bool,
    },
    /// Transpile and execute every scraped bot against a safe smoke opponent.
    Validate {
        #[arg(long, default_value_t = 10)]
        timeout_ms: u64,
        #[arg(long)]
        json: bool,
    },
    /// Play one battle. Bot arguments accept an id, name, or unique substring.
    Battle {
        first: String,
        second: String,
        #[arg(long, default_value_t = 1)]
        seed: u64,
        /// Override the official random round count.
        #[arg(long)]
        rounds: Option<usize>,
        #[arg(long, default_value_t = 10)]
        timeout_ms: u64,
        #[arg(long)]
        json: bool,
    },
    /// Score a candidate TypeScript/JavaScript bot against the scraped population.
    Evaluate {
        candidate: PathBuf,
        #[arg(long, default_value = "candidate")]
        name: String,
        /// Battles per opponent.
        #[arg(long, default_value_t = 10)]
        repetitions: usize,
        #[arg(long, default_value_t = 1)]
        seed: u64,
        #[arg(long, default_value_t = 10)]
        timeout_ms: u64,
        #[arg(long)]
        json: bool,
    },
    /// Continue the official weighted tournament locally and print its top 20.
    Tournament {
        #[arg(long, default_value_t = 1_000)]
        battles: usize,
        #[arg(long, default_value_t = 1)]
        seed: u64,
        /// Optionally add a fresh candidate with zero prior battles.
        #[arg(long)]
        candidate: Option<PathBuf>,
        #[arg(long, default_value = "candidate")]
        candidate_name: String,
        #[arg(long, default_value_t = 10)]
        timeout_ms: u64,
        #[arg(long)]
        json: bool,
    },
    /// Benchmark real-corpus tournament throughput.
    Benchmark {
        #[arg(long, default_value_t = 100)]
        battles: usize,
        #[arg(long, default_value_t = 42)]
        seed: u64,
        #[arg(long, default_value_t = 10)]
        timeout_ms: u64,
        #[arg(long)]
        json: bool,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    if cli.threads == 0 {
        run(cli)
    } else {
        ThreadPoolBuilder::new()
            .num_threads(cli.threads)
            .build()
            .context("failed to create worker pool")?
            .install(|| run(cli))
    }
}

fn run(cli: Cli) -> Result<()> {
    let snapshot = Snapshot::load(&cli.snapshot)?;
    match cli.command {
        Command::Info { json } => info(&snapshot, json),
        Command::Validate { timeout_ms, json } => validate(&snapshot, timeout_ms, json),
        Command::Battle {
            first,
            second,
            seed,
            rounds,
            timeout_ms,
            json,
        } => battle(&snapshot, &first, &second, seed, rounds, timeout_ms, json),
        Command::Evaluate {
            candidate,
            name,
            repetitions,
            seed,
            timeout_ms,
            json,
        } => evaluate(
            &snapshot,
            &candidate,
            &name,
            repetitions,
            seed,
            timeout_ms,
            json,
        ),
        Command::Tournament {
            battles,
            seed,
            candidate,
            candidate_name,
            timeout_ms,
            json,
        } => tournament(
            &snapshot,
            battles,
            seed,
            candidate.as_deref(),
            &candidate_name,
            timeout_ms,
            json,
        ),
        Command::Benchmark {
            battles,
            seed,
            timeout_ms,
            json,
        } => benchmark(&snapshot, battles, seed, timeout_ms, json),
    }
}

fn info(snapshot: &Snapshot, json_output: bool) -> Result<()> {
    if json_output {
        println!("{}", serde_json::to_string_pretty(snapshot)?);
        return Ok(());
    }
    println!(
        "snapshot={}  bots={}  active={}  site_battles={}",
        snapshot.scraped_at,
        snapshot.bots.len(),
        snapshot.bots.iter().filter(|bot| bot.active).count(),
        snapshot.site_all_battles
    );
    println!("\n imported leaderboard");
    println!(" rank  score     battles  bot");
    for (index, bot) in snapshot.bots.iter().take(20).enumerate() {
        println!(
            " {:>4}  {:>7.4}  {:>7}  {}",
            index + 1,
            bot.mean_score,
            bot.stats.battles,
            truncate(&bot.name, 56)
        );
    }
    Ok(())
}

fn validate(snapshot: &Snapshot, timeout_ms: u64, json_output: bool) -> Result<()> {
    let started = Instant::now();
    let compiled = snapshot.compile_all()?;
    let safe = CompiledBot::from_source(
        "smoke".into(),
        "smoke cooperator".into(),
        "export default function(){return ['C',null]}",
    )?;
    let outcomes = compiled
        .iter()
        .enumerate()
        .map(|(index, bot)| {
            let result = play_battle(
                [bot, &safe],
                BattleConfig {
                    seed: index as u64 + 1,
                    rounds: Some(3),
                    timeout_ms,
                },
            );
            serde_json::json!({
                "id": bot.id,
                "name": bot.name,
                "hash": bot.source_hash,
                "ok": result.errors[0].is_none() && result.completed_rounds == 3,
                "error": result.errors[0],
            })
        })
        .collect::<Vec<_>>();
    let failures = outcomes.iter().filter(|value| value["ok"] == false).count();
    if json_output {
        println!(
            "{}",
            serde_json::to_string_pretty(&serde_json::json!({
                "bots": outcomes.len(),
                "failures": failures,
                "elapsedSeconds": started.elapsed().as_secs_f64(),
                "results": outcomes,
            }))?
        );
    } else {
        for outcome in outcomes.iter().filter(|value| value["ok"] == false) {
            println!(
                "FAIL {:<30} {}",
                truncate(outcome["name"].as_str().unwrap_or("?"), 30),
                outcome["error"].as_str().unwrap_or("unknown error")
            );
        }
        println!(
            "validated {} bots: {} passed, {} failed in {:.3}s",
            outcomes.len(),
            outcomes.len() - failures,
            failures,
            started.elapsed().as_secs_f64()
        );
    }
    if failures > 0 {
        bail!("{failures} bot(s) failed validation");
    }
    Ok(())
}

fn battle(
    snapshot: &Snapshot,
    first: &str,
    second: &str,
    seed: u64,
    rounds: Option<usize>,
    timeout_ms: u64,
    json_output: bool,
) -> Result<()> {
    let first = resolve_bot(snapshot, first)?;
    let second = resolve_bot(snapshot, second)?;
    let result = play_battle(
        [&first, &second],
        BattleConfig {
            seed,
            rounds,
            timeout_ms,
        },
    );
    if json_output {
        println!("{}", serde_json::to_string_pretty(&result)?);
    } else {
        println!("{} vs {}", first.name, second.name);
        println!(
            "score {:.6} : {:.6}  rounds {}/{}  elapsed {:.3} ms",
            result.scores[0],
            result.scores[1],
            result.completed_rounds,
            result.planned_rounds,
            result.elapsed_ns as f64 / 1_000_000.0
        );
        if result.errors.iter().any(Option::is_some) {
            println!("errors: {:?}", result.errors);
        }
        let preview = result
            .moves
            .iter()
            .take(40)
            .map(|moves| format!("{}{}", moves[0].as_str(), moves[1].as_str()))
            .collect::<Vec<_>>()
            .join(" ");
        println!(
            "moves: {preview}{}",
            if result.moves.len() > 40 { " …" } else { "" }
        );
    }
    Ok(())
}

fn evaluate(
    snapshot: &Snapshot,
    candidate_path: &Path,
    name: &str,
    repetitions: usize,
    seed: u64,
    timeout_ms: u64,
    json_output: bool,
) -> Result<()> {
    if repetitions == 0 {
        bail!("repetitions must be at least 1");
    }
    let candidate = load_candidate(candidate_path, name)?;
    let opponents = snapshot.compile_all()?;
    let evaluation = evaluate_candidate(
        &candidate,
        snapshot,
        &opponents,
        repetitions,
        seed,
        timeout_ms,
    );
    if json_output {
        println!("{}", serde_json::to_string_pretty(&evaluation)?);
    } else {
        println!(
            "{}  hash={}\n{} battles vs {} bots, seed={}, {:.2} battles/s",
            evaluation.candidate,
            &evaluation.source_hash[..12],
            evaluation.battles,
            evaluation.opponents,
            evaluation.seed,
            evaluation.battles_per_second,
        );
        println!(
            "weighted score={:.6}  opponent={:.6}  diff={:+.6}\n95% CI [{:.6}, {:.6}]  p05/p50/p95={:.3}/{:.3}/{:.3}  candidate/opponent failures={}/{}  max move={:.3} ms",
            evaluation.weighted_mean_score,
            evaluation.weighted_opponent_score,
            evaluation.weighted_differential,
            evaluation.confidence_95[0],
            evaluation.confidence_95[1],
            evaluation.percentiles[0],
            evaluation.percentiles[1],
            evaluation.percentiles[2],
            evaluation.failures,
            evaluation.opponent_failures,
            evaluation.max_move_ms,
        );
        println!("\n score    opp      diff     weight   opponent");
        for row in &evaluation.by_opponent {
            println!(
                " {:>7.4}  {:>7.4}  {:+7.4}  {:>6.3}%  {}{}",
                row.candidate_score,
                row.opponent_score,
                row.differential,
                row.exposure_weight * 100.0,
                truncate(&row.name, 48),
                if row.candidate_failures > 0 {
                    " [CANDIDATE FAILED]"
                } else if row.opponent_failures > 0 {
                    " [OPPONENT FAILED]"
                } else {
                    ""
                }
            );
        }
    }
    Ok(())
}

fn tournament(
    snapshot: &Snapshot,
    battles: usize,
    seed: u64,
    candidate_path: Option<&Path>,
    candidate_name: &str,
    timeout_ms: u64,
    json_output: bool,
) -> Result<()> {
    let compiled = snapshot.compile_all()?;
    let mut league = LocalLeague::from_snapshot(snapshot, compiled)?;
    if let Some(path) = candidate_path {
        league.add_candidate(load_candidate(path, candidate_name)?);
    }
    let run = league.run(battles, seed, timeout_ms);
    let leaderboard = league.leaderboard();
    if json_output {
        println!(
            "{}",
            serde_json::to_string_pretty(&serde_json::json!({
                "run": run,
                "leaderboard": leaderboard,
            }))?
        );
    } else {
        print_run(&run);
        print_leaderboard(&leaderboard);
    }
    Ok(())
}

fn benchmark(
    snapshot: &Snapshot,
    battles: usize,
    seed: u64,
    timeout_ms: u64,
    json_output: bool,
) -> Result<()> {
    let compile_started = Instant::now();
    let compiled = snapshot.compile_all()?;
    let compile_seconds = compile_started.elapsed().as_secs_f64();
    let mut league = LocalLeague::from_snapshot(snapshot, compiled)?;
    let run = league.run(battles, seed, timeout_ms);
    if json_output {
        println!(
            "{}",
            serde_json::to_string_pretty(&serde_json::json!({
                "compileSeconds": compile_seconds,
                "run": run,
            }))?
        );
    } else {
        println!(
            "transpiled {} real bots in {:.3}s ({:.1} bots/s)",
            snapshot.bots.len(),
            compile_seconds,
            snapshot.bots.len() as f64 / compile_seconds
        );
        print_run(&run);
    }
    Ok(())
}

fn load_candidate(path: &Path, name: &str) -> Result<CompiledBot> {
    let source = fs::read_to_string(path)
        .with_context(|| format!("failed to read candidate {}", path.display()))?;
    CompiledBot::from_source(format!("local:{name}"), name.into(), &source)
}

fn resolve_bot(snapshot: &Snapshot, query: &str) -> Result<CompiledBot> {
    let path = Path::new(query);
    if path.is_file() {
        let name = path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("local");
        load_candidate(path, name)
    } else {
        snapshot.find(query)?.compile()
    }
}

fn print_run(run: &defector_lab::league::LeagueRun) {
    println!(
        "simulated {} battles / {} rounds in {:.3}s: {:.2} battles/s, {:.0} rounds/s, failures={}, max move={:.3} ms",
        run.battles,
        run.total_rounds,
        run.elapsed_seconds,
        run.battles_per_second,
        run.rounds_per_second,
        run.failures,
        run.max_move_ms,
    );
}

fn print_leaderboard(rows: &[defector_lab::league::LeaderboardRow]) {
    println!("\n local leaderboard");
    println!(" rank  score     battles  W/L          window  bot");
    for row in rows {
        println!(
            " {:>4}  {:>7.4}  {:>7}  {:>5}/{:<5}  {:>6}  {}",
            row.rank,
            row.mean_score,
            row.battles,
            row.wins,
            row.losses,
            row.window,
            truncate(&row.name, 48)
        );
    }
}

fn truncate(value: &str, max_chars: usize) -> String {
    let mut chars = value.chars();
    let prefix = chars.by_ref().take(max_chars).collect::<String>();
    if chars.next().is_some() {
        format!("{prefix}…")
    } else {
        prefix
    }
}
