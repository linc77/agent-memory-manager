use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionDraft {
    pub slug: String,
    pub content: String,
    pub target_path: String,
}

pub fn draft_correction(memory_root: &Path, slug: &str, bullet_lines: &[String]) -> CorrectionDraft {
    let timestamp = Local::now().format("%Y%m%d-%H%M%S").to_string();
    let safe_slug = slug
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' {
                ch.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string();
    let slug = if safe_slug.is_empty() {
        "memory-update".to_string()
    } else {
        safe_slug
    };
    let target_path = memory_root
        .join("extensions/ad_hoc/notes")
        .join(format!("{}-{}.md", timestamp, slug));
    let mut content = String::from("Memory update request:\n\n");
    for line in bullet_lines.iter().filter(|line| !line.trim().is_empty()) {
        content.push_str("- ");
        content.push_str(line.trim());
        content.push('\n');
    }

    CorrectionDraft {
        slug,
        content,
        target_path: target_path.to_string_lossy().to_string(),
    }
}

pub fn write_correction_note(
    draft: &CorrectionDraft,
    memory_root: &Path,
) -> std::io::Result<PathBuf> {
    let allowed_dir = memory_root.join("extensions/ad_hoc/notes");
    fs::create_dir_all(&allowed_dir)?;
    let target = PathBuf::from(&draft.target_path);
    if !target.starts_with(&allowed_dir) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "correction notes can only be written under extensions/ad_hoc/notes",
        ));
    }

    let tmp = target.with_extension("md.tmp");
    {
        let mut file = fs::File::create(&tmp)?;
        file.write_all(draft.content.as_bytes())?;
        file.sync_all()?;
    }
    fs::rename(tmp, &target)?;
    Ok(target)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_correction_only_under_ad_hoc_notes() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        let draft = draft_correction(
            root,
            "profile-stack-update",
            &["The user's primary technical stack is Python/Rust.".to_string()],
        );

        let written = write_correction_note(&draft, root).unwrap();

        assert!(written.starts_with(root.join("extensions/ad_hoc/notes")));
        assert!(written.is_file());
    }

    #[test]
    fn rejects_correction_outside_ad_hoc_notes() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        let draft = CorrectionDraft {
            slug: "bad".to_string(),
            content: "Memory update request:\n".to_string(),
            target_path: root.join("MEMORY.md").to_string_lossy().to_string(),
        };

        let err = write_correction_note(&draft, root).unwrap_err();

        assert_eq!(err.kind(), std::io::ErrorKind::PermissionDenied);
    }
}
