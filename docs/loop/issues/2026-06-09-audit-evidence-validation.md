# Audit Evidence Validation

Status: completed
Date: 2026-06-09

## Gap

Codex Audit validated evidence format but did not verify that evidence paths and line ranges came from scanned memory sources.

## Impact

A model could return a schema-valid report with invented or out-of-range evidence, weakening source trust.

## Acceptance

- Audit reports still require non-empty evidence.
- Evidence source paths must match scanned memory sources.
- Evidence line ranges must fit inside the source line count.
- Report metadata memory root must match the selected memory root.
- Curated and full audit modes use the same evidence validation.
- Rust tests cover unknown evidence sources.

## Implementation

`run_codex_audit_for_root` now scans sources before running Codex and validates every report evidence item against the scanned source inventory and source line counts. It also rejects reports whose metadata memory root does not match the selected root. Audit prompts now explicitly instruct Codex to set `metadata.memoryRoot` to the selected root.

## Verification

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture
pnpm verify
```

Observed:

- Codex audit target tests passed: 9 tests.
- final `pnpm verify` passed: 2 frontend test files, 15 tests; 22 Rust tests.
