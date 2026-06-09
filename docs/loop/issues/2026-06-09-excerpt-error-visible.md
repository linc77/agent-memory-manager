# Source Excerpt Error Visibility

Status: completed
Date: 2026-06-09

## Gap

Inspector showed `Loading source excerpt...` even when excerpt loading failed.

## Impact

Source verification could look stuck instead of showing the real read failure.

## Acceptance

- Excerpt success still shows source text.
- Excerpt failure shows the error text in Inspector.
- Open source and correction actions are unchanged.
- App interaction tests cover excerpt failure.

## Implementation

Inspector now renders the excerpt query error text instead of leaving the panel in a loading state.

## Verification

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

Observed:

- `src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed: 2 frontend test files, 15 tests; 19 Rust tests.
