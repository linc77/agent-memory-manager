# Global agent context switcher

## Goal

Make Codex, Claude Code, or Hermes the active application-wide context. The
selected Agent replaces the old top-left brand block, and every workspace
shows only data and configuration belonging to that Agent.

## Confirmed Facts

- The current sidebar has a static `Agent Memory` brand and a separate
  `Agents` navigation item.
- The Agent configuration workspace already supports Codex, Claude Code, and
  Hermes profiles, but owns an independent internal Agent switcher.
- Memory currently defaults to Codex `~/.codex/memories` only.
- Claude Code auto-memory is stored below
  `~/.claude/projects/*/memory/*.md`, with legacy project `MEMORY.md` files.
- Hermes persistent memory is stored in
  `~/.hermes/memories/{MEMORY.md,USER.md}`.
- Native Skill discovery already distinguishes tool roots but does not scan
  `~/.hermes/skills`.
- The application has no MCP workspace yet. Native MCP declarations exist in
  Codex TOML, Claude JSON, and Hermes YAML configuration.

## Requirements

- Add one persistent global `AgentKind` selection with `codex` as the fallback.
- Replace the top-left brand block with an accessible Agent selector that
  shows only the active Agent while closed.
- The selector menu lists Codex, Claude Code, and Hermes with installation
  state and exposes one action to manage the active Agent's provider profiles.
- Remove the standalone `Agents` navigation item and remove the second Agent
  switcher from the provider-profile workspace.
- Preserve the current workspace when switching when it is supported; leave
  Codex-only Audit for Home when another Agent becomes active.
- Scope Memory queries by Agent:
  - Codex keeps the existing source-first memory workflow.
  - Claude Code reads auto-memory across project memory directories.
  - Hermes reads `MEMORY.md` and `USER.md` from its profile memory root.
- Never show Codex memory, profile, audit, or correction actions as if they
  belonged to Claude Code or Hermes.
- Scope Skills to the active Agent, include shared `.agents/skills` exposure
  for Codex and Claude Code, and add native Hermes Skill discovery.
- Add a read-only MCP inventory workspace that parses only the active Agent's
  native configuration and never returns environment values, arguments, keys,
  tokens, or other secret material to React.
- Keep all three Agent provider-profile flows and native activation safety
  guarantees unchanged.
- Keep Chinese as the default UI language and provide equivalent English copy.

## Acceptance Criteria

- [x] The top-left control shows only the selected Agent and opens a keyboard-
      accessible three-Agent menu.
- [x] Selecting an Agent persists across reloads and immediately scopes Home,
      Memory, Skills, MCP, and provider configuration.
- [x] The Sidebar has no independent `Agents` item; provider configuration is
      opened from the selector and renders only the active Agent.
- [x] Claude Code and Hermes never display the Codex fixture or real memory
      inventory.
- [x] Claude Code memory discovery covers project `memory/*.md` and legacy
      `MEMORY.md`; Hermes covers `MEMORY.md` and `USER.md`.
- [x] Non-Codex memory is inspectable and source-openable but does not expose
      Codex-specific correction or Audit actions.
- [x] Skills statistics, roots, capabilities, and copies are recomputed after
      filtering to the selected Agent.
- [x] Hermes Skills are discovered from global and project Hermes roots.
- [x] MCP inventory changes with the selected Agent and its payload contains no
      command arguments or environment values.
- [x] Focused frontend/Rust tests, production build, and `pnpm verify` pass.
- [x] Fixture-mode browser verification demonstrates Codex -> Claude Code ->
      Hermes switching without horizontal overflow or console errors.

## Out of Scope

- Editing MCP server declarations.
- Writing Claude Code or Hermes memory from AMM.
- External/cloud memory-provider administration.
- Agents other than Codex, Claude Code, and Hermes.
