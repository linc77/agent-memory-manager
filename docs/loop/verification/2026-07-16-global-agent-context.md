# Global Agent Context Verification

Status: complete
Date: 2026-07-16
Trellis task: `.trellis/tasks/07-16-global-agent-context/`

## Acceptance Target

The top-left brand area becomes one persistent Codex / Claude Code / Hermes
selector. Home, Memory, Skills, MCP, and provider configuration always represent
the selected Agent, with no Codex memory or write controls shown as another
Agent's data.

## Delivered

- Added one validated, persisted `selectedAgent` application context.
- Replaced the old brand and standalone Agents navigation with an accessible
  menu in the top-left area. Provider configuration now renders only the active
  Agent.
- Added isolated Claude Code and Hermes read-only Memory discovery and reused
  the deterministic parser/profile pipeline without caching into foreign roots.
- Scoped Skills by Agent and added global/project Hermes Skill roots.
- Added a read-only MCP workspace for Codex TOML, Claude user/local/shared
  project JSON, and Hermes YAML.
- Redacts MCP arguments, environment values, headers, credentials, URL paths,
  queries, fragments, and user info before serialization.
- Preserved the existing Codex write, profile generation, and Audit workflows;
  those actions are absent for Claude Code and Hermes.
- Captured the executable contracts in `.trellis/spec/frontend/agent-context.md`,
  `.trellis/spec/backend/agent-memory-scope.md`, and
  `.trellis/spec/backend/mcp-inventory.md`.

## Automated Evidence

Focused probes passed:

```bash
pnpm exec vitest run src/App.fixture.test.tsx src/lib/api.test.ts \
  src/lib/agentScope.test.ts src/lib/skillInventory.test.ts
cargo test --manifest-path src-tauri/Cargo.toml mcp_manager -- --nocapture
cargo test --manifest-path src-tauri/Cargo.toml memory:: -- --nocapture
pnpm build
```

Final `pnpm verify` is the release gate and covers Vitest, the production build,
all Rust tests, Cargo check, profile-cache verification, Loop references, and
`git diff --check`.

Final result: passed.

- Vitest: 7 files, 46 tests passed.
- Rust: 72 tests passed.
- TypeScript/Vite production build passed.
- Cargo check and `cargo fmt --check` passed.
- Profile-cache, Loop-reference, and `git diff --check` gates passed.

## Browser Evidence

The fixture application was opened in the in-app browser and switched from
Codex to Claude Code, then into Claude Code MCP. Observed:

- The closed top-left control showed only the current Agent.
- The menu showed Codex, Claude Code, Hermes, installation state, and one
  current-Agent configuration action.
- Claude Code Home displayed only the distinct Claude fixture memory and had no
  Audit or correction controls.
- Claude Code MCP displayed only `drawio`; DOM tests additionally cover Hermes
  `mnemosyne` and current-Agent-only provider cards.
- The desktop layout rendered without console warnings or errors. At minimum
  sidebar width, the popover expands enough to keep all Agent names readable.

## Desktop Evidence

`pnpm tauri dev` compiled and launched the real debug binary with a visible
2360x1520 physical window. A fresh current-code debug app bundle was also built:

```text
src-tauri/target/debug/bundle/macos/Agent Memory Manager Dev.app
```

The process remained stable. macOS accessibility extraction timed out against
the real memory volume, so it is not used as visual acceptance evidence; the
fixture browser remains the visual oracle and native commands are covered by
Rust tests.

## Safety Boundary

No real provider profile was activated and no real Agent configuration, Memory,
Skill, or MCP source was modified during verification. Browser interactions ran
in fixture mode; native write paths remained covered by temporary-file tests.
