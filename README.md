# Agent Backplane

**Backplane** is the desktop control plane for understanding and controlling what local Agents know and can do. Agent Backplane keeps Codex, Claude Code, and Hermes contexts separate, inspects Memory, discovers Skills and MCP servers, and manages each Agent's provider profiles.

Skills are discovered from Backplane/imported libraries plus native global and project directories. The app groups identical filesystem copies into logical capabilities and writes a derived snapshot to `~/.agent-backplane/skill-inventory.json`.

Each project can keep an Agent-specific Skill selection, save it as a reusable profile, and apply that profile to another project. Backplane persists this state in `~/.agent-backplane/skill-profiles.json` and deploys only managed symlinks to the Agent's native project directory (`.agents/skills`, `.claude/skills`, or `.hermes/skills`). Existing project Skills are never overwritten or removed. Global Skills remain a shared baseline inherited by every project.

## Memory control

Agent Backplane reads Codex, Claude Code, and Hermes memory through native filesystem adapters. Its local catalog reuses unchanged documents, ranks memory search results, and derives profiles only from effective claims.

Corrections are targeted changes rather than topic-wide overrides. Each change records the claims and evidence it replaces, is written back in the selected Agent's native memory location, and can be reverted without deleting history.

## Downloads

Installers are published on [GitHub Releases](https://github.com/linc77/agent-backplane/releases/latest):

- macOS Apple Silicon: `.dmg`
- Windows x64: NSIS `.exe`

Desktop releases are currently unsigned. macOS users may need to approve the app in System Settings on first launch. The in-app updater can check and download releases, but unsigned macOS updates do not provide the trust guarantees of Developer ID signing and notarization.

## Development

```bash
pnpm install
pnpm dev
```

Build an unpacked desktop app:

```bash
pnpm build:desktop:debug
```

Build the configured installer for the current platform:

```bash
pnpm build:desktop
```

## Checks

```bash
pnpm verify
```
