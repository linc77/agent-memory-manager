use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "camelCase")]
pub enum MemoryTopic {
    Profile,
    Projects,
    Rules,
    Tools,
    Writing,
    Overrides,
    Sources,
    StaleRisks,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryEntry {
    pub id: String,
    pub topic: MemoryTopic,
    pub title: String,
    pub summary: String,
    pub search_text: String,
    pub source_path: String,
    pub start_line: usize,
    pub end_line: usize,
}

pub fn parse_entries(relative_path: &str, text: &str) -> Vec<MemoryEntry> {
    let mut entries = Vec::new();
    let mut current_title = String::from("Document");
    let mut current_start = 1usize;
    let mut current_lines = Vec::new();

    for (idx, line) in text.lines().enumerate() {
        let line_no = idx + 1;
        if line.starts_with("# ") || line.starts_with("## ") {
            flush_entry(
                relative_path,
                &current_title,
                current_start,
                line_no.saturating_sub(1),
                &current_lines,
                &mut entries,
            );
            current_title = line.trim_start_matches('#').trim().to_string();
            current_start = line_no;
            current_lines.clear();
        }
        current_lines.push(line.to_string());
    }

    flush_entry(
        relative_path,
        &current_title,
        current_start,
        text.lines().count().max(current_start),
        &current_lines,
        &mut entries,
    );
    entries
}

fn flush_entry(
    relative_path: &str,
    title: &str,
    start_line: usize,
    end_line: usize,
    lines: &[String],
    out: &mut Vec<MemoryEntry>,
) {
    let body = lines.join("\n");
    let summary = body
        .lines()
        .map(str::trim)
        .find(|line| {
            !line.is_empty()
                && !line.starts_with('#')
                && !line.eq_ignore_ascii_case("memory update request:")
        })
        .unwrap_or(title)
        .trim()
        .trim_start_matches("- ")
        .chars()
        .take(220)
        .collect::<String>();
    if summary.trim().is_empty() {
        return;
    }

    out.push(MemoryEntry {
        id: format!("{}:{}-{}", relative_path, start_line, end_line),
        topic: infer_topic(relative_path, title, &body),
        title: title.to_string(),
        summary,
        search_text: body,
        source_path: relative_path.to_string(),
        start_line,
        end_line,
    });
}

fn infer_topic(path: &str, title: &str, body: &str) -> MemoryTopic {
    let text = format!("{} {} {}", path, title, body).to_lowercase();
    if path.contains("ad_hoc/notes") || text.contains("memory update request") {
        MemoryTopic::Overrides
    } else if text.contains("user profile")
        || text.contains("技术栈")
        || text.contains("primary technical stack")
    {
        MemoryTopic::Profile
    } else if text.contains("project")
        || text.contains("beebotos")
        || text.contains("sub2api")
        || text.contains("dilidili")
    {
        MemoryTopic::Projects
    } else if text.contains("preference")
        || text.contains("规则")
        || text.contains("中文输出")
        || text.contains("tool")
    {
        MemoryTopic::Rules
    } else if text.contains("codex")
        || text.contains("mcp")
        || text.contains("skills")
        || text.contains("openai")
    {
        MemoryTopic::Tools
    } else if text.contains("writing") || text.contains("公众号") || text.contains("写作") {
        MemoryTopic::Writing
    } else {
        MemoryTopic::Sources
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_profile_stack_entries() {
        let entries = parse_entries(
            "extensions/ad_hoc/notes/profile.md",
            "Memory update request:\n\n- The user's primary technical stack has shifted to Python/Rust.\n",
        );

        assert!(entries.iter().any(|entry| entry.topic == MemoryTopic::Overrides));
        assert!(entries
            .iter()
            .any(|entry| entry.summary.contains("Python/Rust")));
    }

    #[test]
    fn keeps_full_search_text_for_multi_bullet_notes() {
        let entries = parse_entries(
            "extensions/ad_hoc/notes/profile.md",
            "Memory update request:\n\n- `dilidili` is no longer active.\n- The user's primary technical stack has shifted to Python/Rust.\n",
        );

        let entry = entries.first().expect("expected one note entry");

        assert!(entry.summary.contains("dilidili"));
        assert!(entry.search_text.contains("Python/Rust"));
    }
}
