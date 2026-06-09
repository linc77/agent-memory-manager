# Loop Docs Migration GC

Date: 2026-06-08
Sweep target: loop-engineering repository docs.

## Action

Moved loop-generated artifacts into the unified loop namespace:

- `docs/goals/*` -> `docs/loop/goals/*`
- `docs/issues/*` -> `docs/loop/issues/*`
- `docs/verification/*` -> `docs/loop/verification/*`

Updated repo map and internal references to the new paths.

## Verification

Run:

```bash
rg -n 'docs/(goals|issues|verification)' AGENTS.md README.md docs src scripts package.json | rg -v 'loop-docs-migration-gc'
find docs -maxdepth 3 -type f -print | sort
git diff --check
```

Expected:

- No old loop artifact paths remain outside this migration record.
- Loop files appear under `docs/loop/`.
- `git diff --check` passes.

## Safety

No evidence records were deleted. Existing records were moved and references were updated.
