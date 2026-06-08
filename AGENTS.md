# Codex

## Environment

- macOS 26
- Node 22
- Shell fish

## Protocol

- User-facing replies must be Chinese.
- Tool commands, model prompts, and code-facing text should be English.
- Keep code, comments, and docs concise. Do not add commentary unless it protects correctness.
- Make only targeted changes for the active request.

## Project Map

- `README.md`: project purpose and basic commands.
- `docs/README.md`: repository knowledge map and current status.
- `docs/goals/`: long-running Codex goals and success criteria.
- `docs/superpowers/specs/2026-06-08-agent-memory-manager-design.md`: product design.
- `docs/superpowers/plans/2026-06-08-agent-memory-manager-mvp.md`: MVP implementation plan.
- `docs/verification/`: live verification records.
- `docs/issues/`: known gaps and focused follow-up tasks.

## Checks

Run the smallest relevant set first:

```bash
pnpm verify
```

`pnpm verify` runs:

```bash
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture
cargo check --manifest-path src-tauri/Cargo.toml
git diff --check
```

Use `pnpm tauri dev` or a debug bundle for live desktop verification.
