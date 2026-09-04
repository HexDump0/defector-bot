use std::path::Path;

use anyhow::{Result, bail};
use oxc::{
    allocator::Allocator,
    codegen::Codegen,
    parser::Parser,
    semantic::SemanticBuilder,
    span::SourceType,
    transformer::{TransformOptions, Transformer},
};

/// Mirrors the upstream TypeScript-to-JavaScript boundary. Oxc is deliberately
/// used only as a type stripper; module syntax is retained for Boa.
pub fn transpile_typescript(source: &str, filename: &str) -> Result<String> {
    let allocator = Allocator::default();
    let source_type = SourceType::ts();
    let parsed = Parser::new(&allocator, source, source_type).parse();
    if !parsed.diagnostics.is_empty() {
        bail!(
            "TypeScript parse failed for {filename}: {}",
            format_diagnostics(parsed.diagnostics.as_ref())
        );
    }

    let mut program = parsed.program;
    let semantic = SemanticBuilder::new()
        .with_check_syntax_error(true)
        .build(&program);
    if !semantic.diagnostics.is_empty() {
        bail!(
            "TypeScript semantic check failed for {filename}: {}",
            format_diagnostics(semantic.diagnostics.as_ref())
        );
    }

    let transformed = Transformer::new(
        &allocator,
        Path::new(filename),
        &TransformOptions::default(),
    )
    .build_with_scoping(semantic.semantic.into_scoping(), &mut program);
    if transformed.diagnostics.has_errors() {
        bail!(
            "TypeScript transform failed for {filename}: {}",
            format_diagnostics(transformed.diagnostics.as_ref())
        );
    }

    Ok(Codegen::new().build(&program).code)
}

fn format_diagnostics(diagnostics: &[oxc::diagnostics::OxcDiagnostic]) -> String {
    diagnostics
        .iter()
        .take(3)
        .map(ToString::to_string)
        .collect::<Vec<_>>()
        .join("; ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn removes_types_and_keeps_default_export() {
        let js = transpile_typescript(
            r#"type Move = "C" | "D";
               export default function bot(state: { memory: unknown }): [Move, unknown] {
                 return ["C", state.memory];
               }"#,
            "bot.ts",
        )
        .unwrap();
        assert!(!js.contains("type Move"));
        assert!(js.contains("export default function bot"));
    }
}
