use crate::agent_config::AgentKind;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use serde_yaml::Value as YamlValue;
use sha2::{Digest, Sha256};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use toml_edit::{DocumentMut, Item};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum McpScope {
    Global,
    Project,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum McpTransport {
    Stdio,
    Http,
    Sse,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub scope: McpScope,
    pub scope_label: String,
    pub transport: McpTransport,
    pub endpoint: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct McpInventory {
    pub generated_at: String,
    pub agent: AgentKind,
    pub config_paths: Vec<String>,
    pub servers: Vec<McpServer>,
}

#[tauri::command]
pub fn load_mcp_inventory(agent: AgentKind) -> Result<McpInventory, String> {
    let path = default_config_path(agent)?;
    load_mcp_inventory_from_path(agent, &path)
}

fn default_config_path(agent: AgentKind) -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "home directory is unavailable".to_string())?;
    Ok(match agent {
        AgentKind::Codex => env_path("CODEX_HOME")
            .unwrap_or_else(|| home.join(".codex"))
            .join("config.toml"),
        AgentKind::ClaudeCode => home.join(".claude.json"),
        AgentKind::Hermes => env_path("HERMES_HOME")
            .unwrap_or_else(|| home.join(".hermes"))
            .join("config.yaml"),
    })
}

fn env_path(name: &str) -> Option<PathBuf> {
    env::var_os(name)
        .map(PathBuf::from)
        .filter(|path| !path.as_os_str().is_empty())
}

fn load_mcp_inventory_from_path(agent: AgentKind, path: &Path) -> Result<McpInventory, String> {
    let mut config_paths = vec![path.to_path_buf()];
    let mut servers = if path.is_file() {
        match agent {
            AgentKind::Codex => parse_codex(path)?,
            AgentKind::ClaudeCode => {
                let (servers, project_paths) = parse_claude(path)?;
                config_paths.extend(project_paths);
                servers
            }
            AgentKind::Hermes => parse_hermes(path)?,
        }
    } else {
        Vec::new()
    };
    servers.sort_by(|left, right| {
        left.name
            .cmp(&right.name)
            .then(left.scope_label.cmp(&right.scope_label))
    });
    Ok(McpInventory {
        generated_at: Utc::now().to_rfc3339(),
        agent,
        config_paths: config_paths
            .into_iter()
            .map(|path| path.to_string_lossy().to_string())
            .collect(),
        servers,
    })
}

fn parse_codex(path: &Path) -> Result<Vec<McpServer>, String> {
    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let document =
        DocumentMut::from_str(&text).map_err(|_| "failed to parse Codex MCP config".to_string())?;
    let Some(table) = document.get("mcp_servers").and_then(Item::as_table) else {
        return Ok(Vec::new());
    };
    Ok(table
        .iter()
        .map(|(name, item)| {
            let command = toml_string(item, "command");
            let url = toml_string(item, "url");
            McpServer {
                id: server_id(AgentKind::Codex, "global", name),
                name: name.to_string(),
                scope: McpScope::Global,
                scope_label: "Global".to_string(),
                transport: transport(
                    toml_string(item, "type").as_deref(),
                    command.as_deref(),
                    url.as_deref(),
                ),
                endpoint: safe_endpoint(command.as_deref(), url.as_deref()),
                enabled: enabled(toml_bool(item, "enabled"), toml_bool(item, "disabled")),
            }
        })
        .collect())
}

fn parse_claude(path: &Path) -> Result<(Vec<McpServer>, Vec<PathBuf>), String> {
    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let root: JsonValue = serde_json::from_str(&text)
        .map_err(|_| "failed to parse Claude Code MCP config".to_string())?;
    let mut servers = Vec::new();
    let mut config_paths = Vec::new();
    append_json_servers(
        AgentKind::ClaudeCode,
        root.get("mcpServers"),
        McpScope::Global,
        "Global",
        "user",
        &mut servers,
    );
    if let Some(projects) = root.get("projects").and_then(JsonValue::as_object) {
        for (project_path, project) in projects {
            let label = project_label(project_path);
            append_json_servers(
                AgentKind::ClaudeCode,
                project.get("mcpServers"),
                McpScope::Project,
                &label,
                &format!("local:{project_path}"),
                &mut servers,
            );
            let shared_path = Path::new(project_path).join(".mcp.json");
            if shared_path.is_file() {
                let shared_text = fs::read_to_string(&shared_path).map_err(|error| {
                    format!(
                        "failed to read Claude Code project MCP config {}: {error}",
                        shared_path.display()
                    )
                })?;
                let shared_root: JsonValue = serde_json::from_str(&shared_text).map_err(|_| {
                    format!(
                        "failed to parse Claude Code project MCP config {}",
                        shared_path.display()
                    )
                })?;
                append_json_servers(
                    AgentKind::ClaudeCode,
                    shared_root.get("mcpServers"),
                    McpScope::Project,
                    &format!("{label} · shared"),
                    &format!("project:{}", shared_path.display()),
                    &mut servers,
                );
                config_paths.push(shared_path);
            }
        }
    }
    Ok((servers, config_paths))
}

fn append_json_servers(
    agent: AgentKind,
    value: Option<&JsonValue>,
    scope: McpScope,
    scope_label: &str,
    id_scope: &str,
    out: &mut Vec<McpServer>,
) {
    let Some(servers) = value.and_then(JsonValue::as_object) else {
        return;
    };
    for (name, config) in servers {
        let command = json_string(config, "command");
        let url = json_string(config, "url");
        out.push(McpServer {
            id: server_id(agent, id_scope, name),
            name: name.to_string(),
            scope: scope.clone(),
            scope_label: scope_label.to_string(),
            transport: transport(
                json_string(config, "type").as_deref(),
                command.as_deref(),
                url.as_deref(),
            ),
            endpoint: safe_endpoint(command.as_deref(), url.as_deref()),
            enabled: enabled(
                config.get("enabled").and_then(JsonValue::as_bool),
                config.get("disabled").and_then(JsonValue::as_bool),
            ),
        });
    }
}

fn parse_hermes(path: &Path) -> Result<Vec<McpServer>, String> {
    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let root: YamlValue =
        serde_yaml::from_str(&text).map_err(|_| "failed to parse Hermes MCP config".to_string())?;
    let Some(servers) = yaml_get(&root, "mcp_servers").and_then(YamlValue::as_mapping) else {
        return Ok(Vec::new());
    };
    let mut output = Vec::new();
    for (name, config) in servers {
        let Some(name) = name.as_str() else {
            continue;
        };
        let command = yaml_string(config, "command");
        let url = yaml_string(config, "url");
        output.push(McpServer {
            id: server_id(AgentKind::Hermes, "global", name),
            name: name.to_string(),
            scope: McpScope::Global,
            scope_label: "Global".to_string(),
            transport: transport(
                yaml_string(config, "transport")
                    .or_else(|| yaml_string(config, "type"))
                    .as_deref(),
                command.as_deref(),
                url.as_deref(),
            ),
            endpoint: safe_endpoint(command.as_deref(), url.as_deref()),
            enabled: enabled(yaml_bool(config, "enabled"), yaml_bool(config, "disabled")),
        });
    }
    Ok(output)
}

fn toml_string(item: &Item, key: &str) -> Option<String> {
    item.as_table()?.get(key)?.as_str().map(str::to_string)
}

fn toml_bool(item: &Item, key: &str) -> Option<bool> {
    item.as_table()?.get(key)?.as_bool()
}

fn json_string(value: &JsonValue, key: &str) -> Option<String> {
    value.get(key)?.as_str().map(str::to_string)
}

fn yaml_get<'a>(value: &'a YamlValue, key: &str) -> Option<&'a YamlValue> {
    value.as_mapping()?.get(YamlValue::String(key.to_string()))
}

fn yaml_string(value: &YamlValue, key: &str) -> Option<String> {
    yaml_get(value, key)?.as_str().map(str::to_string)
}

fn yaml_bool(value: &YamlValue, key: &str) -> Option<bool> {
    yaml_get(value, key)?.as_bool()
}

fn enabled(enabled: Option<bool>, disabled: Option<bool>) -> bool {
    enabled.unwrap_or_else(|| !disabled.unwrap_or(false))
}

fn transport(kind: Option<&str>, command: Option<&str>, url: Option<&str>) -> McpTransport {
    match kind.unwrap_or_default().to_ascii_lowercase().as_str() {
        "stdio" => McpTransport::Stdio,
        "sse" => McpTransport::Sse,
        "http" | "streamable-http" => McpTransport::Http,
        _ if command.is_some() => McpTransport::Stdio,
        _ if url.is_some() => McpTransport::Http,
        _ => McpTransport::Unknown,
    }
}

fn safe_endpoint(command: Option<&str>, url: Option<&str>) -> String {
    if let Some(command) = command.filter(|value| !value.trim().is_empty()) {
        return Path::new(command)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("local command")
            .to_string();
    }
    if let Some(url) = url.filter(|value| !value.trim().is_empty()) {
        return safe_origin(url);
    }
    "Configured endpoint".to_string()
}

fn safe_origin(url: &str) -> String {
    let Some((scheme, remainder)) = url.split_once("://") else {
        return "Remote endpoint".to_string();
    };
    let authority = remainder.split(['/', '?', '#']).next().unwrap_or_default();
    let host = authority.rsplit('@').next().unwrap_or_default();
    if host.is_empty() {
        "Remote endpoint".to_string()
    } else {
        format!("{scheme}://{host}")
    }
}

fn project_label(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or("Project")
        .to_string()
}

fn server_id(agent: AgentKind, scope: &str, name: &str) -> String {
    let agent = match agent {
        AgentKind::Codex => "codex",
        AgentKind::ClaudeCode => "claudeCode",
        AgentKind::Hermes => "hermes",
    };
    format!(
        "{:x}",
        Sha256::digest(format!("{agent}:{scope}:{name}").as_bytes())
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn reads_codex_servers_without_serializing_args_or_env() {
        let temp = tempdir().unwrap();
        let path = temp.path().join("config.toml");
        fs::write(
            &path,
            r#"
[mcp_servers.context7]
command = "/opt/homebrew/bin/npx"
args = ["-y", "secret-package-token"]
enabled = false

[mcp_servers.context7.env]
API_KEY = "top-secret"
"#,
        )
        .unwrap();

        let inventory = load_mcp_inventory_from_path(AgentKind::Codex, &path).unwrap();
        let serialized = serde_json::to_string(&inventory).unwrap();

        assert_eq!(inventory.servers.len(), 1);
        assert_eq!(inventory.servers[0].endpoint, "npx");
        assert!(!inventory.servers[0].enabled);
        assert!(!serialized.contains("top-secret"));
        assert!(!serialized.contains("secret-package-token"));
        assert!(!serialized.contains("API_KEY"));
    }

    #[test]
    fn reads_claude_global_and_project_servers_with_redacted_url() {
        let temp = tempdir().unwrap();
        let path = temp.path().join(".claude.json");
        let project = temp.path().join("demo");
        fs::create_dir_all(&project).unwrap();
        fs::write(
            project.join(".mcp.json"),
            r#"{"mcpServers":{"shared":{"type":"stdio","command":"node","args":["shared-secret"]}}}"#,
        )
        .unwrap();
        let config = serde_json::json!({
            "mcpServers": {
                "global": {"type":"stdio","command":"/usr/bin/node","args":["secret"]}
            },
            "projects": {
                project.to_string_lossy().to_string(): {
                    "mcpServers": {
                        "remote": {"type":"http","url":"https://user:token@example.com/private?key=secret"}
                    }
                }
            }
        });
        fs::write(&path, serde_json::to_vec(&config).unwrap()).unwrap();

        let inventory = load_mcp_inventory_from_path(AgentKind::ClaudeCode, &path).unwrap();
        let serialized = serde_json::to_string(&inventory).unwrap();

        assert_eq!(inventory.servers.len(), 3);
        assert_eq!(inventory.config_paths.len(), 2);
        assert!(inventory
            .servers
            .iter()
            .any(|server| server.endpoint == "https://example.com"));
        assert!(!serialized.contains("token"));
        assert!(!serialized.contains("private"));
        assert!(!serialized.contains("secret"));
    }

    #[test]
    fn reads_hermes_servers_without_environment_values() {
        let temp = tempdir().unwrap();
        let path = temp.path().join("config.yaml");
        fs::write(
            &path,
            "mcp_servers:\n  mnemosyne:\n    command: /usr/local/bin/uvx\n    args: [secret]\n    env:\n      TOKEN: hidden\n  remote:\n    url: https://user:token@example.com/private\n    transport: sse\n    enabled: false\n",
        )
        .unwrap();

        let inventory = load_mcp_inventory_from_path(AgentKind::Hermes, &path).unwrap();
        let serialized = serde_json::to_string(&inventory).unwrap();

        assert_eq!(inventory.servers[0].endpoint, "uvx");
        let remote = inventory
            .servers
            .iter()
            .find(|server| server.name == "remote")
            .unwrap();
        assert_eq!(remote.transport, McpTransport::Sse);
        assert!(!remote.enabled);
        assert_eq!(remote.endpoint, "https://example.com");
        assert!(!serialized.contains("hidden"));
        assert!(!serialized.contains("TOKEN"));
        assert!(!serialized.contains("secret"));
    }

    #[test]
    fn redacts_credentials_and_queries_from_remote_origins() {
        assert_eq!(
            safe_origin("https://user:token@example.com?api_key=secret"),
            "https://example.com"
        );
        assert_eq!(
            safe_origin("https://example.com#access_token=secret"),
            "https://example.com"
        );
    }
}
