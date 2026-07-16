# Global Agent Context Contract

## 1. Scope / Trigger

Use this contract whenever a frontend workspace reads or changes Memory,
Skills, MCP, provider profiles, or other Agent-owned state. `selectedAgent` is
application context; it is not local tab state inside one workspace.

## 2. Signatures

```ts
type AgentKind = "codex" | "claudeCode" | "hermes";

readStoredAgent(): AgentKind;
writeStoredAgent(agent: AgentKind): void;
projectSkillInventory(inventory: SkillInventory, agent: AgentKind): SkillInventory;
loadAgentMemorySnapshot(agent: AgentKind): Promise<AgentMemorySnapshot>;
loadMcpInventory(agent: AgentKind): Promise<McpInventory>;
```

`App` owns `selectedAgent` and passes it explicitly to `Sidebar`,
`KnowledgeBoard`, `Inspector`, `SkillManager`, `McpManager`, and
`AgentConfigManager`.

## 3. Contracts

- Storage key: `agent-memory-manager.selected-agent`; invalid or missing values
  resolve to `codex`.
- The closed selector shows one Agent. Its menu exposes three radio-like
  choices and one action for the current Agent's provider configuration.
- All Agent-scoped TanStack Query keys include `AgentKind`. Shared raw
  inventories may use one key only when a pure projection is applied afterward.
- Switching clears entry, search, correction, Audit, and profile-generation UI
  state. A Codex-only Audit view routes to Home before a non-Codex Agent renders.
- Async Codex correction/profile callbacks must write only Codex cache/state;
  they must not surface a late result in Claude Code or Hermes UI.
- Non-Codex Memory is read-only. Audit, regenerate, `This is wrong`, correction
  dialogs, write feedback, and write errors remain Codex-only.
- Never silently substitute Codex data when another Agent has an empty or
  unavailable inventory.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Stored value is unknown | Select Codex without throwing |
| Agent changes while Audit/profile work runs | Cancel or hide the Codex task and clear transient UI |
| Non-Codex inventory is empty | Render an honest empty state for that Agent |
| Agent changes while a correction request resolves | Ignore the late draft outside Codex |
| Current Agent is not Codex | Remove Audit navigation and all correction actions |
| Provider inventory is loading | Show loading status, not a false `not installed` result |

## 5. Good / Base / Bad Cases

- Good: Select Hermes on MCP, remain on MCP, and immediately render only the
  Hermes inventory.
- Base: Reload with no stored selection and render Codex.
- Bad: Keep an internal Agent switcher in provider configuration that disagrees
  with the Sidebar.
- Bad: Reuse `scanMemories()` for Claude Code and label the Codex result as
  Claude memory.

## 6. Tests Required

- Persist and restore every supported `AgentKind`; reject invalid storage.
- Fixture switch Codex -> Claude Code -> Hermes and assert Memory, Skills, MCP,
  navigation, and provider cards change together.
- Assert Claude/Hermes never render Codex fixture text or correction controls.
- Assert Skill projection recomputes roots, copies, duplicates, validity, and
  tool labels.
- Verify the selector has menu/radio semantics, closes on Escape/outside click,
  and the browser console has no errors.

## 7. Wrong vs Correct

### Wrong

```tsx
<AgentConfigManager /> // owns a second selectedAgent state
```

### Correct

```tsx
<AgentConfigManager selectedAgent={selectedAgent} />
<McpManager selectedAgent={selectedAgent} />
```

One discriminant scopes every Agent-owned workspace.
