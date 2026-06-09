# Agent Memory Manager Knowledge Map

This repository should stay legible to coding agents. Keep `AGENTS.md` short and use this file as the map to deeper project knowledge.

## Product

Agent Memory Manager is a macOS-first Tauri app for inspecting local Codex memory, surfacing stale or conflicting entries, and safely writing correction notes under `~/.codex/memories/extensions/ad_hoc/notes`.

## Source of Truth

- Product design: `docs/superpowers/specs/2026-06-08-agent-memory-manager-design.md`
- MVP plan: `docs/superpowers/plans/2026-06-08-agent-memory-manager-mvp.md`
- Loop index: `docs/loop/README.md`
- Long-running goals: `docs/loop/goals/`
- Verification records: `docs/loop/verification/`
- Known issues: `docs/loop/issues/`

## Current Status

The app can scan local Codex memory, separate current memory from activity logs, search across entries and sources, inspect source excerpts, run a read-only Codex Audit, and write only confirmed correction notes under `extensions/ad_hoc/notes`.

The active overnight worktree is tracked in `docs/loop/goals/2026-06-09-overnight-optimization.md`; daytime review instructions and evidence are in `docs/loop/verification/2026-06-09-overnight-handoff.md`.

Use `pnpm verify` as the baseline automated check before claiming progress.

## Agent Workflow

When work fails or verification exposes a gap, do not treat it as a prompt problem first. Identify the missing capability, then encode it into the repository as one of:

- a test
- a script or command
- a focused doc
- an architecture rule
- a clear issue record
