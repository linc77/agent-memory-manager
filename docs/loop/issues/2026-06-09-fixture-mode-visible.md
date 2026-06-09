# Fixture Mode Visibility

Status: completed
Date: 2026-06-09

## Gap

Browser fixture mode showed deterministic demo memory without an explicit UI marker.

## Impact

A user could mistake fixture data for real Codex memory during browser-equivalent review.

## Acceptance

- `?fixture=1` shows a persistent fixture-mode marker.
- Normal app mode does not show the marker.
- Fixture mode still drives the browser review flow.
- Tests cover both fixture and normal modes.

## Implementation

`App` now renders `Fixture mode: demo memory only` when the URL enables fixture mode.

## Verification

```bash
pnpm vitest run src/App.fixture.test.tsx src/App.test.tsx
pnpm verify
```

Observed:

- target tests passed: 2 files, 12 tests.
- final `pnpm verify` passed: 4 frontend test files, 18 tests; 22 Rust tests.
