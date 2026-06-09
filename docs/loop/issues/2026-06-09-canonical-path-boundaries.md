# Canonical Path Boundaries

Status: completed
Date: 2026-06-09

## Gap

Source excerpt and correction write checks used raw path prefix checks.

## Impact

Normal UI paths were safe, but command-level callers could attempt traversal-shaped paths such as `root/../outside.md`.

## Acceptance

- Source excerpts canonicalize root and source path before boundary checks.
- Correction writes canonicalize the notes directory and target parent before boundary checks.
- Correction writes only target direct `.md` files under `extensions/ad_hoc/notes`.
- Tests reject traversal-shaped excerpt and correction paths.

## Implementation

- `get_source_excerpt` canonicalizes root and source path before checking containment.
- `write_correction_note` canonicalizes the allowed notes directory and target parent.
- Correction writes reject traversal-shaped paths and non-`.md` targets.

## Verification

```bash
cargo test --manifest-path src-tauri/Cargo.toml rejects_ -- --nocapture
pnpm verify
```

Observed:

- targeted rejection tests passed: 8 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 27 tests
  - Rust check passed
