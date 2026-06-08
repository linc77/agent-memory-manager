# Agent Memory Manager Knowledge Map

This repository should stay legible to coding agents. Keep `AGENTS.md` short and use this file as the map to deeper project knowledge.

## Product

Agent Memory Manager is a macOS-first Tauri app for inspecting local Codex memory, surfacing stale or conflicting entries, and safely writing correction notes under `~/.codex/memories/extensions/ad_hoc/notes`.

## Source of Truth

- Product design: `docs/superpowers/specs/2026-06-08-agent-memory-manager-design.md`
- MVP plan: `docs/superpowers/plans/2026-06-08-agent-memory-manager-mvp.md`
- Long-running goals: `docs/goals/`
- Verification records: `docs/verification/`
- Known issues: `docs/issues/`

## Current Status

The MVP has a working scan, parse, risk flag, source excerpt, correction draft flow, and full-body search coverage. The `Python/Rust` search gap is fixed and verified in `docs/verification/2026-06-08-search-body-fix.md`.

Use `pnpm verify` as the baseline automated check before claiming progress.

## Agent Workflow

When work fails or verification exposes a gap, do not treat it as a prompt problem first. Identify the missing capability, then encode it into the repository as one of:

- a test
- a script or command
- a focused doc
- an architecture rule
- a clear issue record
