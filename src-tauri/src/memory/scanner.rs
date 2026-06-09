use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MemorySourceKind {
    Summary,
    Registry,
    Raw,
    RolloutSummary,
    AdHocNote,
    Chronicle,
    Skill,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemorySource {
    pub id: String,
    pub path: String,
    pub relative_path: String,
    pub kind: MemorySourceKind,
    pub modified_ms: u128,
    pub bytes: u64,
    pub lines: usize,
    pub sha256: String,
}

pub fn scan_sources(root: &Path) -> std::io::Result<Vec<MemorySource>> {
    let mut sources = Vec::new();
    collect_if_file(
        root,
        root,
        "memory_summary.md",
        MemorySourceKind::Summary,
        &mut sources,
    )?;
    collect_if_file(
        root,
        root,
        "MEMORY.md",
        MemorySourceKind::Registry,
        &mut sources,
    )?;
    collect_if_file(
        root,
        root,
        "raw_memories.md",
        MemorySourceKind::Raw,
        &mut sources,
    )?;
    collect_dir(
        root,
        &root.join("rollout_summaries"),
        MemorySourceKind::RolloutSummary,
        &mut sources,
    )?;
    collect_dir(
        root,
        &root.join("extensions/ad_hoc/notes"),
        MemorySourceKind::AdHocNote,
        &mut sources,
    )?;
    collect_dir(
        root,
        &root.join("extensions/chronicle/resources"),
        MemorySourceKind::Chronicle,
        &mut sources,
    )?;
    collect_skill_files(root, &root.join("skills"), &mut sources)?;
    sources.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    Ok(sources)
}

fn collect_if_file(
    root: &Path,
    base: &Path,
    name: &str,
    kind: MemorySourceKind,
    out: &mut Vec<MemorySource>,
) -> std::io::Result<()> {
    let path = base.join(name);
    if path.is_file() {
        out.push(read_source(root, &path, kind)?);
    }
    Ok(())
}

fn collect_dir(
    root: &Path,
    dir: &Path,
    kind: MemorySourceKind,
    out: &mut Vec<MemorySource>,
) -> std::io::Result<()> {
    if !dir.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        if path.extension().and_then(|ext| ext.to_str()) == Some("md") {
            out.push(read_source(root, &path, kind.clone())?);
        }
    }
    Ok(())
}

fn collect_skill_files(
    root: &Path,
    dir: &Path,
    out: &mut Vec<MemorySource>,
) -> std::io::Result<()> {
    if !dir.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(dir)? {
        let path = entry?.path().join("SKILL.md");
        if path.is_file() {
            out.push(read_source(root, &path, MemorySourceKind::Skill)?);
        }
    }
    Ok(())
}

fn read_source(root: &Path, path: &Path, kind: MemorySourceKind) -> std::io::Result<MemorySource> {
    let text = fs::read_to_string(path)?;
    let metadata = fs::metadata(path)?;
    let modified_ms = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    let sha256 = format!("{:x}", Sha256::digest(text.as_bytes()));
    let relative_path = path
        .strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .to_string();

    Ok(MemorySource {
        id: sha256.chars().take(16).collect(),
        path: path.to_string_lossy().to_string(),
        relative_path,
        kind,
        modified_ms,
        bytes: metadata.len(),
        lines: text.lines().count(),
        sha256,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn scans_known_memory_sources() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        fs::write(root.join("MEMORY.md"), "# Task Group: Example\n").unwrap();
        fs::create_dir_all(root.join("extensions/ad_hoc/notes")).unwrap();
        fs::write(
            root.join("extensions/ad_hoc/notes/one.md"),
            "Memory update request:\n",
        )
        .unwrap();

        let sources = scan_sources(root).unwrap();

        assert_eq!(sources.len(), 2);
        assert!(sources
            .iter()
            .any(|source| source.kind == MemorySourceKind::Registry));
        assert!(sources
            .iter()
            .any(|source| source.kind == MemorySourceKind::AdHocNote));
    }
}
