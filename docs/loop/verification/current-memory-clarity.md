# Current Memory Clarity Verification

Date: 2026-06-08

## Change Verified

The app now separates stable current memory from historical evidence:

- `Profile` is titled `Current Profile`.
- Chronicle and rollout summary entries route to `Activity Log`.
- Sidebar groups topics under `Current Memory`, `Review`, and `Evidence`.
- `Overrides` is labeled `Corrections`; `Stale Risks` is labeled `Conflicts`.

## Baseline

Command:

```bash
cargo test --manifest-path src-tauri/Cargo.toml parser -- --nocapture
```

Observed before the fix:

- `keeps_chronicle_activity_out_of_profile` failed.
- `keeps_rollout_history_out_of_projects` failed.

## Target Probes

Commands:

```bash
cargo test --manifest-path src-tauri/Cargo.toml parser -- --nocapture
pnpm vitest run src/App.test.tsx
pnpm verify
```

Observed after the fix:

- Parser tests: 4 passed.
- App tests: 2 passed.
- `pnpm verify`: 2 frontend test files passed, `pnpm build` passed, 9 Rust tests passed, Rust check passed, `git diff --check` passed.

## Live Check

Observed debug Tauri process `52927` with a screenshot at:

```text
/tmp/agent-memory-manager-debug.png
```

The window showed:

- `Current Memory` with `Profile`, `Projects`, `Rules`, `Tools`, `Writing`.
- `Review` with `Corrections`, `Conflicts`.
- `Evidence` with `Activity Log`, `Sources`.
- `Activity Log` selected with Chronicle entries shown there.
- `Profile` count reduced to `1` while `Activity Log` held historical entries.

Computer Use initially selected the old installed app instance `/Applications/Agent Memory Manager.app` instead of the debug process, so its accessibility tree still showed the old UI. The live screenshot came from the debug process after focusing PID `52927`.

## Oracle

Passed. Historical Chronicle and rollout evidence no longer pollutes the current profile/project views, and the default navigation now separates current memory from audit and evidence views.
