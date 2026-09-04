use std::rc::Rc;
#[cfg(not(target_os = "linux"))]
use std::time::Instant;

use anyhow::{Result, anyhow, bail};
use boa_engine::{
    Context, JsValue, Module, Source, builtins::promise::PromiseState, js_string,
    module::IdleModuleLoader,
};
use serde_json::Value;

use crate::{battle::Move, model::CompiledBot};

const MAX_SOURCE_BYTES: usize = 50_000;
const MAX_BOUNDARY_BYTES: usize = 1_000_000;
const MAX_LOOP_ITERATIONS: u64 = 2_000_000;

pub struct Sandbox {
    context: Context,
    function: boa_engine::object::JsObject,
    timeout_ns: u128,
}

pub struct CallOutput {
    pub movement: Move,
    pub memory: Value,
    pub elapsed_ns: u128,
}

impl Sandbox {
    pub fn new(bot: &CompiledBot, seed: u64, timeout_ms: u64) -> Result<Self> {
        if bot.javascript.len() > MAX_SOURCE_BYTES {
            bail!(
                "source is {} bytes; tournament limit is {MAX_SOURCE_BYTES}",
                bot.javascript.len()
            );
        }

        let loader = Rc::new(IdleModuleLoader);
        let mut context = Context::builder()
            .module_loader(loader)
            .build()
            .map_err(|error| anyhow!("failed to create Boa context: {error:?}"))?;
        let limits = context.runtime_limits_mut();
        limits.set_stack_size_limit(131_072);
        limits.set_recursion_limit(4_096);
        limits.set_loop_iteration_limit(MAX_LOOP_ITERATIONS);

        // Boa uses host entropy for Math.random(). Installing a tiny deterministic
        // PRNG makes experiments repeatable while preserving independent per-bot
        // streams. It is installed before module evaluation, like a realm builtin.
        let random_seed = (seed as u32).max(1);
        let seed_script = format!(
            "let __defectorSeed={random_seed}>>>0;\
             Math.random=function(){{let t=__defectorSeed+=0x6D2B79F5;\
             t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);\
             return((t^t>>>14)>>>0)/4294967296;}};"
        );
        context
            .eval(Source::from_bytes(seed_script.as_bytes()))
            .map_err(|error| js_error("failed to seed Math.random", error, &mut context))?;

        let module = Module::parse(
            Source::from_bytes(bot.javascript.as_bytes()),
            None,
            &mut context,
        )
        .map_err(|error| js_error("module parse failed", error, &mut context))?;
        let promise = module.load_link_evaluate(&mut context);
        context
            .run_jobs()
            .map_err(|error| js_error("module evaluation failed", error, &mut context))?;
        match promise.state() {
            PromiseState::Fulfilled(_) => {}
            PromiseState::Rejected(error) => {
                bail!(
                    "module evaluation rejected: {}",
                    display_value(&error, &mut context)
                )
            }
            PromiseState::Pending => bail!("module evaluation did not settle"),
        }

        let value = module
            .get_value(js_string!("default"), &mut context)
            .map_err(|error| js_error("could not read default export", error, &mut context))?;
        let function = value
            .as_object()
            .filter(|object| object.is_callable())
            .ok_or_else(|| anyhow!("default export is not callable"))?;

        Ok(Self {
            context,
            function,
            timeout_ns: u128::from(timeout_ms) * 1_000_000,
        })
    }

    pub fn call(&mut self, state: &Value) -> Result<CallOutput> {
        let boundary_bytes = serde_json::to_vec(state)?.len();
        if boundary_bytes > MAX_BOUNDARY_BYTES {
            bail!("maximum memory boundary of 1 MB exceeded");
        }

        let input = JsValue::from_json(state, &mut self.context)
            .map_err(|error| js_error("state conversion failed", error, &mut self.context))?;
        let cpu_start = thread_cpu_time_ns();
        let output = self
            .function
            .call(&JsValue::undefined(), &[input], &mut self.context)
            .map_err(|error| js_error("bot error", error, &mut self.context))?;
        let cpu_ns = thread_cpu_time_ns().saturating_sub(cpu_start);
        if cpu_ns > self.timeout_ns {
            bail!(
                "maximum execution time of {} ms exceeded ({:.3} ms of thread CPU in Boa)",
                self.timeout_ns / 1_000_000,
                cpu_ns as f64 / 1_000_000.0
            );
        }

        let array = output
            .as_object()
            .ok_or_else(|| anyhow!("must return a [move, memory] tuple"))?;
        if !array.is_array() {
            bail!("must return a [move, memory] tuple");
        }
        let length = array
            .get(js_string!("length"), &mut self.context)
            .map_err(|error| js_error("could not inspect return tuple", error, &mut self.context))?
            .as_number()
            .unwrap_or(-1.0);
        if length != 2.0 {
            bail!("must return a [move, memory] tuple, instead got length {length}");
        }

        let move_value = array
            .get(0, &mut self.context)
            .map_err(|error| js_error("could not read returned move", error, &mut self.context))?;
        let move_text = move_value
            .as_string()
            .map(|value| value.to_std_string_escaped())
            .unwrap_or_default();
        let movement = match move_text.as_str() {
            "C" => Move::Cooperate,
            "D" => Move::Defect,
            _ => bail!("returned invalid move {move_text:?}"),
        };

        let memory_value = array.get(1, &mut self.context).map_err(|error| {
            js_error("could not read returned memory", error, &mut self.context)
        })?;
        let memory = memory_value
            .to_json(&mut self.context)
            .map_err(|error| js_error("memory is not JSON-safe", error, &mut self.context))?
            .unwrap_or(Value::Null);
        let memory_bytes = serde_json::to_vec(&memory)?.len();
        if memory_bytes > MAX_BOUNDARY_BYTES {
            bail!("maximum memory boundary of 1 MB exceeded");
        }

        Ok(CallOutput {
            movement,
            memory,
            elapsed_ns: cpu_ns,
        })
    }
}

#[cfg(target_os = "linux")]
fn thread_cpu_time_ns() -> u128 {
    let mut time = libc::timespec {
        tv_sec: 0,
        tv_nsec: 0,
    };
    // SAFETY: `time` is a valid writable timespec and CLOCK_THREAD_CPUTIME_ID
    // does not retain its pointer.
    let result = unsafe { libc::clock_gettime(libc::CLOCK_THREAD_CPUTIME_ID, &mut time) };
    if result == 0 {
        time.tv_sec as u128 * 1_000_000_000 + time.tv_nsec as u128
    } else {
        0
    }
}

#[cfg(not(target_os = "linux"))]
fn thread_cpu_time_ns() -> u128 {
    // Wall time is the conservative fallback on non-Linux platforms.
    use std::sync::OnceLock;
    static ORIGIN: OnceLock<Instant> = OnceLock::new();
    ORIGIN.get_or_init(Instant::now).elapsed().as_nanos()
}

fn js_error(prefix: &str, error: boa_engine::JsError, context: &mut Context) -> anyhow::Error {
    match error.into_opaque(context) {
        Ok(opaque) => anyhow!("{prefix}: {}", display_value(&opaque, context)),
        Err(error) => anyhow!("{prefix}: {error:?}"),
    }
}

fn display_value(value: &JsValue, context: &mut Context) -> String {
    value
        .to_string(context)
        .map(|text| text.to_std_string_escaped())
        .unwrap_or_else(|_| value.display().to_string())
}
