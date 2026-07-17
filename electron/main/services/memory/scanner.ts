import type { AgentKind } from "../../../../src/lib/types";
import { loadMemoryCatalog } from "./catalog";

export async function scanSources(root: string) {
  return (await loadMemoryCatalog("codex", root)).sources;
}

export async function scanAgentSources(agent: AgentKind, root: string) {
  return (await loadMemoryCatalog(agent, root)).sources;
}
