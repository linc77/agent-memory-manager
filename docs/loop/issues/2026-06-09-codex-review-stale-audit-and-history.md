# Codex Review Stale Audit And History

Status: completed
Date: 2026-06-09

## Gap

Fresh `codex exec review --uncommitted` found two correctness gaps:

- Historical sources containing `Memory update request:` could still be classified as Corrections.
- A pending Audit request could repopulate the report after the user changed Audit mode or memory root.

## Impact

Historical activity could pollute current correction views, and Audit could display a report for the wrong mode/root after context changes.

## Acceptance

- Raw, Chronicle, and rollout sources stay Activity Log even if they contain correction text.
- Audit results are accepted only when their request mode/root still match the current UI context.
- Target parser and frontend tests cover both regressions.

## Implementation

- Parser now classifies historical source paths before checking correction-note text.
- Audit mutation carries the requested root/mode and ignores stale successes.

## Verification

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::parser -- --nocapture
pnpm vitest run src/App.test.tsx
pnpm verify
```

Observed:

- parser target tests passed: 8 tests.
- App target tests passed: 13 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 20 tests
  - frontend build passed
  - Rust tests: 33 tests
  - Rust check passed
  - Loop reference check passed
