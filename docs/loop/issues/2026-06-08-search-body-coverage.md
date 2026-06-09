# Search Body Coverage Gap

## Status

Fixed on 2026-06-08. See `docs/loop/verification/2026-06-08-search-body-fix.md`.

## Evidence

During live verification on 2026-06-08, the app found the `dilidili` override risk and the Inspector excerpt showed a second bullet containing `Python/Rust`. Searching `Python/Rust` in Overrides returned no entries.

## Likely Cause

`parse_entries` stores only a short `summary` for each entry. The frontend search filters by `title`, `summary`, and `sourcePath`, so text outside the first summary line is not searchable.

## Acceptance Criteria

- Searching matches full entry body content, not only the summary.
- `Python/Rust` returns the existing ad-hoc correction note in Overrides.
- Existing summary display stays concise.
- Rust and frontend types remain aligned.
- Add a regression test for multi-bullet correction notes.

## Candidate Fix

Add a searchable `body` or `searchText` field to `MemoryEntry`, populate it in the Rust parser, include it in frontend filtering, and keep card rendering on `summary`.

## Resolution

Implemented `searchText` on `MemoryEntry`, populated it from the full parsed body, and included it in Knowledge Board filtering. Card rendering still uses `summary`.
