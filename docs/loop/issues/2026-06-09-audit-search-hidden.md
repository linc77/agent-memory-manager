# Audit Search Hidden

Status: completed
Date: 2026-06-09

## Gap

Audit view showed the `Search memory...` box, but that query does not filter the audit report.

## Impact

The Review/Audit surface looked like it had a working search control when it did not.

## Acceptance

- Audit view hides the memory search box.
- Normal memory topics and Sources keep search.
- Audit mode selector and Run Codex Audit action remain visible.
- App interaction tests cover the Audit toolbar state.

## Implementation

`KnowledgeBoard` now hides the search box when `activeTopic` is Audit.

## Verification

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

Observed:

- `src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed: 2 frontend test files, 15 tests; 19 Rust tests.
