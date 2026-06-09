use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CorrectionDraft {
    pub slug: String,
    pub content: String,
    pub target_path: String,
}

pub fn draft_correction(
    memory_root: &Path,
    slug: &str,
    bullet_lines: &[String],
) -> CorrectionDraft {
    let (slug, target_path) = correction_target(memory_root, slug);
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

pub fn draft_correction_from_content(
    memory_root: &Path,
    slug: &str,
    content: &str,
) -> CorrectionDraft {
    let (slug, target_path) = correction_target(memory_root, slug);
    let content = normalize_correction_content(content);

    CorrectionDraft {
        slug,
        content,
        target_path: target_path.to_string_lossy().to_string(),
    }
}

fn correction_target(memory_root: &Path, slug: &str) -> (String, PathBuf) {
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
    (slug, target_path)
}

fn normalize_correction_content(content: &str) -> String {
    let trimmed = content.trim();
    if trimmed.to_lowercase().starts_with("memory update request:") {
        format!("{trimmed}\n")
    } else {
        format!("Memory update request:\n\n{trimmed}\n")
    }
}

pub fn write_correction_note(
    draft: &CorrectionDraft,
    memory_root: &Path,
) -> std::io::Result<PathBuf> {
    let allowed_dir = memory_root.join("extensions/ad_hoc/notes");
    fs::create_dir_all(&allowed_dir)?;
    let allowed_dir = fs::canonicalize(&allowed_dir)?;
    let target = PathBuf::from(&draft.target_path);
    let target_parent = target.parent().ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "correction notes can only be written under extensions/ad_hoc/notes",
        )
    })?;
    let target_parent = fs::canonicalize(target_parent)?;
    if target_parent != allowed_dir || target.extension().and_then(|ext| ext.to_str()) != Some("md")
    {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "correction notes can only be written under extensions/ad_hoc/notes",
        ));
    }

    if target.try_exists()? {
        return Err(std::io::Error::new(
            std::io::ErrorKind::AlreadyExists,
            "correction note target already exists",
        ));
    }

    let tmp = target.with_extension("md.tmp");
    {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&tmp)?;
        file.write_all(draft.content.as_bytes())?;
        file.sync_all()?;
    }
    finalize_new_correction_target(&tmp, &target)?;
    Ok(target)
}

fn finalize_new_correction_target(tmp: &Path, target: &Path) -> std::io::Result<()> {
    if let Err(err) = fs::hard_link(tmp, target) {
        let _ = fs::remove_file(tmp);
        return Err(err);
    }
    fs::remove_file(tmp)
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

    #[test]
    fn rejects_correction_path_traversal_outside_notes() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        let target = root.join("extensions/ad_hoc/notes/../outside.md");
        let draft = CorrectionDraft {
            slug: "bad".to_string(),
            content: "Memory update request:\n".to_string(),
            target_path: target.to_string_lossy().to_string(),
        };

        let err = write_correction_note(&draft, root).unwrap_err();

        assert_eq!(err.kind(), std::io::ErrorKind::PermissionDenied);
    }

    #[test]
    fn rejects_non_markdown_correction_target() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        let draft = CorrectionDraft {
            slug: "bad".to_string(),
            content: "Memory update request:\n".to_string(),
            target_path: root
                .join("extensions/ad_hoc/notes/bad.txt")
                .to_string_lossy()
                .to_string(),
        };

        let err = write_correction_note(&draft, root).unwrap_err();

        assert_eq!(err.kind(), std::io::ErrorKind::PermissionDenied);
    }

    #[test]
    fn rejects_existing_correction_target() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        let draft = draft_correction(
            root,
            "profile-stack-update",
            &["The user's primary technical stack is Python/Rust.".to_string()],
        );
        fs::create_dir_all(root.join("extensions/ad_hoc/notes")).unwrap();
        fs::write(&draft.target_path, "existing").unwrap();

        let err = write_correction_note(&draft, root).unwrap_err();

        assert_eq!(err.kind(), std::io::ErrorKind::AlreadyExists);
    }

    #[test]
    fn rejects_existing_temp_correction_target() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        let draft = draft_correction(
            root,
            "profile-stack-update",
            &["The user's primary technical stack is Python/Rust.".to_string()],
        );
        let tmp = PathBuf::from(&draft.target_path).with_extension("md.tmp");
        fs::create_dir_all(tmp.parent().unwrap()).unwrap();
        fs::write(&tmp, "existing tmp").unwrap();

        let err = write_correction_note(&draft, root).unwrap_err();

        assert_eq!(err.kind(), std::io::ErrorKind::AlreadyExists);
    }

    #[test]
    fn finalize_rejects_target_created_after_temp_write() {
        let temp = tempfile::tempdir().unwrap();
        let tmp = temp.path().join("correction.md.tmp");
        let target = temp.path().join("correction.md");
        fs::write(&tmp, "draft").unwrap();
        fs::write(&target, "existing").unwrap();

        let err = finalize_new_correction_target(&tmp, &target).unwrap_err();

        assert_eq!(err.kind(), std::io::ErrorKind::AlreadyExists);
        assert_eq!(fs::read_to_string(&target).unwrap(), "existing");
        assert!(!tmp.exists());
    }

    #[test]
    fn drafts_correction_from_suggested_content() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();

        let draft = draft_correction_from_content(
            root,
            "Clarify Current Stack",
            "Memory update request:\n\n- The user's current stack is Python/Rust.",
        );

        assert_eq!(draft.slug, "clarify-current-stack");
        assert!(draft.target_path.contains("extensions/ad_hoc/notes"));
        assert!(draft.content.contains("Python/Rust"));
        assert_eq!(draft.content.matches("Memory update request:").count(), 1);
    }
}
