use std::path::PathBuf;

pub fn default_memory_root() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".codex")
        .join("memories")
}

pub fn resolve_memory_root(override_path: Option<String>) -> PathBuf {
    override_path
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(default_memory_root)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uses_override_path_when_provided() {
        let path = resolve_memory_root(Some("/tmp/custom-memory".to_string()));

        assert_eq!(path, std::path::PathBuf::from("/tmp/custom-memory"));
    }
}
