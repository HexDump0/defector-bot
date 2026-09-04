use std::{fs, path::Path};

use anyhow::{Context as _, Result, bail};
use serde::{Deserialize, Deserializer, Serialize};

use crate::transpile::transpile_typescript;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Snapshot {
    pub scraped_at: String,
    #[serde(rename = "site_activeBots")]
    pub site_active_bots: usize,
    #[serde(rename = "site_allBattles")]
    pub site_all_battles: u64,
    pub count: usize,
    pub bots: Vec<Bot>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bot {
    pub id: String,
    pub name: String,
    #[serde(default, deserialize_with = "deserialize_active")]
    pub active: bool,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub mean_score: f64,
    #[serde(default)]
    pub cur_scores: Vec<f64>,
    #[serde(default)]
    pub stats: BotStats,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct BotStats {
    #[serde(default)]
    pub wins: u64,
    #[serde(default)]
    pub losses: u64,
    #[serde(default)]
    pub battles: u64,
}

#[derive(Debug, Clone)]
pub struct CompiledBot {
    pub id: String,
    pub name: String,
    pub javascript: String,
    pub source_hash: String,
}

impl Snapshot {
    pub fn load(path: &Path) -> Result<Self> {
        let bytes = fs::read(path)
            .with_context(|| format!("failed to read snapshot {}", path.display()))?;
        let snapshot: Self = serde_json::from_slice(&bytes)
            .with_context(|| format!("failed to parse snapshot {}", path.display()))?;
        if snapshot.count != snapshot.bots.len() {
            bail!(
                "snapshot count says {} but contains {} bots",
                snapshot.count,
                snapshot.bots.len()
            );
        }
        Ok(snapshot)
    }

    pub fn compile_all(&self) -> Result<Vec<CompiledBot>> {
        self.bots.iter().map(Bot::compile).collect()
    }

    pub fn find(&self, query: &str) -> Result<&Bot> {
        let exact = self
            .bots
            .iter()
            .find(|bot| bot.id == query || bot.name.eq_ignore_ascii_case(query));
        if let Some(bot) = exact {
            return Ok(bot);
        }

        let query = query.to_ascii_lowercase();
        let mut matches = self
            .bots
            .iter()
            .filter(|bot| {
                bot.id.to_ascii_lowercase().starts_with(&query)
                    || bot.name.to_ascii_lowercase().contains(&query)
            })
            .collect::<Vec<_>>();
        match matches.len() {
            0 => bail!("no bot matches {query:?}"),
            1 => Ok(matches.remove(0)),
            _ => bail!(
                "ambiguous bot query {query:?}: {}",
                matches
                    .iter()
                    .map(|bot| bot.name.as_str())
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
        }
    }
}

impl Bot {
    pub fn compile(&self) -> Result<CompiledBot> {
        CompiledBot::from_source(self.id.clone(), self.name.clone(), &self.source)
    }
}

impl CompiledBot {
    pub fn from_source(id: String, name: String, source: &str) -> Result<Self> {
        use sha2::{Digest, Sha256};

        if source.len() > 50_000 {
            bail!(
                "source is {} bytes; tournament limit is 50000",
                source.len()
            );
        }
        let javascript = transpile_typescript(source, &format!("{id}.ts"))?;
        let source_hash = hex::encode(Sha256::digest(javascript.as_bytes()));
        Ok(Self {
            id,
            name,
            javascript,
            source_hash,
        })
    }
}

fn deserialize_active<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Active {
        Bool(bool),
        String(String),
    }

    Ok(match Active::deserialize(deserializer)? {
        Active::Bool(active) => active,
        Active::String(active) => active == "active" || active == "true",
    })
}
