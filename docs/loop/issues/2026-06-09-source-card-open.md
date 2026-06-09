# Source Card Open Action

Status: completed
Date: 2026-06-09

## Gap

The Sources view listed source files but did not provide a direct way to reveal a source from the inventory.

## Impact

Users had to find an entry referencing the source before using Inspector's Open source action.

## Acceptance

- Each source card exposes an Open source action.
- The action reveals the exact source path.
- Existing Inspector Open source behavior remains unchanged.
- App interaction tests cover the source-card action.

## Implementation

Source cards now include an Open source icon action. App handles the opener through a mutation so failures surface through the existing status toast path.

## Verification

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

Observed:

- `src/App.test.tsx` passed: 10 tests.
- final `pnpm verify` passed: 2 frontend test files, 14 tests; 19 Rust tests.
