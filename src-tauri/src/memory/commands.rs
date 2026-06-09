use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use super::codex_audit::{
    run_codex_audit_for_root, CodexAuditMode, CodexAuditRun, RealCodexExecRunner,
};
use super::correction::{
    draft_correction as build_correction_draft,
    draft_correction_from_content as build_correction_draft_from_content, write_correction_note,
    CorrectionDraft,
};
use super::parser::{parse_entries, MemoryEntry};
use super::paths::resolve_memory_root;
use super::risk::{detect_risks, RiskFlag};
use super::scanner::{scan_sources, MemorySource};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub root: String,
    pub sources: Vec<MemorySource>,
    pub entries: Vec<MemoryEntry>,
    pub risks: Vec<RiskFlag>,
}

#[tauri::command]
pub fn scan_memories(root_override: Option<String>) -> Result<ScanResult, String> {
    let root = resolve_memory_root(root_override);
    let sources = scan_sources(&root).map_err(|err| err.to_string())?;
    let mut entries = Vec::new();

    for source in &sources {
        let text = fs::read_to_string(&source.path).map_err(|err| err.to_string())?;
        entries.extend(parse_entries(&source.relative_path, &text));
    }

    let risks = detect_risks(&entries);
    Ok(ScanResult {
        root: root.to_string_lossy().to_string(),
        sources,
        entries,
        risks,
    })
}

#[tauri::command]
pub fn get_source_excerpt(
    root_override: Option<String>,
    path: String,
    start_line: usize,
    end_line: usize,
) -> Result<String, String> {
    let root = resolve_memory_root(root_override);
    let path = PathBuf::from(path);
    ensure_inside_root(&path, &root)?;
    let text = fs::read_to_string(&path).map_err(|err| err.to_string())?;
    let lines = text
        .lines()
        .enumerate()
        .filter_map(|(idx, line)| {
            let line_no = idx + 1;
            (line_no >= start_line && line_no <= end_line).then(|| line.to_string())
        })
        .collect::<Vec<_>>();
    Ok(lines.join("\n"))
}

#[tauri::command]
pub fn draft_correction(
    root_override: Option<String>,
    slug: String,
    bullet_lines: Vec<String>,
) -> Result<CorrectionDraft, String> {
    let root = resolve_memory_root(root_override);
    Ok(build_correction_draft(&root, &slug, &bullet_lines))
}

#[tauri::command]
pub fn draft_correction_from_content(
    root_override: Option<String>,
    slug: String,
    content: String,
) -> Result<CorrectionDraft, String> {
    let root = resolve_memory_root(root_override);
    Ok(build_correction_draft_from_content(&root, &slug, &content))
}

#[tauri::command]
pub fn write_correction(
    root_override: Option<String>,
    draft: CorrectionDraft,
) -> Result<String, String> {
    let root = resolve_memory_root(root_override);
    let path = write_correction_note(&draft, &root).map_err(|err| err.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn run_codex_audit(
    root_override: Option<String>,
    mode: CodexAuditMode,
) -> Result<CodexAuditRun, String> {
    let root = resolve_memory_root(root_override);
    run_codex_audit_for_root(&root, mode, &RealCodexExecRunner)
}

fn ensure_inside_root(path: &Path, root: &Path) -> Result<(), String> {
    let root = fs::canonicalize(root).map_err(|err| err.to_string())?;
    let path = fs::canonicalize(path).map_err(|err| err.to_string())?;
    if path.starts_with(root) {
        Ok(())
    } else {
        Err("source path must stay inside the selected memory root".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_excerpt_path_traversal_outside_root() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("memory");
        fs::create_dir_all(&root).unwrap();
        fs::write(temp.path().join("outside.md"), "outside").unwrap();

        let err = get_source_excerpt(
            Some(root.to_string_lossy().to_string()),
            root.join("../outside.md").to_string_lossy().to_string(),
            1,
            1,
        )
        .unwrap_err();

        assert_eq!(err, "source path must stay inside the selected memory root");
    }
}
