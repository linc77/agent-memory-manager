# Codex Review Audit Hardening

Status: completed
Date: 2026-06-09

## Gap

Fresh `codex exec review --uncommitted` found two audit correctness gaps:

- Packaged app runs could fail to locate `schemas/current-memory-report.schema.json`.
- Schema-valid reports with the wrong `mode` could be accepted and cached under the requested mode label.

## Impact

The audit feature could fail outside a source checkout or display/cache misleading full-vs-curated results.

## Acceptance

- Audit schema has a packaged-run fallback.
- Curated prompt pins `mode` to `curated`; full prompt pins `mode` to `full`.
- Report validation rejects a report whose `mode` differs from the requested mode.
- Tests cover wrong-mode rejection and embedded schema materialization.

## Implementation

- Report schema is embedded at compile time and materialized to a temp file when source schema lookup fails.
- Curated and full audit prompts explicitly set the expected mode.
- Report validation rejects wrong-mode JSON before caching.

## Verification

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture
pnpm verify
```

Observed:

- audit target tests passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 29 tests
  - Rust check passed
