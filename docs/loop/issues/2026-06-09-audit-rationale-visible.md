# Audit Rationale Visibility

Status: completed
Date: 2026-06-09

## Gap

Audit claim cards showed values, confidence, and evidence, but hid the model rationale.

## Impact

Users could see what Codex judged, but not why it judged that way.

## Acceptance

- Audit claim cards show rationale text.
- Evidence links remain visible and clickable.
- Suggested corrections stay unchanged.
- App interaction tests verify rationale visibility.

## Implementation

- Audit claim cards now show each claim's `rationale`.
- Rationale text uses compact secondary styling.

## Verification

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

Observed:

- `src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 24 tests
  - Rust check passed
