# Source Empty State

Status: completed
Date: 2026-06-09

## Gap

Sources view rendered a blank grid when source search had no matches.

## Impact

Users could not tell whether scan was empty, search was too narrow, or the UI failed.

## Acceptance

- Sources view shows an explicit empty state when no sources match.
- Matching source search still shows source cards.
- Entry empty state behavior is unchanged.
- App interaction tests cover both matching and empty source search.

## Implementation

Sources view now renders `No sources match this view.` when the filtered source list is empty.

## Verification

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

Observed:

- `src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed: 2 frontend test files, 15 tests; 19 Rust tests.
