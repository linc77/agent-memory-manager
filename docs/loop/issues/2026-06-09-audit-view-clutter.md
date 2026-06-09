# Audit View Clutter

Status: completed
Date: 2026-06-09

## Gap

The Codex Audit controls and empty audit panel render at the top of every Knowledge Board topic. This weakens the primary workflow: inspecting current memory by topic.

## Impact

Profile should answer "what does Codex currently remember?" without requiring the user to mentally skip an unrelated audit panel. Codex audit is valuable, but it is a review workflow and should live in a dedicated view.

## Acceptance

- Sidebar exposes a Review/Audit topic.
- Profile and other memory topics do not render the empty audit panel.
- Audit view renders mode selection, run action, errors, and report sections.
- Existing mocked audit test still proves reports render and correction notes are not written automatically.

## Verification

Passed in `docs/loop/verification/2026-06-09-overnight-optimization.md`.
