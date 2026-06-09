# Live MVP Verification

Date: 2026-06-08
Commit: `63f1bbf`

## Automated Checks

Passed:

```bash
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture
cargo check --manifest-path src-tauri/Cargo.toml
git diff --check
pnpm tauri build --debug
```

Observed Rust test result: 6 passed, 0 failed.

## Live Desktop Checks

Passed:

- App opens from the debug bundle.
- Default memory root is `/Users/qsh/.codex/memories`.
- Sidebar counts render: Profile 12, Projects 1422, Overrides 12, Sources 588, Stale Risks 1.
- Searching `dilidili` in Profile returns a matching memory card.
- Selecting the card loads Inspector source path, line range, and excerpt.
- Stale Risks shows one `coveredByOverride` flag.
- Selecting the risk shows source, risk detail, and excerpt.
- Draft correction opens a safe-write preview under `~/.codex/memories/extensions/ad_hoc/notes`.
- Canceling the preview does not create the draft file.

Failed:

- Searching `Python/Rust` in Overrides returns no matching entry even though the selected source excerpt contains that text.

## Follow-Up

See `docs/loop/issues/2026-06-08-search-body-coverage.md`.

