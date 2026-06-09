#!/usr/bin/env bash
set -euo pipefail

files=(
  AGENTS.md
  docs/README.md
  docs/loop/README.md
  docs/loop/verification/2026-06-09-overnight-handoff.md
)

missing=0
while IFS= read -r path; do
  if [[ "$path" == *"*"* ]]; then
    continue
  fi
  if [[ ! -e "$path" ]]; then
    printf 'missing loop artifact: %s\n' "$path" >&2
    missing=1
  fi
done < <(rg -o --no-filename '`docs/loop/[^`]+`' "${files[@]}" | tr -d '`' | sort -u)

exit "$missing"
