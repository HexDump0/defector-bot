use std::path::Path;

use defector_lab::{BattleConfig, CompiledBot, LocalLeague, Snapshot, play_battle};

fn bot(name: &str, body: &str) -> CompiledBot {
    CompiledBot::from_source(name.into(), name.into(), body).unwrap()
}

#[test]
fn all_c_vs_all_d_matches_official_payoff_matrix() {
    let all_c = bot("all-c", "export default () => ['C', null]");
    let all_d = bot("all-d", "export default () => ['D', null]");
    let result = play_battle(
        [&all_c, &all_d],
        BattleConfig {
            seed: 7,
            rounds: Some(100),
            timeout_ms: 100,
        },
    );
    assert_eq!(result.completed_rounds, 100);
    assert_eq!(result.scores, [0.0, 3.0]);
    assert_eq!(result.errors, [None, None]);
}

#[test]
fn state_and_memory_are_threaded_from_each_bots_perspective() {
    let tft = bot(
        "tft",
        "export default ({history, memory}) => history.length === 0\
         ? ['C', {calls: 1}]\
         : [history[history.length - 1].opponent, {calls: memory.calls + 1}]",
    );
    let all_d = bot("all-d", "export default () => ['D', null]");
    let result = play_battle(
        [&tft, &all_d],
        BattleConfig {
            seed: 9,
            rounds: Some(4),
            timeout_ms: 100,
        },
    );
    assert_eq!(result.completed_rounds, 4);
    assert_eq!(result.moves[0][0].as_str(), "C");
    assert!(
        result.moves[1..]
            .iter()
            .all(|moves| moves[0].as_str() == "D")
    );
    assert_eq!(result.scores, [0.75, 1.5]);
}

#[test]
fn scraped_snapshot_recreates_imported_top_rank() {
    let path = Path::new("data/scraped_bots_2026-09-04/bots.json");
    let snapshot = Snapshot::load(path).unwrap();
    let compiled = snapshot.compile_all().unwrap();
    let league = LocalLeague::from_snapshot(&snapshot, compiled).unwrap();
    let board = league.leaderboard();
    assert_eq!(snapshot.bots.len(), 62);
    assert_eq!(board[0].name, "goatbotv1.6");
    assert!((board[0].mean_score - snapshot.bots[0].mean_score).abs() < 1e-12);
}

#[test]
fn candidate_is_valid_at_short_typical_and_long_tail_lengths() {
    let source = std::fs::read_to_string("bots/candidate.ts").unwrap();
    let candidate =
        CompiledBot::from_source("candidate".into(), "candidate".into(), &source).unwrap();
    for rounds in [100, 120, 160, 500] {
        let result = play_battle(
            [&candidate, &candidate],
            BattleConfig {
                seed: rounds as u64,
                rounds: Some(rounds),
                timeout_ms: 100,
            },
        );
        assert_eq!(result.completed_rounds, rounds);
        assert_eq!(result.errors, [None, None]);
        assert_eq!(result.scores, [2.0, 2.0]);
    }
}
