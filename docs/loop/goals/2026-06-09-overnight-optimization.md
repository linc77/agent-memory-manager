# Overnight AMM Optimization

Status: active
Date: 2026-06-09

## Objective

Make Agent Memory Manager genuinely useful for reviewing what Codex currently remembers, separating current durable memory from historical activity, and verifying changes with real app behavior.

## Loop Mode

`/goal`

## Real User Need

The user wants AMM to answer "Codex currently remembers what?" clearly. The app must not make Profile feel like a raw dump of recording summaries, project activity, and stale history.

## In Scope

- Improve memory categorization and current-memory clarity.
- Preserve safe correction-note write boundaries.
- Preserve Codex audit and existing scan/search/risk features.
- Add focused tests for any behavioral change.
- Verify with user-like UI behavior and repo checks.

## Out Of Scope

- Direct edits to Codex memory index files.
- Automatic correction-note writes.
- Cloud sync, background audits, embeddings, or model-provider abstraction.
- Replacing the Tauri app stack.

## Acceptance Criteria

1. Profile emphasizes durable current user/profile/rule/tool memory, not short-lived screen activity.
2. Historical activity remains discoverable through a separate path instead of disappearing.
3. Search still covers full entry body, source paths, and relevant summaries.
4. Codex audit remains read-only and schema-validated.
5. UI can be exercised in a live or browser-equivalent flow without layout-breaking overlap.
6. `pnpm verify` passes.
7. A future agent can continue from `docs/loop/` without chat memory.

## Implementation Steps

1. Inspect parser, topic assignment, sidebar counts, and current UI behavior.
2. Identify the smallest product gap that blocks current-memory clarity.
3. Implement one focused improvement at a time.
4. Run target probes first, then `pnpm verify`.
5. Record user-like verification and handoff evidence.

## Active Step

Daytime review: inspect the worktree UI and decide whether to continue polishing from the current branch.

## Verification Target

Target probes:

```bash
pnpm vitest run src/App.test.tsx
cargo test --manifest-path src-tauri/Cargo.toml memory -- --nocapture
```

Final verification:

```bash
pnpm verify
```

User-like verification:

- Open the app or browser-equivalent UI.
- Confirm Profile current-memory cards are clearly separated from historical activity.
- Confirm source/excerpt/verification evidence remains accessible.

## Record Path

- `docs/loop/verification/2026-06-09-overnight-optimization.md`
- `docs/loop/issues/2026-06-09-current-memory-usability.md` if a focused gap is found.

## Handoff Target

`docs/loop/verification/2026-06-09-overnight-handoff.md`

## Stop Condition

Stop only when acceptance criteria pass, evidence is recorded, and handoff can identify objective, status, verification, remaining gaps, and next action from repo-local files.

## Current Status

- Baseline `pnpm verify` passed after syncing current WIP into the isolated worktree.
- Dedicated Audit view implemented so Profile stays focused on current memory.
- Inspector `Open source` action implemented.
- Codex Audit suggested corrections now open the safe correction-note preview without automatic writes.
- Global search implemented across memory topics.
- Correction notes now also appear in related current-memory topics while remaining under Corrections.
- Memory root override UI implemented for inspecting fixture or non-default Codex memory roots.
- Memory root override now trims pasted paths and expands `~/...`.
- Raw memories are classified as Activity Log so historical source material does not pollute current topics.
- Sources view search now filters source paths/kinds/hashes.
- Source cards can reveal their source file directly.
- Inspector shows source excerpt read errors instead of an indefinite loading message.
- Audit view no longer shows the inert memory search box.
- Switching memory roots clears the active search query.
- Sources search shows an explicit empty state when no source matches.
- Confirmed correction writes show the written note path.
- Codex Audit evidence must reference scanned sources, valid line ranges, and the selected memory root.
- Browser fixture mode is available at `?fixture=1` for deterministic UI review without Tauri commands.
- Audit evidence labels can open their source file when present in the scan.
- Fixture mode shows a visible demo-memory marker.
- `memory_summary.md` skips version/no-content cards and splits project/date sections more cleanly.
- Global search now shows `Search Results` and matching counts.
- Correction preview content is editable before safe write; target path remains read-only.
- Audit claim cards show Codex's rationale so users can review why a claim was made.
- Source excerpt and correction write commands now enforce canonical path boundaries.
- Fresh Codex review P2 findings fixed: packaged audit schema fallback and audit mode validation.
- `pnpm verify` now includes a Loop reference check for repo-local handoff paths.
- Switching Audit mode clears stale reports before the next run.
- Correction writes now enforce create-new behavior for final targets, temporary targets, and finalization races.
- Long Audit evidence labels wrap in fixture browser review instead of overflowing their buttons.
- Fresh Codex review P2 findings fixed: historical correction-text sources stay Activity Log and stale Audit request results are ignored.
- Correction dialog now renders above pane resizers during live review.
- Automated verification passed; live screenshot evidence is unavailable in this environment because system capture returned a black image.
