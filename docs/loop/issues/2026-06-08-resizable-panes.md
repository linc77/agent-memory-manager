# Resizable Panes Gap

## Status

Fixed on 2026-06-08. See `docs/loop/verification/2026-06-08-resizable-panes.md`.

## Evidence

The app shell currently uses fixed grid columns: `220px minmax(420px, 1fr) 340px`. The screenshot shows the inspector is too narrow for comfortable reading, and there is no drag handle between panes.

## Acceptance Criteria

- Two vertical separators allow mouse dragging between sidebar/board and board/inspector.
- Dragging the left separator changes sidebar width while preserving a usable board.
- Dragging the right separator changes inspector width while preserving a usable board.
- Inspector default width is wider than 340px when the viewport allows it.
- Pane widths clamp to minimum usable sizes and do not collapse content.
- `pnpm exec vitest run src/lib/paneLayout.test.ts` and `pnpm verify` pass.
- Live UI verification records both drag paths.

## Candidate Fix

Move grid column widths into top-level React state, add pointer-driven separators, and keep layout math in a small tested helper.

## Resolution

Implemented state-driven grid columns, two accessible vertical splitters, pointer and keyboard resizing, clamped pane width math, and focused Vitest coverage for the helper plus App wiring.
