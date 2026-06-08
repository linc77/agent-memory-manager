use serde::{Deserialize, Serialize};

use super::parser::MemoryEntry;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RiskKind {
    StaleConflict,
    CoveredByOverride,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiskFlag {
    pub id: String,
    pub kind: RiskKind,
    pub title: String,
    pub detail: String,
    pub entry_id: String,
}

pub fn detect_risks(entries: &[MemoryEntry]) -> Vec<RiskFlag> {
    let text = entries
        .iter()
        .map(|entry| format!("{} {}", entry.title, entry.summary))
        .collect::<Vec<_>>()
        .join("\n")
        .to_lowercase();
    let mut flags = Vec::new();

    if text.contains("java") && text.contains("spring boot") && text.contains("python/rust") {
        if let Some(entry) = entries.iter().find(|entry| {
            let value = format!("{} {}", entry.title, entry.summary).to_lowercase();
            value.contains("java") || value.contains("spring boot")
        }) {
            flags.push(RiskFlag {
                id: "profile-stack-conflict".to_string(),
                kind: RiskKind::StaleConflict,
                title: "Profile stack conflict".to_string(),
                detail: "Old Java/Spring Boot profile conflicts with newer Python/Rust override."
                    .to_string(),
                entry_id: entry.id.clone(),
            });
        }
    }

    if text.contains("dilidili") && text.contains("no longer an active project") {
        if let Some(entry) = entries.iter().find(|entry| {
            format!("{} {}", entry.title, entry.summary)
                .to_lowercase()
                .contains("dilidili")
        }) {
            flags.push(RiskFlag {
                id: "dilidili-active-project-conflict".to_string(),
                kind: RiskKind::CoveredByOverride,
                title: "Project activity override".to_string(),
                detail: "`dilidili` appears in older project memory but is covered by a newer inactive-project override.".to_string(),
                entry_id: entry.id.clone(),
            });
        }
    }

    flags
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::memory::parser::{MemoryEntry, MemoryTopic};

    #[test]
    fn detects_stack_conflict_from_old_and_new_profile_entries() {
        let entries = vec![
            MemoryEntry {
                id: "old".to_string(),
                topic: MemoryTopic::Profile,
                title: "Old profile".to_string(),
                summary: "Java / Spring Boot full-stack developer".to_string(),
                search_text: "Java / Spring Boot full-stack developer".to_string(),
                source_path: "MEMORY.md".to_string(),
                start_line: 1,
                end_line: 2,
            },
            MemoryEntry {
                id: "new".to_string(),
                topic: MemoryTopic::Overrides,
                title: "Memory update request".to_string(),
                summary: "The user's primary technical stack has shifted to Python/Rust."
                    .to_string(),
                search_text: "The user's primary technical stack has shifted to Python/Rust."
                    .to_string(),
                source_path: "extensions/ad_hoc/notes/profile.md".to_string(),
                start_line: 1,
                end_line: 3,
            },
        ];

        let risks = detect_risks(&entries);

        assert!(risks
            .iter()
            .any(|risk| risk.id == "profile-stack-conflict"));
    }
}
