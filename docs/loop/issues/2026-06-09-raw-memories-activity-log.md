# Raw Memories Activity Classification

Status: completed
Date: 2026-06-09

## Gap

`raw_memories.md` is historical source material. Content-based topic inference can incorrectly place old raw task history into Profile, Projects, Rules, or Tools.

## Impact

Current-memory views become harder to trust because old raw history can look like current durable memory.

## Acceptance

- `raw_memories.md` entries are always classified as Activity Log.
- Existing Chronicle and rollout history stay in Activity Log.
- Current correction-note related topics are unchanged.
- Parser tests cover the raw-memory boundary.

## Implementation

`infer_topic` now treats `raw_memories.md` as Activity Log before content-based inference.

## Verification

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::parser -- --nocapture
pnpm verify
```

Observed:

- parser target tests passed: 5 tests.
- final `pnpm verify` passed: 2 frontend test files, 12 tests; 17 Rust tests; cargo check passed.
