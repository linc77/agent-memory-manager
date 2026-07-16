# Implementation Plan

1. Add the shared frontend Agent metadata/storage module and persisted App
   selection state.
2. Replace Sidebar branding with the accessible Agent selector, remove the
   primary Agents item, and route its configuration action to the current
   Agent-only provider workspace.
3. Add Agent-specific read-only Memory discovery and profile snapshot contracts
   for Claude Code and Hermes; preserve the Codex write/audit pipeline.
4. Project the native Skill inventory by Agent and add Hermes Skill roots.
5. Add redacted native MCP inventory contracts, Tauri command, API fixture, and
   a selected-Agent-only workspace.
6. Make headings, empty states, profile actions, Inspector excerpts, and layout
   behavior Agent-aware in Chinese and English.
7. Add Rust tests for source isolation, Hermes roots, and MCP redaction; add
   frontend tests for persistence, selector flow, data isolation, and current-
   Agent-only provider configuration.
8. Run focused Vitest/Rust checks, `pnpm verify`, `git diff --check`, fixture
   browser verification, and live desktop smoke verification.
9. Update Trellis backend/frontend contracts and Loop verification evidence.

## Risk and Rollback Points

- Keep existing Codex query functions intact; non-Codex memory uses a separate
  read-only command.
- Centralize Agent metadata to prevent label/tool mapping drift.
- Redact MCP data before serialization and assert secrets are absent in tests.
- Never invoke provider activation during browser verification; use fixture
  mode for interaction checks.
