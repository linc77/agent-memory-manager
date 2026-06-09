# Browser Fixture Mode

Status: completed
Date: 2026-06-09

## Gap

Live Tauri window capture was not reliable in this environment, and the Vite browser app could not exercise the UI without Tauri commands.

## Impact

Daytime handoff had automated tests but no stable browser-equivalent UI path for visual/manual review.

## Acceptance

- `?fixture=1` provides deterministic scan, source, audit, correction, and open-source API responses.
- Normal desktop mode still uses Tauri commands.
- Fixture mode does not call Tauri `invoke` or opener APIs.
- The app can run in Vite with fixture data for browser-equivalent verification.

## Implementation

- Added deterministic fixture scan/audit data under `src/lib/demoData.ts`.
- Added API fixture mode gated by `?fixture=1`.
- Added fixture tests for API calls and the core App review flow without Tauri mocks.

## Verification

```bash
pnpm vitest run src/App.fixture.test.tsx src/lib/api.test.ts
curl -fsS 'http://localhost:1420/?fixture=1'
pnpm verify
```

Observed:

- fixture target tests passed: 2 files, 3 tests.
- Vite served the fixture URL.
- final `pnpm verify` passed: 4 frontend test files, 18 tests; 22 Rust tests.
