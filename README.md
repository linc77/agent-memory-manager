# Agent Memory Manager

macOS-first desktop app for inspecting local Codex memory, surfacing stale or conflicting entries, and safely writing correction notes under `~/.codex/memories/extensions/ad_hoc/notes`.

## Development

```bash
pnpm install
pnpm tauri dev
```

## Checks

```bash
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture
cargo check --manifest-path src-tauri/Cargo.toml
```
