# Audit Mode Stale Report

Status: completed
Date: 2026-06-09

## Gap

Changing the Audit mode could leave the previous report visible until the next run.

## Impact

Users could switch from curated to full and still see a curated report, making the audit evidence look mode-mismatched.

## Acceptance

- Changing audit mode clears the previous report.
- Changing audit mode clears stale audit errors.
- The next audit run uses the newly selected mode.
- App interaction tests cover stale-report clearing.

## Implementation

- Audit mode changes clear the previous report and reset audit mutation state.
- App interaction test verifies stale report clearing and the next run uses the selected mode.

## Verification

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

Observed:

- `src/App.test.tsx` passed: 12 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 19 tests
  - frontend build passed
  - Rust tests: 29 tests
  - Rust check passed
  - Loop reference check passed
