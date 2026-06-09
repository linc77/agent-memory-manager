# Overnight AMM Handoff

Date: 2026-06-09
Goal: `docs/loop/goals/2026-06-09-overnight-optimization.md`
Worktree: `/Users/qsh/.config/superpowers/worktrees/agent-memory-manager/overnight-optimization`
Branch: `codex/overnight-amm-optimization`

## Objective

Make AMM more genuinely useful for reviewing current Codex memory, with a repo-local Loop OS goal, implementation, verification, and handoff evidence.

## Current Status

The worktree contains the current main workspace WIP plus overnight improvements:

- Codex Audit is a dedicated Review/Audit view, not a panel on every topic.
- Audit view hides the memory search box because audit report search is not implemented.
- Profile stays focused on current durable memory and Activity Log remains separate.
- Search is global across memory entries from ordinary topic views.
- Sources view search filters source paths, source kinds, and hashes.
- Sources search shows an explicit no-match state.
- Source cards can reveal their source file directly.
- Inspector `Open source` reveals the selected source path.
- Inspector shows excerpt read failures explicitly.
- Codex Audit suggested corrections can become safe correction-note drafts.
- Confirmed correction writes show the written note path.
- Correction notes can appear in related current-memory topics while staying visible under Corrections.
- Sidebar can apply a non-default memory root and reset back to the default root.
- Switching memory roots clears the active search query.
- Root override trims pasted paths and expands `~/...`.
- `raw_memories.md` is classified as Activity Log instead of current-memory topics.
- Codex Audit rejects evidence paths, line ranges, or metadata roots that do not match scanned memory sources.
- Codex Audit prompts explicitly name the required metadata memory root.
- Audit evidence labels can open their source file when present in the scan.
- Browser fixture mode is available at `?fixture=1` for deterministic UI review without Tauri commands.
- Fixture mode shows a visible demo-memory marker.
- `memory_summary.md` parsing skips version/no-content cards and splits project/date sections more cleanly.
- Global search shows `Search Results` and matching counts.
- Correction preview content is editable before confirmation; target path remains read-only.
- Audit claim cards show Codex's rationale for current, stale, and uncertain claims.
- Source excerpt and correction write commands enforce canonical path boundaries.
- Fresh Codex review P2 findings are fixed: packaged audit schema fallback and audit mode validation.
- `pnpm verify` includes a Loop reference check for repo-local handoff paths.
- Switching Audit mode clears stale reports before the next run.
- Correction writes enforce create-new behavior for final targets, temporary targets, and finalization races.
- Long Audit evidence labels wrap in fixture browser review instead of overflowing their buttons.
- Historical correction-text snippets stay Activity Log, and stale Audit request results are ignored after mode/root changes.
- Correction dialog renders above pane resizers during live review.
- Writes still require the existing confirmation dialog and stay under `extensions/ad_hoc/notes`.

## Verification

Passed:

```bash
pnpm vitest run src/App.test.tsx
cargo test --manifest-path src-tauri/Cargo.toml memory::correction -- --nocapture
pnpm build
pnpm verify
git diff --check
```

Observed final `pnpm verify` result:

- frontend tests: 4 files, 20 tests
- frontend build passed
- Rust tests: 33 tests
- Rust check passed
- Loop reference check passed
- `git diff --check` passed

## Evidence Locations

- Main verification: `docs/loop/verification/2026-06-09-overnight-optimization.md`
- Audit clutter issue: `docs/loop/issues/2026-06-09-audit-view-clutter.md`
- Global search issue: `docs/loop/issues/2026-06-09-global-search.md`
- Correction related-topic issue: `docs/loop/issues/2026-06-09-correction-related-topics.md`
- Memory root override issue: `docs/loop/issues/2026-06-09-memory-root-override.md`
- Memory root path expansion issue: `docs/loop/issues/2026-06-09-memory-root-path-expansion.md`
- Raw memories activity issue: `docs/loop/issues/2026-06-09-raw-memories-activity-log.md`
- Source search issue: `docs/loop/issues/2026-06-09-source-search-filter.md`
- Source card open issue: `docs/loop/issues/2026-06-09-source-card-open.md`
- Source excerpt error issue: `docs/loop/issues/2026-06-09-excerpt-error-visible.md`
- Audit search hidden issue: `docs/loop/issues/2026-06-09-audit-search-hidden.md`
- Root switch search issue: `docs/loop/issues/2026-06-09-root-switch-clears-search.md`
- Source empty state issue: `docs/loop/issues/2026-06-09-source-empty-state.md`
- Correction write feedback issue: `docs/loop/issues/2026-06-09-correction-write-feedback.md`
- Audit evidence validation issue: `docs/loop/issues/2026-06-09-audit-evidence-validation.md`
- Audit evidence open-source issue: `docs/loop/issues/2026-06-09-audit-evidence-open-source.md`
- Browser fixture mode issue: `docs/loop/issues/2026-06-09-browser-fixture-mode.md`
- Fixture mode visibility issue: `docs/loop/issues/2026-06-09-fixture-mode-visible.md`
- Memory summary granularity issue: `docs/loop/issues/2026-06-09-memory-summary-granularity.md`
- Search state clarity issue: `docs/loop/issues/2026-06-09-search-state-clarity.md`
- Editable correction preview issue: `docs/loop/issues/2026-06-09-editable-correction-preview.md`
- Audit rationale visibility issue: `docs/loop/issues/2026-06-09-audit-rationale-visible.md`
- Canonical path boundaries issue: `docs/loop/issues/2026-06-09-canonical-path-boundaries.md`
- Codex review audit hardening issue: `docs/loop/issues/2026-06-09-codex-review-audit-hardening.md`
- Loop reference verification issue: `docs/loop/issues/2026-06-09-loop-reference-verification.md`
- Audit mode stale-report issue: `docs/loop/issues/2026-06-09-audit-mode-stale-report.md`
- Correction create-new issue: `docs/loop/issues/2026-06-09-correction-create-new.md`
- Audit evidence label overflow issue: `docs/loop/issues/2026-06-09-audit-evidence-label-overflow.md`
- Codex review stale Audit/history issue: `docs/loop/issues/2026-06-09-codex-review-stale-audit-and-history.md`
- Dialog resizer overlap issue: `docs/loop/issues/2026-06-09-dialog-resizer-overlap.md`
- Codex audit plan: `docs/loop/plans/codex-exec-memory-auditor.md`
- Codex audit evidence: `docs/loop/verification/codex-exec-memory-auditor.md`

## Known Limitations

- `pnpm tauri dev` launched, but Computer Use could not bind the dev window and `screencapture` returned a black image, so live screenshot evidence is not available from this environment.
- The worktree is intentionally uncommitted because it includes synchronized WIP from the main workspace plus overnight changes.
- Daytime review should run the actual Tauri window and inspect Profile, Audit, Search, Open source, and suggested-correction preview.

## Next Action

Open the worktree and run:

```bash
pnpm tauri dev
```

Browser-equivalent fallback:

```bash
pnpm dev
open 'http://localhost:1420/?fixture=1'
```

Manual acceptance checklist:

- Profile does not show the empty Codex Audit panel.
- Audit view does not show the `Search memory...` box.
- Review/Audit shows audit mode selector and run action.
- Switching Audit mode clears the previous report before the next run.
- A mocked or real audit report can draft a correction note without writing automatically.
- The correction note content can be edited before write confirmation, while target path stays read-only.
- Correction writes reject existing final and temporary targets.
- Correction writes reject a target created after temp-file write without overwriting it.
- Browser fixture review shows the Audit report and correction preview with no detected overflowing controls or text.
- Historical files containing `Memory update request:` stay out of Corrections.
- Audit reports do not reappear from stale mode/root requests.
- Correction dialog is not cut by pane resizers.
- Source excerpt and correction write commands reject traversal-shaped paths.
- Audit evidence paths, line ranges, and metadata root are validated against scanned sources.
- Audit claim cards show rationale text, not only claim value and confidence.
- Audit schema has a packaged-run fallback, and wrong-mode reports are rejected.
- `pnpm verify` catches broken Loop handoff artifact references.
- Audit evidence labels open source files when the source exists in the scan.
- Confirming a correction write shows the written note path.
- Search from Profile finds non-profile entries and labels their topic.
- Search from Profile shows `Search Results` and a matching entry count.
- Sources search filters source files by path.
- Sources no-match search shows an empty state.
- Source cards can open source files directly.
- Source excerpt read failures are visible in Inspector.
- Profile includes related correction notes while Corrections still lists them.
- Sidebar can scan a fixture/non-default memory root and reset to default.
- Switching memory roots clears any active search text.
- Sidebar accepts `~/.codex/memories` or pasted paths with extra spaces.
- Raw historical memory does not appear as current Profile/Projects/Tools content.
- `memory_summary.md` does not show version/no-content cards.
- Selecting a card lets Inspector reveal the source location.
- `http://localhost:1420/?fixture=1` opens a deterministic fixture UI for browser review.
- Fixture review shows `Fixture mode: demo memory only`.

If these pass, the next loop can decide whether to commit the branch or continue product polish.
