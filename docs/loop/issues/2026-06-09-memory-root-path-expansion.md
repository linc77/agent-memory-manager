# Memory Root Path Expansion

Status: completed
Date: 2026-06-09

## Gap

The Sidebar suggests a default path like `~/.codex/memories`, but backend root override resolution did not expand `~` and did not trim whitespace before building the path.

## Impact

Manual root override can silently scan the wrong directory, making daytime review look empty or stale.

## Acceptance

- Blank override still resolves to the default memory root.
- Override paths are trimmed.
- `~/...` resolves under the user's home directory.
- All memory commands keep using the shared root resolver.

## Implementation

`resolve_memory_root` now trims non-empty overrides and expands `~` / `~/...` before returning the selected root.

## Verification

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::paths -- --nocapture
pnpm verify
```

Observed:

- path target tests passed: 3 tests.
- final `pnpm verify` passed: 2 frontend test files, 12 tests; 19 Rust tests; cargo check passed.
