import type { AgentKind, ScanResult } from "../../../../src/lib/types";
import { loadMemoryCatalog } from "./catalog";
import { defaultAgentMemoryRoot, resolveMemoryRoot } from "./paths";
import { buildMemoryProfileWithoutCache, loadMemoryProfileForRoot } from "./profile";

async function buildScan(root: string, agent?: AgentKind): Promise<ScanResult> {
  return loadMemoryCatalog(agent ?? "codex", root);
}

export function scanMemories(rootOverride?: string | null) {
  return buildScan(resolveMemoryRoot(rootOverride));
}

export async function loadAgentMemorySnapshot(agent: AgentKind) {
  const root = defaultAgentMemoryRoot(agent);
  const scan = await buildScan(root, agent);
  return {
    agent,
    writable: true,
    scan,
    profile: buildMemoryProfileWithoutCache(root, scan.sources, scan.entries, scan.risks),
  };
}

export async function loadMemoryProfile(rootOverride?: string | null) {
  const root = resolveMemoryRoot(rootOverride);
  const scan = await buildScan(root);
  return loadMemoryProfileForRoot(root, scan.sources, scan.entries, scan.risks);
}
