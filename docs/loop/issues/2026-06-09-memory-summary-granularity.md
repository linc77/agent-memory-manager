# Memory Summary Granularity

Status: completed
Date: 2026-06-09

## Gap

`memory_summary.md` starts with a version preamble and uses `###/####` sections for project memory groups, but parser only split `#` and `##`.

## Impact

The UI could show a useless `v1` card and merge memory-summary project groups into overly broad entries.

## Acceptance

- Version preamble entries are skipped.
- Heading-only parent groups are skipped.
- `memory_summary.md` splits `###/####` project/date sections into more focused entries.
- `MEMORY.md` task metadata behavior is unchanged.
- Parser tests cover the memory-summary boundary.

## Implementation

Parser now applies finer heading splitting only to `memory_summary.md`, skips version preambles, skips heading-only parent groups, and classifies `agent-memory-manager` summary entries as Projects.

## Verification

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::parser -- --nocapture
pnpm verify
```

Observed:

- parser target tests passed: 7 tests.
- final `pnpm verify` passed: 4 frontend test files, 18 tests; 24 Rust tests.
