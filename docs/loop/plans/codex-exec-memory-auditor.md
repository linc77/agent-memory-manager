# Codex Exec Memory Auditor

Status: completed
Date: 2026-06-08
Work type: focused repo loop; upgrade to `/goal` only if real `codex exec` auth, sandbox, or runtime behavior blocks repeated verification.

## Change

Add a Codex-powered memory audit path to AMM. AMM keeps deterministic source scanning and safe write boundaries, then calls `codex exec` in read-only structured-output mode to produce a current-memory report with claims, evidence, conflicts, stale items, uncertain items, and suggested correction-note drafts.

## In Scope

- Add `current-memory-report.schema.json` for `codex exec --output-schema`.
- Add Rust/TypeScript report types matching the schema.
- Build a curated memory bundle from existing `ScanResult` data:
  - source kind
  - relative path
  - line range
  - topic
  - summary
  - bounded excerpt/search text
  - source mtime
- Add a Rust `run_codex_audit` command with two explicit modes:
  - `curated`: pass the AMM bundle through stdin; default.
  - `full`: opt-in read-only audit that lets Codex inspect the selected memory root.
- Invoke `codex exec` with:
  - `--sandbox read-only`
  - `--ephemeral`
  - `--output-schema <schema>`
  - stdin for curated mode
  - explicit selected memory root access for full mode only.
- Cache every successful report under `<memory_root>/.amm/codex-runs/`.
- Render a minimal UI control:
  - mode selector
  - `Run Codex Audit`
  - running/error state
  - report sections for current claims, conflicts, stale claims, uncertain claims, and suggested corrections.
- Keep writes safe:
  - Codex audit cannot write memory files.
  - Suggested corrections stay drafts until the existing confirmation flow writes under `extensions/ad_hoc/notes`.
- Add tests with a fake Codex binary/runner so automated verification does not require live auth.

## Out Of Scope

- Direct edits to `MEMORY.md`, `memory_summary.md`, Chronicle resources, rollout summaries, or skills.
- Background/scheduled audits.
- OpenAI API key path or provider abstraction.
- Automatic acceptance of suggested corrections.
- Embeddings, vector search, or semantic deduplication.
- Multi-agent debate between several Codex runs.
- Full benchmark/eval suite beyond focused fixtures for this feature.
- Reworking the existing scanner into a database index.

## Acceptance Criteria

1. Curated mode produces a bounded JSON memory bundle from the current scan without giving Codex unrestricted filesystem access.
2. Full mode is explicit in the UI and backend, uses read-only `codex exec`, and cannot write memory files.
3. `codex exec` output is accepted only when it conforms to `current-memory-report.schema.json`.
4. Every current claim, stale claim, conflict, and suggested correction in the report includes at least one evidence reference with source path and line range.
5. A successful audit writes a cache file under `<memory_root>/.amm/codex-runs/` and the scanner does not surface cache files as memory entries.
6. A failed audit shows a readable error and writes no correction note.
7. The UI can run a mocked audit and display all report sections in tests.
8. One live verification runs real `codex exec` against either a small fixture bundle or the current memory root and records whether the real Codex audit path passed.

## Ordered Implementation Steps

1. Add schema and shared report types.
2. Add curated memory bundle builder.
3. Add Codex runner abstraction and fake-runner test path.
4. Add `run_codex_audit` Tauri command for curated mode.
5. Add report cache writer under `<memory_root>/.amm/codex-runs/`.
6. Add full audit mode with explicit read-only root access and safety checks.
7. Add frontend API wrapper and UI control.
8. Render report sections and suggested correction drafts.
9. Add live verification record.

## Probe Per Step

1. Schema/types:
   - Add fixture report JSON.
   - Probe: Rust serde test parses fixture; TypeScript build accepts matching type.
2. Bundle builder:
   - Use temp memory root with `MEMORY.md`, ad-hoc note, Chronicle file, and rollout file.
   - Probe: Rust test asserts source kind, line refs, topics, and bounded text are present.
3. Codex runner:
   - Use a fake executable or injected runner that reads stdin and writes schema-valid JSON.
   - Probe: Rust test asserts command args include `--sandbox read-only`, `--ephemeral`, and `--output-schema`.
4. Curated command:
   - Probe: Rust command test or module test returns parsed report from fake runner and rejects invalid JSON.
5. Cache writer:
   - Probe: Rust test asserts report path is under `<memory_root>/.amm/codex-runs/` and scanner ignores it.
6. Full mode:
   - Probe: Rust test asserts full mode is opt-in, uses read-only sandbox, and rejects paths outside the selected memory root.
7. Frontend control:
   - Probe: Vitest mocks `run_codex_audit`, clicks `Run Codex Audit`, and asserts loading/error/success states.
8. Report rendering:
   - Probe: Vitest fixture report shows current claims, conflicts, stale claims, uncertain claims, and suggested corrections with evidence refs.
9. Live verification:
   - Probe: run a real `codex exec --sandbox read-only --ephemeral --output-schema ...` path and record stdout/stderr outcome.

## Final Verification

Target probe first:

```bash
cargo test --manifest-path src-tauri/Cargo.toml memory::codex_audit -- --nocapture
pnpm vitest run src/App.test.tsx
```

Live user-like probe:

```bash
pnpm tauri dev
```

Then in the debug app:

- select `Curated Audit`
- click `Run Codex Audit`
- confirm a structured report appears
- confirm no correction note is written before explicit user confirmation

Real Codex CLI probe:

```bash
codex exec \
  --sandbox read-only \
  --ephemeral \
  --output-schema <schema-path> \
  "Analyze this AMM memory bundle and return the required report." \
  < <fixture-bundle-path>
```

Baseline repo verification:

```bash
pnpm verify
git diff --check
```

Record evidence in:

```text
docs/loop/verification/codex-exec-memory-auditor.md
```
