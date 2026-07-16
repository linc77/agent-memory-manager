# Global Agent Context Design

## Product Boundary

`selectedAgent` is the application context, not a tab local to provider
profiles. The Sidebar owns selection affordance; `App` owns the state and
passes it to Memory, Skills, MCP, and provider configuration consumers.

The UI must never silently fall back to Codex data for an unsupported Agent.
Agent-specific adapters may return an honest empty inventory.

## Frontend State Contract

- `AgentKind` remains the shared discriminant: `codex | claudeCode | hermes`.
- One module owns Agent metadata, storage validation, labels, marks, Skill tool
  mappings, and feature support.
- `readStoredAgent()` validates local storage and falls back to `codex`.
- `App` resets entry/search/transient Audit state when the Agent changes.
- TanStack Query keys include `AgentKind` for all Agent-scoped resources.

## Selector and Navigation

The Sidebar brand area becomes a compact popover trigger. Its closed state has
one mark, one Agent label, the active model or status, and a chevron. The menu
contains three radio-like options plus one provider-configuration action.
Escape and outside click close the menu, and ARIA menu/radio semantics expose
the state.

`agentManager` remains an internal `MemoryView` so the existing full-width
layout can be reused, but it is no longer a primary navigation item. `mcpManager`
is a new full-width read-only inventory view.

## Memory Data Flow

Codex retains the existing commands and write/audit pipeline. A new read-only
`load_agent_memory_snapshot(agent)` command handles Claude Code and Hermes:

1. Resolve the native Agent memory root with environment overrides.
2. Discover only that Agent's Markdown sources.
3. Parse entries and risks through the existing parser/truth pipeline.
4. Build an uncached deterministic profile for the response.
5. Return `{ agent, writable, scan, profile }`.

Claude Code discovery walks one project level and reads `memory/*.md` plus a
legacy project `MEMORY.md`. Hermes discovery reads top-level `MEMORY.md` and
`USER.md`. Stable relative paths retain the project directory prefix so source
identity does not collide.

Non-Codex snapshots are read-only. Source excerpts use the returned scan root
for canonical path enforcement. Correction and Codex Audit controls are hidden.

## Skill Projection

Native discovery adds `~/.hermes/skills` and project `.hermes/skills`. The
frontend derives an Agent projection without mutating the raw inventory:

- Codex: `Codex` plus shared `Agents` roots.
- Claude Code: `Claude Code` plus shared `Agents` roots.
- Hermes: `Hermes` roots.

Capabilities are rebuilt from matching copies, then counts, tools, health,
invalid copies, and duplicate groups are recomputed from that projection.

## MCP Inventory Boundary

A dedicated Rust module reads native configuration into a redacted contract:

- Codex: `mcp_servers` from `~/.codex/config.toml`.
- Claude Code: user/local `mcpServers` from `~/.claude.json` plus shared project
  declarations from known-project `.mcp.json` files.
- Hermes: `mcp_servers` from `~/.hermes/config.yaml`.

The payload contains server name, source scope, transport kind, enabled state,
and a non-secret endpoint label. It does not serialize command arguments,
environment maps, headers, tokens, query strings, or credential values. MCP is
read-only in this slice.

## Compatibility and Rollback

- Existing Codex memory commands and provider activation commands keep their
  signatures.
- Existing provider profile storage, Keychain, backup, and atomic-write logic
  is untouched.
- Removing the selector and new read-only commands restores the previous
  application behavior without data migration.
- The selected-Agent local-storage key contains only an enum string.
