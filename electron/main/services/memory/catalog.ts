import { readFile, stat } from "node:fs/promises";
import { relative, sep } from "node:path";
import type { AgentKind, MemoryEntry, MemorySource, ScanResult } from "../../../../src/lib/types";
import { isoNow, sha256, textLines } from "../shared";
import { memoryAdapter } from "./adapters";
import { parseEntries } from "./parser";
import { detectRisks } from "./risk";

interface CachedDocument {
  modifiedMs: number;
  bytes: number;
  source: MemorySource;
  entries: MemoryEntry[];
}

const cache = new Map<string, Map<string, CachedDocument>>();

function catalogKey(agent: AgentKind, root: string) {
  return `${agent}:${root}`;
}

export async function loadMemoryCatalog(agent: AgentKind, root: string): Promise<ScanResult> {
  const adapter = memoryAdapter(agent);
  const discovered = (await adapter.discover(root)).sort((left, right) => left.path.localeCompare(right.path));
  const previous = cache.get(catalogKey(agent, root)) ?? new Map<string, CachedDocument>();
  const next = new Map<string, CachedDocument>();
  let reusedSources = 0;
  let changedSources = 0;

  for (const item of discovered) {
    const metadata = await stat(item.path);
    const cached = previous.get(item.path);
    if (cached && cached.modifiedMs === metadata.mtimeMs && cached.bytes === metadata.size) {
      next.set(item.path, cached);
      reusedSources += 1;
      continue;
    }

    const text = await readFile(item.path, "utf8");
    const hash = sha256(text);
    const relativePath = relative(root, item.path).split(sep).join("/");
    const source: MemorySource = {
      id: hash.slice(0, 16),
      path: item.path,
      relativePath,
      kind: item.kind,
      modifiedMs: metadata.mtimeMs,
      bytes: metadata.size,
      lines: textLines(text).length,
      sha256: hash,
    };
    next.set(item.path, {
      modifiedMs: metadata.mtimeMs,
      bytes: metadata.size,
      source,
      entries: parseEntries(relativePath, text),
    });
    changedSources += 1;
  }

  cache.set(catalogKey(agent, root), next);
  const documents = [...next.values()].sort((left, right) =>
    left.source.relativePath.localeCompare(right.source.relativePath));
  const sources = documents.map((document) => document.source);
  const entries = documents.flatMap((document) => document.entries);
  return {
    root,
    sources,
    entries,
    risks: detectRisks(entries),
    catalog: { indexedAt: isoNow(), reusedSources, changedSources },
  };
}

export function clearMemoryCatalog(root: string, agent?: AgentKind) {
  if (agent) {
    cache.delete(catalogKey(agent, root));
    return;
  }
  for (const key of cache.keys()) {
    if (key.endsWith(`:${root}`)) cache.delete(key);
  }
}
