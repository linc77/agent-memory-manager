# Root Switch Clears Search

Status: completed
Date: 2026-06-09

## Gap

Search text persisted after applying or resetting the memory root override.

## Impact

A newly scanned root could appear empty because it was still filtered by an old query from a previous root.

## Acceptance

- Applying a memory root override clears search text.
- Resetting to default root also clears search text.
- Scan still runs with the selected root.
- App interaction tests cover the root-switch behavior.

## Implementation

`App` clears `query` when applying or resetting the memory root override.

## Verification

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

Observed:

- `src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed: 2 frontend test files, 15 tests; 19 Rust tests.
