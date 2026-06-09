# Dialog Resizer Overlap

Status: completed
Date: 2026-06-09

## Gap

The pane resizer could render above the correction dialog, visually cutting through the modal and the write button.

## Impact

The safe-write confirmation looked broken during live Tauri review.

## Acceptance

- Correction dialog renders above pane resizers.
- Write and cancel buttons keep their full labels.
- Existing fixture correction flow still passes.

## Implementation

- Raised `.dialog-backdrop` above pane resizers.
- Prevented dialog footer buttons from shrinking.

## Verification

```bash
pnpm vitest run src/App.fixture.test.tsx
pnpm verify
```
