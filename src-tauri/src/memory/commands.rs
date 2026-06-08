use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use super::correction::{
    draft_correction as build_correction_draft, write_correction_note, CorrectionDraft,
};
use super::parser::{parse_entries, MemoryEntry};
use super::paths::resolve_memory_root;
use super::risk::{detect_risks, RiskFlag};
use super::scanner::{scan_sources, MemorySource};

#[derive(Debug, Clone, Serialize, Deserialize)]
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
pub fn write_correction(
    root_override: Option<String>,
    draft: CorrectionDraft,
) -> Result<String, String> {
    let root = resolve_memory_root(root_override);
    let path = write_correction_note(&draft, &root).map_err(|err| err.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

fn ensure_inside_root(path: &Path, root: &Path) -> Result<(), String> {
    if path.starts_with(root) {
        Ok(())
    } else {
        Err("source path must stay inside the selected memory root".to_string())
    }
}
