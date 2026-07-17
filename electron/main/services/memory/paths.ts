import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentKind } from "../../../../src/lib/types";
import { nonBlankEnvironmentPath, resolveHomePath } from "../shared";

export function defaultMemoryRoot() {
  return join(homedir(), ".codex", "memories");
}

export function resolveMemoryRoot(rootOverride?: string | null) {
  const value = rootOverride?.trim();
  return value ? resolveHomePath(value) : defaultMemoryRoot();
}

export function resolveAgentMemoryRoot(agent: AgentKind, rootOverride?: string | null) {
  const value = rootOverride?.trim();
  return value ? resolveHomePath(value) : defaultAgentMemoryRoot(agent);
}

export function defaultAgentMemoryRoot(agent: AgentKind) {
  switch (agent) {
    case "codex":
      return defaultMemoryRoot();
    case "claudeCode":
      return join(nonBlankEnvironmentPath("CLAUDE_CONFIG_DIR") ?? join(homedir(), ".claude"), "projects");
    case "hermes":
      return join(nonBlankEnvironmentPath("HERMES_HOME") ?? join(homedir(), ".hermes"), "memories");
  }
}
