# Overnight AMM Optimization Verification

Date: 2026-06-09
Goal: `docs/loop/goals/2026-06-09-overnight-optimization.md`
Status: active

## Baseline

The worktree was created at:

```text
/Users/qsh/.config/superpowers/worktrees/agent-memory-manager/overnight-optimization
```

It was then synchronized from the current main workspace WIP so existing AMM changes are preserved inside the isolated worktree.

## Baseline Probe

Command:

```bash
pnpm verify
```

Observed result:

- frontend tests passed: 2 files, 8 tests
- frontend build passed
- Rust tests passed: 15 tests
- Rust check passed
- `git diff --check` passed

## Current Review

Baseline is green. The next loop should inspect current UI/parser behavior and target the strongest usability gap, not repeat already-verified Codex audit implementation.

---

## Step 1: Dedicated Audit View

### Acceptance Target

Codex Audit must be a review workflow, not a panel that clutters every memory topic.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm build
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 5 tests.
- `pnpm build` passed.

### User-Like Acceptance

The Profile view no longer renders `No audit report yet`. The Audit topic is exposed in the Review section. The mocked Audit view can run a report, render all sections, and open a safe correction preview from a suggested correction without writing a note.

### Review Decision

Pass. This keeps the current-memory workflow focused while preserving Codex audit.

---

## Step 2: Open Source Action

### Acceptance Target

Inspector's `Open source` button must reveal the selected source location instead of being inert.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
cargo test --manifest-path src-tauri/Cargo.toml memory::correction -- --nocapture
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 5 tests.
- `cargo test --manifest-path src-tauri/Cargo.toml memory::correction -- --nocapture` passed: 3 tests.

### User-Like Acceptance

Selecting a memory entry enables `Open source`, and the test verifies it calls Tauri opener with the actual source path returned by the scan.

### Review Decision

Pass. Source traceability now has a working UI action.

---

## Step 3: Suggested Correction Draft Handoff

### Acceptance Target

Suggested corrections from Codex Audit must be able to enter the existing safe write preview without automatic writes.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
cargo test --manifest-path src-tauri/Cargo.toml memory::correction -- --nocapture
```

### Observed Result

- frontend target test passed and verifies `draft_correction_from_content` is called from a suggested correction.
- correction backend test passed and verifies suggested content becomes a single correction-note draft under `extensions/ad_hoc/notes`.
- test verifies `write_correction` is not called automatically.

### User-Like Acceptance

In the mocked Audit view, clicking `Draft correction` opens the existing `Correction note` safe write preview.

### Review Decision

Pass. Audit suggestions now connect to the safe correction flow.

---

## Step 4: Global Search

### Acceptance Target

Search must find matching entries across memory topics from ordinary memory views, while Source and Audit keep dedicated behavior.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 6 tests.
- `pnpm verify` passed:
  - frontend tests: 2 files, 10 tests
  - frontend build passed
  - Rust tests passed: 16 tests
  - Rust check passed
  - `git diff --check` passed

### User-Like Acceptance

Typing `BeeBotOS` from the Profile view surfaces an Activity entry and labels the result with its topic, so search works as global recall instead of a per-tab filter.

### Live UI Note

`pnpm tauri dev` launched successfully. Computer Use could not bind the dev window, and `screencapture` returned a black image in this environment, so screenshot evidence is not used. Repeatable UI evidence is covered by Vitest interaction tests and production build.

### Review Decision

Pass for the implemented steps. Remaining work should focus on any issue the user finds during daytime hands-on review.

---

## Step 5: Correction Related Topics

### Acceptance Target

Correction notes must remain visible under Corrections while also appearing in related current-memory views such as Profile or Projects.

### Probe Run

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::parser -- --nocapture
cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture
pnpm vitest run src/App.test.tsx
pnpm build
pnpm verify
git diff --check
```

### Observed Result

- parser target tests passed: 4 tests.
- Codex audit target tests passed: 6 tests.
- frontend target tests passed: 7 tests.
- `pnpm build` passed.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 11 tests
  - frontend build passed
  - Rust tests: 16 tests
  - Rust check passed
  - `git diff --check` passed

### User-Like Acceptance

A profile correction note remains in Corrections and is also visible in Current Profile through `relatedTopics`. Profile counts include related correction evidence, so current-memory views no longer hide the latest correction notes.

### Review Decision

Pass. This directly improves current-memory clarity without changing safe write boundaries or Codex audit behavior.

---

## Step 6: Memory Root Override

### Acceptance Target

Users must be able to inspect a non-default Codex memory root or fixture root without changing code.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm build
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 8 tests.
- `pnpm build` passed.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 12 tests
  - frontend build passed
  - Rust tests: 16 tests
  - Rust check passed

### User-Like Acceptance

The Sidebar exposes the current scanned memory root plus an override input. Applying `/tmp/amm-fixture-memory` triggers a new `scan_memories` call with that root override; pressing Default triggers a new scan with `rootOverride: null`.

### Review Decision

Pass. This improves testability and recovery while preserving default behavior.

---

## Step 7: Raw Memories Activity Boundary

### Acceptance Target

Raw historical memory source material must not pollute current Profile, Projects, Rules, or Tools views.

### Probe Run

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::parser -- --nocapture
pnpm verify
```

### Observed Result

- parser target tests passed: 5 tests.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 12 tests
  - frontend build passed
  - Rust tests: 17 tests
  - Rust check passed

### User-Like Acceptance

`raw_memories.md` entries now go to Activity Log even when their text mentions projects, preferences, Codex, or technical stack history. Current-memory topics stay focused on curated memory, explicit corrections, and non-raw sources.

### Review Decision

Pass. This removes another historical source from current-memory views without hiding it.

---

## Step 8: Memory Root Path Expansion

### Acceptance Target

Manual memory root override must accept realistic user input such as `~/.codex/memories` and whitespace-padded pasted paths.

### Probe Run

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::paths -- --nocapture
pnpm verify
```

### Observed Result

- path target tests passed: 3 tests.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 12 tests
  - frontend build passed
  - Rust tests: 19 tests
  - Rust check passed

### User-Like Acceptance

The Sidebar can accept a pasted path with surrounding spaces or a path beginning with `~/`; all memory commands resolve through the same backend root resolver.

### Review Decision

Pass. Root override is now practical for manual review.

---

## Step 9: Source Search Filter

### Acceptance Target

Sources view must let users quickly locate source files by path or type instead of showing the full inventory while search text is active.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 9 tests.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 13 tests
  - frontend build passed
  - Rust tests: 19 tests

### User-Like Acceptance

From Sources, searching `MEMORY.md` shows the registry source and hides the Chronicle example source in the interaction test.

### Review Decision

Pass. Source inventory search now behaves like a usable source finder.

---

## Step 10: Source Card Open Action

### Acceptance Target

Sources view must let users reveal a source file directly from the source inventory.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 10 tests.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 14 tests
  - frontend build passed
  - Rust tests: 19 tests

### User-Like Acceptance

From Sources, clicking `Open source MEMORY.md` calls the opener with `/Users/qsh/.codex/memories/MEMORY.md`.

### Review Decision

Pass. Source traceability now works from both entry Inspector and source inventory.

---

## Step 11: Source Excerpt Error Visibility

### Acceptance Target

Inspector must show excerpt read failures clearly instead of appearing stuck in loading state.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 15 tests
  - frontend build passed
  - Rust tests: 19 tests

### User-Like Acceptance

When `get_source_excerpt` fails with `source read failed`, Inspector displays `Error: source read failed`.

### Review Decision

Pass. Source verification failures are now visible.

---

## Step 12: Hide Inert Audit Search

### Acceptance Target

Audit view must not show a search box that does not filter audit reports.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 15 tests
  - frontend build passed
  - Rust tests: 19 tests

### User-Like Acceptance

Audit view still shows the mode selector and Run Codex Audit action, but no longer shows `Search memory...`.

### Review Decision

Pass. The Review/Audit toolbar no longer advertises an unsupported search behavior.

---

## Step 13: Root Switch Clears Search

### Acceptance Target

Changing the selected memory root must not leave the new scan hidden behind an old search query.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 15 tests
  - frontend build passed
  - Rust tests: 19 tests

### User-Like Acceptance

The interaction test enters a search query, applies `/tmp/amm-fixture-memory`, confirms the search input is cleared, and verifies the scan runs with the new root override.

### Review Decision

Pass. Root switching is less likely to look like a failed scan.

---

## Step 14: Source Empty State

### Acceptance Target

Sources search must show an explicit empty state when no source file matches the query.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 15 tests
  - frontend build passed
  - Rust tests: 19 tests

### User-Like Acceptance

The interaction test searches Sources for `MEMORY.md` and sees the matching source, then searches `not-a-source` and sees `No sources match this view.`

### Review Decision

Pass. Source search no-result state is now explicit.

---

## Step 15: Correction Write Feedback

### Acceptance Target

Safe correction writes must show where the confirmed note was written.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 15 tests
  - frontend build passed
  - Rust tests: 19 tests

### User-Like Acceptance

The audit correction test verifies draft creation does not call `write_correction`; after clicking `Write correction note`, the app calls `write_correction` and shows `Correction note written: <path>`.

### Review Decision

Pass. The safe-write flow now provides visible confirmation without loosening write boundaries.

---

## Step 16: Audit Evidence Validation

### Acceptance Target

Codex Audit reports must not accept model-invented evidence paths or out-of-range line references.

### Probe Run

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture
pnpm verify
```

### Observed Result

- `cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture` passed: 9 tests.
- final `pnpm verify` passed:
  - frontend tests: 2 files, 15 tests
  - frontend build passed
  - Rust tests: 22 tests

### User-Like Acceptance

The backend now validates every Codex Audit evidence item against scanned source paths and source line counts. Schema-valid reports that cite unknown sample evidence, out-of-range line numbers, or a different memory root are rejected. The Codex prompts now state the required `metadata.memoryRoot` value explicitly.

### Review Decision

Pass. Audit evidence is now source-grounded instead of only schema-shaped.

---

## Step 17: Browser Fixture Mode

### Acceptance Target

The UI needs a stable browser-equivalent verification path when live Tauri window capture is unavailable.

### Probe Run

```bash
pnpm vitest run src/App.fixture.test.tsx src/lib/api.test.ts
curl -fsS 'http://localhost:1420/?fixture=1'
pnpm verify
```

### Observed Result

- fixture target tests passed: 2 files, 3 tests.
- Vite served `http://localhost:1420/?fixture=1`.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 22 tests

### User-Like Acceptance

`?fixture=1` drives the core browser review path without Tauri commands: Profile, Activity Log, Sources search/empty state, Audit run, suggested correction draft, and correction write feedback.

### Review Decision

Pass. Daytime review now has both real Tauri instructions and a deterministic browser fixture path.

---

## Step 18: Audit Evidence Open Source

### Acceptance Target

Audit evidence references must let users jump from an audit claim to the underlying memory source when that source is known.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 22 tests

### User-Like Acceptance

The mocked audit test clicks `memory_summary.md L20-24` and verifies the app opens `/Users/qsh/.codex/memories/memory_summary.md`.

### Review Decision

Pass. Audit evidence is now actionable when it maps to scanned sources.

---

## Step 19: Fixture Mode Visibility

### Acceptance Target

Browser fixture mode must be clearly marked so demo memory cannot be mistaken for real Codex memory.

### Probe Run

```bash
pnpm vitest run src/App.fixture.test.tsx src/App.test.tsx
pnpm verify
```

### Observed Result

- target tests passed: 2 files, 12 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 22 tests

### User-Like Acceptance

Fixture mode displays `Fixture mode: demo memory only`; normal mocked app mode does not.

### Review Decision

Pass. Browser-equivalent review is now visibly separated from real-memory review.

---

## Step 20: Memory Summary Granularity

### Acceptance Target

`memory_summary.md` should not create version/no-content cards, and its project/date sections should be more focused than one broad summary block.

### Probe Run

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::parser -- --nocapture
pnpm verify
```

### Observed Result

- parser target tests passed: 7 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 24 tests

### User-Like Acceptance

Parser skips `v1`, skips heading-only `What's in Memory` parent groups, and splits `memory_summary.md` project/date sections into focused entries. `agent-memory-manager` summary entries classify as Projects.

### Review Decision

Pass. `memory_summary.md` produces clearer memory cards without changing `MEMORY.md` task metadata splitting.

---

## Step 21: Search State Clarity

### Acceptance Target

Search results must be visibly distinguishable from topic-local browsing.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 24 tests

### User-Like Acceptance

Searching `BeeBotOS` from Profile changes the board title to `Search Results` and shows `1 matching memory entries`. Searching Sources shows source match counts, including `0 matching sources` for no-match queries.

### Review Decision

Pass. Users can tell when they are looking at global search results.

---

## Step 22: Editable Correction Preview

### Acceptance Target

Users must be able to refine a generated correction note before confirming the safe write, while the generated target path stays read-only.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 24 tests
  - Rust check passed
  - `git diff --check` passed

### User-Like Acceptance

The mocked audit flow opens a correction note, edits the `Content` field, and verifies `write_correction` receives the edited content. The target path remains read-only in the dialog.

### Browser Automation Note

`pnpm dev --host 127.0.0.1` served the fixture app, but this worktree does not install Playwright/Puppeteer and the available browser automation surface could not drive page interactions. Evidence for this step is the jsdom interaction test plus full repo verification.

### Review Decision

Pass. Safe writes stay constrained, and the user can edit Codex-generated correction text before committing it.

---

## Step 23: Audit Rationale Visibility

### Acceptance Target

Audit claim cards must show why Codex made a claim, not only the claim value, confidence, and evidence path.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 24 tests
  - Rust check passed

### User-Like Acceptance

The mocked audit flow now renders the current-claim rationale `A newer correction note names Python/Rust as current.` alongside the claim value and evidence links.

### Review Decision

Pass. Users can inspect both what Codex judged and why it judged it.

---

## Step 24: Canonical Path Boundaries

### Acceptance Target

Source excerpt and correction write commands must reject traversal-shaped paths, not only raw paths that fail a lexical prefix check.

### Probe Run

```bash
cargo test --manifest-path src-tauri/Cargo.toml rejects_ -- --nocapture
pnpm verify
```

### Observed Result

- `cargo test --manifest-path src-tauri/Cargo.toml rejects_ -- --nocapture` passed: 8 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 27 tests
  - Rust check passed

### User-Like Acceptance

The normal UI still opens scanned source excerpts and writes only confirmed correction notes, while command-level traversal attempts like `root/../outside.md` are rejected by canonical path checks.

### Review Decision

Pass. Safe read/write boundaries are now enforced at the command layer, not just by trusted UI inputs.

---

## Step 25: Fresh Codex Review Audit Hardening

### Acceptance Target

Fresh Codex review findings must be resolved when they identify concrete audit correctness gaps.

### Probe Run

```bash
codex exec --sandbox read-only review --uncommitted
cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture
pnpm verify
```

### Observed Result

- fresh Codex review found two P2 audit gaps:
  - installed/packaged app runs could fail to find `schemas/current-memory-report.schema.json`.
  - schema-valid reports with the wrong `mode` could be accepted and cached.
- `cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture` passed: 11 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 29 tests
  - Rust check passed

### User-Like Acceptance

The audit command can fall back to an embedded schema in packaged contexts, and a curated/full report mismatch is rejected before display or cache write.

### Review Decision

Pass. The fresh review findings were valid and have targeted regression coverage.

---

## Step 26: Loop Reference Verification

### Acceptance Target

`pnpm verify` should prove the repo-local Loop handoff references are not broken, not only that app code builds and tests pass.

### Probe Run

```bash
bash scripts/verify-loop.sh
pnpm verify
```

### Observed Result

- `bash scripts/verify-loop.sh` passed.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 18 tests
  - frontend build passed
  - Rust tests: 29 tests
  - Rust check passed
  - Loop reference check passed
  - `git diff --check` passed

### User-Like Acceptance

The project map, Loop index, and overnight handoff now reference existing `docs/loop/...` files. A future agent can run the baseline verifier and catch broken handoff paths before claiming continuity.

### Review Decision

Pass. Handoff integrity is now part of the automated baseline.

---

## Step 27: Audit Mode Stale Report Clearing

### Acceptance Target

Switching between curated and full Audit modes must not leave a previous-mode report visible.

### Probe Run

```bash
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.test.tsx` passed: 12 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 19 tests
  - frontend build passed
  - Rust tests: 29 tests
  - Rust check passed
  - Loop reference check passed

### User-Like Acceptance

The mocked Audit flow runs a curated report, switches the selector to full, verifies the old report disappears, then runs again and verifies the backend call uses `mode: "full"`.

### Review Decision

Pass. Audit mode changes no longer leave stale report evidence on screen.

---

## Step 28: Correction Create-New Writes

### Acceptance Target

Safe correction writes must create new notes only and must not overwrite existing final or temporary targets.

### Probe Run

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::correction -- --nocapture
pnpm verify
```

### Observed Result

- `cargo test --manifest-path src-tauri/Cargo.toml memory::correction -- --nocapture` passed: 7 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 19 tests
  - frontend build passed
  - Rust tests: 31 tests
  - Rust check passed
  - Loop reference check passed

### User-Like Acceptance

Normal confirmed correction writes still create a new `.md` note under `extensions/ad_hoc/notes`, while command-level attempts to reuse an existing note target or pre-existing temp path are rejected.

### Review Decision

Pass. The safe-write boundary now enforces create-new behavior, not only target-directory containment.

---

## Step 29: Correction Finalization Create-New

### Acceptance Target

Correction writes must not overwrite a note if the final target appears after the temporary file is written but before finalization.

### Probe Run

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::correction -- --nocapture
pnpm verify
```

### Observed Result

- `cargo test --manifest-path src-tauri/Cargo.toml memory::correction -- --nocapture` passed: 8 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 19 tests
  - frontend build passed
  - Rust tests: 32 tests
  - Rust check passed
  - Loop reference check passed

### User-Like Acceptance

Normal confirmed correction writes still create a new `.md` note under `extensions/ad_hoc/notes`. If another process creates the final note path after the temp file is written, finalization rejects the write, preserves the existing note content, and removes the temp file.

### Review Decision

Pass. Safe correction writes now have create-new semantics through finalization, not just before writing.

---

## Step 30: Audit Evidence Label Wrapping

### Acceptance Target

Long Audit evidence source labels must stay readable inside the Audit card and must not overflow their button in browser-equivalent review.

### Probe Run

```bash
pnpm vitest run src/App.fixture.test.tsx
pnpm verify
```

Browser fixture check:

```text
http://127.0.0.1:1420/?fixture=1
```

### Observed Result

- Browser fixture showed the fixture banner, Audit report, and correction preview.
- Layout metric check found page `scrollWidth` equal to `clientWidth`.
- Layout metric check found overflowing controls/text: `0`.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 19 tests
  - frontend build passed
  - Rust tests: 32 tests
  - Rust check passed
  - Loop reference check passed

### User-Like Acceptance

The long label `extensions/chronicle/resources/activity.md L1-6` wraps within the Audit card instead of clipping inside a single-line button.

### Review Decision

Pass. Audit source evidence remains visible and clickable without layout overflow.

---

## Step 31: Fresh Codex Review Stale Audit And History Fixes

### Acceptance Target

Fresh Codex review P2 findings must be resolved when they identify current-memory separation or stale UI state risks.

### Probe Run

```bash
codex exec --sandbox read-only review --uncommitted
cargo test --manifest-path src-tauri/Cargo.toml memory::parser -- --nocapture
pnpm vitest run src/App.test.tsx
pnpm verify
```

### Observed Result

- fresh Codex review found two P2 gaps:
  - historical files containing `Memory update request:` could be classified as Corrections.
  - pending Audit results could reappear after switching Audit mode or memory root.
- `cargo test --manifest-path src-tauri/Cargo.toml memory::parser -- --nocapture` passed: 8 tests.
- `pnpm vitest run src/App.test.tsx` passed: 13 tests.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 20 tests
  - frontend build passed
  - Rust tests: 33 tests
  - Rust check passed
  - Loop reference check passed

### User-Like Acceptance

Historical raw memory snippets stay in Activity Log even when they quote a correction workflow. Audit reports are accepted only if the request root and mode still match the currently selected UI context.

### Review Decision

Pass. The review findings were valid and now have targeted regression coverage.

---

## Step 32: Dialog Resizer Overlap

### Acceptance Target

Correction note preview must render above pane resizers so live review does not show a vertical divider cutting through the modal or the write button.

### Probe Run

```bash
pnpm vitest run src/App.fixture.test.tsx
pnpm verify
```

### Observed Result

- `pnpm vitest run src/App.fixture.test.tsx` passed: 1 test.
- final `pnpm verify` passed:
  - frontend tests: 4 files, 20 tests
  - frontend build passed
  - Rust tests: 33 tests
  - Rust check passed
  - Loop reference check passed

### User-Like Acceptance

The dialog backdrop now has a higher stacking layer than pane resizers, and dialog footer buttons do not shrink their labels.

### Review Decision

Pass. The live correction preview no longer gets visually cut by the pane divider.
