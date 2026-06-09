# Agent-First Harness Goal

Status: active
Updated: 2026-06-08
Verification: `docs/loop/verification/2026-06-08-fresh-agent-handoff.md`

## Objective

Turn this repository into an agent-first harness: Codex should be able to inspect the current state, choose the smallest next move, implement it, verify it, record the result, and continue until success criteria pass or human judgment is required.

## Operating Principle

Do not treat agent failure as a prompt problem first. Treat it as evidence that the repository is missing a visible capability:

- test
- script
- source-of-truth document
- architecture rule
- validation command
- issue or decision record

Encode the missing capability into the repository before retrying the same class of work.

## Current Baseline

- `AGENTS.md` is the short project map for Codex.
- `docs/README.md` is the repository knowledge map.
- `docs/loop/verification/2026-06-08-live-mvp-check.md` records current live MVP evidence.
- `docs/loop/issues/2026-06-08-search-body-coverage.md` records the known search coverage gap.
- `pnpm verify` is the baseline automated verification command.

## Feedback Loop

For each goal turn:

1. Read `AGENTS.md`, `docs/README.md`, and any active issue or verification record.
2. Inspect the current Git state.
3. Pick one smallest useful improvement.
4. Implement only that improvement.
5. Run `pnpm verify`.
6. If UI behavior is involved, run live desktop verification.
7. Record new evidence in `docs/loop/verification/`.
8. Update or close the related file in `docs/loop/issues/`.
9. Stop only when success criteria pass or a human decision is needed.

## Near-Term Success Criteria

- `pnpm verify` passes.
- The `Python/Rust` search gap is fixed and covered by a regression test.
- Live verification confirms `Python/Rust` returns the existing ad-hoc correction note in Overrides.
- The search issue record is updated with the fix evidence.
- The repository has no uncommitted product-code changes outside the active task.

## Long-Term Success Criteria

- A single Codex goal can reproduce a reported bug, fix it, verify it, and record evidence.
- Frontend search, Inspector, and correction draft flows have automated tests.
- UI live checks are repeatable with minimal manual intervention.
- Architecture and taste rules are enforced mechanically where practical.
- Periodic quality checks identify stale docs, unused dependencies, and repeated bad patterns.

## Suggested Goal Command

```text
/goal Turn this repository into an agent-first harness by following docs/loop/goals/agent-first-harness.md. Continue until the near-term success criteria pass or a human judgment decision is required.
```
