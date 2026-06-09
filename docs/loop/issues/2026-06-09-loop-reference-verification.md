# Loop Reference Verification

Status: completed
Date: 2026-06-09

## Gap

`pnpm verify` proved code and tests, but did not prove repo-local Loop handoff references were still valid.

## Impact

A future agent could be told to continue from `docs/loop/` while the index, handoff, or project map points at missing files.

## Acceptance

- A verification script checks key Loop reference files.
- Referenced `docs/loop/...` artifacts in the index, handoff, AGENTS, and docs map exist.
- Glob-style explanatory references are ignored.
- `pnpm verify` runs the Loop reference check.

## Implementation

- Added `scripts/verify-loop.sh`.
- Added the Loop reference check to `scripts/verify.sh`.
- Updated `docs/README.md` current status to point at the active overnight goal and handoff.

## Verification

```bash
bash scripts/verify-loop.sh
pnpm verify
```

Observed:

- `bash scripts/verify-loop.sh` passed.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 29 tests
  - Rust check passed
  - Loop reference check passed
  - `git diff --check` passed
