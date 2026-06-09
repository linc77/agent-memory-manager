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
}
