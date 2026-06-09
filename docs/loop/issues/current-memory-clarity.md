# Current Memory Clarity

Status: fixed
Date: 2026-06-08

## Gap

The first view should answer what Codex currently remembers. Current topic inference mixes stable memory with historical evidence:

- Chronicle 10-minute summaries can enter `Profile`.
- Rollout summaries can enter `Projects`.
- Sidebar topics mix content, audit state, and source views without grouping.

## Baseline Probe

Command:

```bash
cargo test --manifest-path src-tauri/Cargo.toml parser -- --nocapture
```

Observed failure:

- `keeps_chronicle_activity_out_of_profile` failed.
- `keeps_rollout_history_out_of_projects` failed.

## Oracle

- Chronicle and rollout summary entries are routed to `Activity Log`.
- `Profile` and `Projects` represent current memory, not historical activity.
- Sidebar separates current memory from audit and evidence views.
- `pnpm verify` passes.
