# Source Search Filter

Status: completed
Date: 2026-06-09

## Gap

The Sources view ignored the search box and always showed every source file.

## Impact

Users could not quickly locate `MEMORY.md`, correction notes, Chronicle resources, or other source paths from the source inventory.

## Acceptance

- Sources view filters by search text.
- Matching includes source relative path, source kind, and hash.
- Entry search behavior is unchanged.
- App interaction tests cover source filtering.

## Implementation

`KnowledgeBoard` now filters source cards by relative path, kind, or hash when the Sources view has an active query.

## Verification

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

Observed:

- `src/App.test.tsx` passed: 9 tests.
- final `pnpm verify` passed: 2 frontend test files, 13 tests; 19 Rust tests.
