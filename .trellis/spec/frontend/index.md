# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

This directory contains guidelines for frontend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Global Agent Context](./agent-context.md) | Persistent Agent selection and workspace isolation | Active |
| [Directory Structure](./directory-structure.md) | Module organization and file layout | To fill |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | To fill |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | To fill |
| [State Management](./state-management.md) | Local state, global state, server state | To fill |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To fill |
| [Type Safety](./type-safety.md) | Type patterns, validation | To fill |

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.

## Pre-Development Checklist

- Read `agent-context.md` before changing Agent selection, Agent-scoped query
  keys, Memory/Skills/MCP workspaces, or provider configuration navigation.

## Quality Check

- Run `pnpm exec vitest run src/App.fixture.test.tsx src/lib/api.test.ts`.
- Assert non-Codex views contain no Codex-only write or Audit actions.
- Verify the selected Agent survives reload and scopes all visible workspaces.
