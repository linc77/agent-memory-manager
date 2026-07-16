# Backend Development Guidelines

## Guidelines Index

| Guide | Description | Status |
|---|---|---|
| [Skill Inventory Contract](./skill-inventory.md) | Native discovery, Tauri payload, snapshot, and test boundary | Active |
| [Agent Configuration Contract](./agent-configuration.md) | Provider profiles, Keychain, native adapters, backups, and Tauri payload | Active |
| [Agent Memory Scope Contract](./agent-memory-scope.md) | Agent-specific roots, source isolation, and read-only snapshots | Active |
| [MCP Inventory Contract](./mcp-inventory.md) | Native MCP discovery and pre-serialization redaction | Active |

## Pre-Development Checklist

- Read `skill-inventory.md` before changing Skill discovery, identity, roots,
  snapshot persistence, or the `load_skill_inventory` command.
- Read `agent-configuration.md` before changing Agent profiles, native config
  adapters, Keychain storage, backups, or Agent configuration commands.
- Read `agent-memory-scope.md` before changing Agent memory roots, discovery,
  profiles, source excerpts, or write boundaries.
- Read `mcp-inventory.md` before changing MCP formats, scopes, enabled state,
  transport detection, redaction, or Tauri fields.

## Quality Check

- Run `cargo test --manifest-path src-tauri/Cargo.toml skill_manager -- --nocapture`.
- Run `pnpm exec vitest run src/lib/api.test.ts src/App.fixture.test.tsx`.
- Run `cargo test --manifest-path src-tauri/Cargo.toml agent_config -- --nocapture`.
- Run `cargo test --manifest-path src-tauri/Cargo.toml memory:: -- --nocapture`.
- Run `cargo test --manifest-path src-tauri/Cargo.toml mcp_manager -- --nocapture`.
- Confirm frontend/backend field names still round-trip through Tauri camelCase.
