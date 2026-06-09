# Audit Evidence Label Overflow

Status: completed
Date: 2026-06-09

## Gap

Long Audit evidence source labels could overflow inside their button in browser fixture review.

## Impact

Users could see clipped source evidence, weakening the Audit view's source transparency.

## Acceptance

- Long evidence labels wrap inside the Audit card.
- The page keeps no horizontal overflow at the default fixture viewport.
- Audit report and correction preview remain usable.

## Implementation

- Evidence link buttons now allow wrapping and long-path breaking.

## Verification

```bash
pnpm vitest run src/App.fixture.test.tsx
pnpm verify
```

Browser fixture check at `http://127.0.0.1:1420/?fixture=1`:

- Audit report visible.
- Correction preview visible.
- fixture banner visible.
- page `scrollWidth` equals `clientWidth`.
- detected overflowing controls/text: `0`.
