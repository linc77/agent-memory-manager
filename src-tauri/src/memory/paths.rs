use crate::agent_config::AgentKind;
use std::env;
use std::path::PathBuf;

pub fn default_memory_root() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".codex")
        .join("memories")
}

pub fn resolve_memory_root(override_path: Option<String>) -> PathBuf {
    override_path
        .and_then(|value| {
            let trimmed = value.trim();
            (!trimmed.is_empty()).then(|| expand_home_path(trimmed))
        })
        .unwrap_or_else(default_memory_root)
}

pub fn default_agent_memory_root(agent: AgentKind) -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    match agent {
        AgentKind::Codex => default_memory_root(),
        AgentKind::ClaudeCode => env::var_os("CLAUDE_CONFIG_DIR")
            .map(PathBuf::from)
            .filter(|path| !path.as_os_str().is_empty())
            .unwrap_or_else(|| home.join(".claude"))
            .join("projects"),
        AgentKind::Hermes => env::var_os("HERMES_HOME")
            .map(PathBuf::from)
            .filter(|path| !path.as_os_str().is_empty())
            .unwrap_or_else(|| home.join(".hermes"))
            .join("memories"),
    }
}

pub fn resolve_agent_memory_root(agent: AgentKind, override_path: Option<String>) -> PathBuf {
    override_path
        .and_then(|value| {
            let trimmed = value.trim();
            (!trimmed.is_empty()).then(|| expand_home_path(trimmed))
        })
        .unwrap_or_else(|| default_agent_memory_root(agent))
}

fn expand_home_path(path: &str) -> PathBuf {
    let Some(home) = dirs::home_dir() else {
        return PathBuf::from(path);
    };

    if path == "~" {
        home
    } else if let Some(rest) = path.strip_prefix("~/") {
        home.join(rest)
    } else {
        PathBuf::from(path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uses_override_path_when_provided() {
        let path = resolve_memory_root(Some("/tmp/custom-memory".to_string()));

        assert_eq!(path, std::path::PathBuf::from("/tmp/custom-memory"));
    }

    #[test]
    fn trims_override_path() {
        let path = resolve_memory_root(Some("  /tmp/custom-memory  ".to_string()));

        assert_eq!(path, std::path::PathBuf::from("/tmp/custom-memory"));
    }

    #[test]
    fn expands_home_override_path() {
        let home = dirs::home_dir().unwrap();
        let path = resolve_memory_root(Some("~/.codex/memories".to_string()));

        assert_eq!(path, home.join(".codex/memories"));
    }

    #[test]
    fn resolves_agent_specific_default_roots() {
        let home = dirs::home_dir().unwrap();

        assert_eq!(
            default_agent_memory_root(AgentKind::Codex),
            home.join(".codex/memories")
        );
        if std::env::var_os("CLAUDE_CONFIG_DIR").is_none() {
            assert_eq!(
                default_agent_memory_root(AgentKind::ClaudeCode),
                home.join(".claude/projects")
            );
        }
        if std::env::var_os("HERMES_HOME").is_none() {
            assert_eq!(
                default_agent_memory_root(AgentKind::Hermes),
                home.join(".hermes/memories")
            );
        }
    }
}
