# Codex Exec Memory Auditor Verification

Date: 2026-06-08
Plan: `docs/loop/plans/codex-exec-memory-auditor.md`
Step verified: 1, schema and shared report types
Decision: stop for step 1; route next to `loop-build` step 2

## Acceptance Target

Step 1 adds the schema, Rust report types, TypeScript report types, and a schema-shaped fixture. The probe must show:

- `schemas/current-memory-report.schema.json` is valid JSON.
- `src-tauri/fixtures/current-memory-report.sample.json` is valid JSON.
- The fixture parses into Rust `CodexAuditReport`.
- TypeScript accepts the shared report types.
- Existing repo checks still pass.

## Baseline

This was the first step for the Codex audit feature. No pre-build failing behavior was required because this was additive schema/type work, not a bugfix.

## Probe Run

Target probes:

```bash
node -e "const fs=require('fs'); for (const p of ['schemas/current-memory-report.schema.json','src-tauri/fixtures/current-memory-report.sample.json']) JSON.parse(fs.readFileSync(p,'utf8')); console.log('schema and fixture JSON parse ok')"
cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture
pnpm build
```

Baseline probes:

```bash
pnpm verify
git diff --check
```

## Expected Result

- JSON parse probe exits 0.
- Rust target probe reports `memory::codex_audit::tests::parses_fixture_report ... ok`.
- `pnpm build` exits 0.
- `pnpm verify` exits 0.
- `git diff --check` exits 0.

## Observed Result

- JSON parse probe exited 0 and printed `schema and fixture JSON parse ok`.
- Rust target probe exited 0 with 1 test passed.
- `pnpm build` exited 0.
- `pnpm verify` exited 0:
  - frontend tests: 2 files passed, 6 tests passed
  - build passed
  - Rust tests: 10 passed
  - Rust check passed
- `git diff --check` exited 0 with no output.

## User-Like Acceptance

No UI workflow exists for step 1. The user-like acceptance for this step is data-level: AMM now has a structured report contract and a fixture that can be parsed by the backend and typed by the frontend. UI acceptance is reserved for later plan steps.

## Review Decision

Step 1 passes. The schema requires evidence references for claims, conflicts, and suggested corrections, matching the plan's auditability requirement. Scope is clean for this step: no runner, cache, command, or UI behavior was implemented.

The worktree has unrelated existing changes from prior loop work, including loop-doc migration, pane resizing, and current-memory clarity files. They were not used as evidence for this step.

## Next Loop

Continue with `loop-build` step 2: add the curated memory bundle builder.

---

# Step 2 Verification: Curated Memory Bundle Builder

Date: 2026-06-08
Step verified: 2, curated memory bundle builder
Decision: stop for step 2; route next to `loop-build` step 3

## Acceptance Target

Step 2 must create a curated memory bundle from existing AMM scan data without calling Codex, writing files, or giving unrestricted filesystem access. The bundle must include source kind, relative path, line range, topic, summary, bounded text, source mtime, and truncation state.

## Baseline

This is additive feature work, not a bugfix. No pre-build failing baseline was required. Step 1 schema/type verification already passed in this same record.

## Probe Run

Target probe:

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit::tests::builds_curated_bundle_with_source_metadata_and_bounded_text -- --nocapture
```

Related module probe:

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture
```

Baseline probes:

```bash
pnpm verify
git diff --check
```

## Expected Result

- Target probe exits 0.
- The bundle test confirms `MEMORY.md`, ad-hoc note, Chronicle, and rollout entries are represented with source metadata.
- The bundle test confirms long text is bounded and marked truncated.
- Related module tests pass.
- Repo baseline checks pass.

## Observed Result

- Target probe exited 0 with `builds_curated_bundle_with_source_metadata_and_bounded_text ... ok`.
- Related module probe exited 0 with 2 tests passed.
- `pnpm verify` exited 0:
  - frontend tests: 2 files passed, 6 tests passed
  - build passed
  - Rust tests: 11 passed
  - Rust check passed
- `git diff --check` exited 0 with no output.

## User-Like Acceptance

No UI workflow exists for step 2. The user-like acceptance is memory/data-level: a temp memory root with `MEMORY.md`, ad-hoc note, Chronicle file, and rollout file was scanned into existing AMM source/entry structures, then converted into a bounded curated bundle suitable for a later `codex exec` stdin payload.

## Review Decision

Step 2 passes. The builder is a pure backend transformation over existing `sources + entries`; it does not invoke Codex, does not write files, and does not scan beyond AMM's selected inputs. Scope is clean for this step: runner, command, cache, full audit, and UI remain unimplemented.

The worktree still contains unrelated existing changes from prior loop work. They were not used as evidence for this step.

## Next Loop

Continue with `loop-build` step 3: add Codex runner abstraction and fake-runner test path.

---

# Final Verification: Codex Exec Memory Auditor

Date: 2026-06-08
Steps verified: 3-9, runner, command, cache, full mode, frontend control, report rendering, and live verification
Decision: stop; acceptance passed

## Acceptance Target

AMM must expose an explicit Codex audit path that keeps deterministic scanning, invokes `codex exec` read-only with structured output, validates evidence-bearing reports, caches successful reports, renders the report in the UI, and surfaces failures without writing correction notes.

## Baseline

Step 1 and step 2 were already verified in this record. This final pass verifies the remaining implementation and the full repo baseline.

## Probe Run

Target backend probe:

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture
```

Target frontend probe:

```bash
pnpm vitest run src/App.test.tsx
```

Build and check probes:

```bash
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
```

Real Codex CLI probe:

```bash
codex exec --cd /tmp --skip-git-repo-check --sandbox read-only --ephemeral --output-schema /Users/qsh/Documents/work/agent-memory-manager/schemas/current-memory-report.schema.json "Analyze this AMM memory bundle and return only a current-memory report matching the output schema. Use only the supplied source paths and line ranges as evidence. Treat newer explicit current-profile evidence as stronger than older summaries." < /tmp/amm-fixture-bundle.json > /tmp/amm-codex-stdout.txt 2> /tmp/amm-codex-stderr.txt
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('/tmp/amm-codex-stdout.txt','utf8')); console.log(data.schemaVersion, data.mode, data.currentClaims.length, data.conflicts.length, data.suggestedCorrections.length);"
```

Repo baseline:

```bash
pnpm verify
git diff --check
```

Live UI probe:

```bash
pnpm tauri dev
```

Screenshot evidence:

```text
/tmp/agent-memory-manager-codex-audit.png
```

## Expected Result

- Backend fake-runner tests assert `--sandbox read-only`, `--ephemeral`, and `--output-schema`.
- Curated mode builds stdin bundle, parses valid JSON, rejects invalid JSON, and caches successful reports.
- Full mode is explicit and uses read-only `codex exec` scoped to the selected memory root.
- Scanner does not surface `.amm/codex-runs/` cache files.
- Frontend can run a mocked audit, show errors, and render current claims, stale claims, uncertain claims, conflicts, suggested corrections, and evidence references.
- Real `codex exec` accepts the schema and returns parseable JSON.
- Live Tauri UI displays the audit controls and panel.
- Baseline checks pass.

## Observed Result

- `cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture` exited 0 with 6 tests passed.
- `pnpm vitest run src/App.test.tsx` exited 0 with 4 tests passed.
- `pnpm build` exited 0.
- `cargo check --manifest-path src-tauri/Cargo.toml` exited 0.
- First real Codex CLI probe found an OpenAI structured-output schema issue: optional `claimIds` and `affectedClaimIds` were listed in `properties` but not `required`.
- Schema was corrected so all object properties are required for strict structured output.
- Curated mode was tightened to run Codex with `--cd /tmp --skip-git-repo-check`, keeping the stdin bundle path separate from the selected memory root.
- Second real Codex CLI probe exited 0 with the scoped command.
- `/tmp/amm-codex-stdout.txt` contained pure JSON and parsed successfully, printing `1 curated 1 1 1`.
- `/tmp/amm-codex-stderr.txt` contained Codex logs and echo output only; backend parsing from stdout is valid.
- `pnpm verify` exited 0:
  - frontend tests: 2 files passed, 8 tests passed
  - build passed
  - Rust tests: 15 passed
  - Rust check passed
- `git diff --check` exited 0 with no output.
- Live Tauri app screenshot shows `Curated Audit`, `Run Codex Audit`, and the `Codex Audit` panel visible without layout overlap.

## User-Like Acceptance

The live desktop app was opened with `pnpm tauri dev` and visually checked in the actual Tauri window. The UI exposes the audit mode selector, run button, and audit panel. The real model path was verified separately against a small fixture bundle to avoid spending a large audit run across the full current memory root.

## Review Decision

Acceptance passes. The feature stays within the plan: Codex audit is read-only, successful reports are cached under `.amm/codex-runs/`, failed audits surface an error, and suggested corrections are displayed as report content rather than written automatically.

Existing unrelated worktree changes from prior loop work remain present and were not reverted.

## Next Loop

Stop. Future product work can add a root picker, report-to-correction handoff, or a bounded current-root audit strategy if needed.
