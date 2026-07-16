import { agentMeta } from "./agentScope";
import type {
  AgentKind,
  SkillCapability,
  SkillCopy,
  SkillHealth,
  SkillInventory,
} from "./types";

function projectCapability(
  capability: SkillCapability,
  allowedTools: Set<string>,
): SkillCapability | null {
  const copies = capability.copies.filter((copy) => allowedTools.has(copy.tool));
  if (!copies.length) {
    return null;
  }
  const tools = Array.from(new Set(copies.map((copy) => copy.tool))).sort();
  const health: SkillHealth = copies.every((copy) => copy.valid) ? "ready" : "invalid";
  return {
    ...capability,
    health,
    copyCount: copies.length,
    tools,
    copies,
  };
}

export function projectSkillInventory(
  inventory: SkillInventory,
  agent: AgentKind,
): SkillInventory {
  const allowedTools = new Set(agentMeta[agent].skillTools);
  const capabilities = inventory.capabilities
    .map((capability) => projectCapability(capability, allowedTools))
    .filter((capability): capability is SkillCapability => Boolean(capability));
  const copies: SkillCopy[] = capabilities.flatMap((capability) => capability.copies);

  return {
    ...inventory,
    capabilityCount: capabilities.length,
    copyCount: copies.length,
    duplicateGroupCount: capabilities.filter((capability) => capability.copyCount > 1).length,
    invalidCount: copies.filter((copy) => !copy.valid).length,
    roots: inventory.roots.filter((root) => allowedTools.has(root.tool)),
    capabilities,
  };
}
