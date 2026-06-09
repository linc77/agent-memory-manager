# Memory Root Override

Status: completed
Date: 2026-06-09

## Gap

Backend commands support `rootOverride`, but the UI hardcodes it to `null`. Users cannot inspect a fixture memory root or a non-default Codex memory directory.

## Impact

AMM is less useful for testing, recovery, and explicit source inspection. The design calls for a default memory root with optional override.

## Acceptance

- Sidebar exposes a memory root input.
- Applying a non-empty path rescans with that path.
- Resetting returns to the default memory root.
- Current root remains visible.
- Existing scan/search/audit/correction behavior still uses the active root.

## Implementation

- Added a Sidebar memory root input with Apply and Default actions.
- Wired App state so `scan_memories`, audit, source excerpt, and correction commands use the active root override.
- Kept the scanned root visible in the Sidebar footer.

## Verification

```bash
pnpm vitest run src/App.test.tsx
pnpm build
pnpm verify
```

Observed:

- `src/App.test.tsx` passed: 8 tests.
- frontend build passed.
- final `pnpm verify` passed: 2 frontend test files, 12 tests; 16 Rust tests; cargo check passed.
