#!/usr/bin/env bash
set -euo pipefail

pnpm build
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture
cargo check --manifest-path src-tauri/Cargo.toml
git diff --check

