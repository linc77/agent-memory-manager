# Audit Evidence Open Source

Status: completed
Date: 2026-06-09

## Gap

Audit cards showed evidence references as text only.

## Impact

Users could see what evidence was cited but could not quickly open the underlying memory source from the audit result.

## Acceptance

- Audit evidence labels become source-opening controls when the source exists in the current scan.
- Unknown evidence paths still render as plain labels.
- Existing source card and Inspector open-source behavior remains unchanged.
- App interaction tests cover opening an audit evidence source.

## Implementation

Audit evidence labels now render as source-opening buttons when the evidence path exists in the current scan source list.

## Verification

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

Observed:

- `src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed: 4 frontend test files, 18 tests; 22 Rust tests.
