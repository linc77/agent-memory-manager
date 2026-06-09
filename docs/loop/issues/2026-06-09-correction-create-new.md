# Correction Create-New Writes

Status: completed
Date: 2026-06-09

## Gap

Correction writes were constrained to `extensions/ad_hoc/notes`, but create-new behavior needed to cover the final target, temporary file, and finalization step.

## Impact

Normal UI drafts use timestamped paths, but command-level writes could overwrite an existing note, write through a pre-existing temporary path, or overwrite a target created after the temp file was written.

## Acceptance

- Existing correction targets are rejected.
- Existing temporary correction targets are rejected.
- Targets created after the temporary write are not overwritten.
- Normal correction writes still create a new `.md` note under `extensions/ad_hoc/notes`.
- Rust tests cover existing target, temporary target, and finalization-race rejection.

## Implementation

- Correction writes reject existing final targets.
- Temporary correction files are opened with `create_new`.
- Finalization links the temporary file to the target with create-new semantics and removes the temporary file.

## Verification

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::correction -- --nocapture
pnpm verify
```

Observed:

- correction target tests passed: 8 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 19 tests
  - frontend build passed
  - Rust tests: 32 tests
  - Rust check passed
  - Loop reference check passed
