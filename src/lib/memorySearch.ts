import type { MemoryEntry, MemoryProfileSection, MemorySource } from "./types";

interface SearchableMemory {
  entries: MemoryEntry[];
  sources: MemorySource[];
  sections: MemoryProfileSection[];
}

function tokens(value: string) {
  return value
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .filter(Boolean);
}

function score(query: string, weightedText: Array<[string, number]>) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return 1;
  const queryTokens = [...new Set(tokens(normalized))];
  let total = 0;
  for (const [text, weight] of weightedText) {
    const lower = text.toLocaleLowerCase();
    if (lower.includes(normalized)) total += weight * 4;
    for (const token of queryTokens) {
      if (lower.includes(token)) total += weight;
    }
  }
  return total;
}

function ranked<T>(items: T[], scorer: (item: T) => number) {
  return items
    .map((item, index) => ({ item, index, score: scorer(item) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((result) => result.item);
}

export function searchMemory(query: string, memory: SearchableMemory): SearchableMemory {
  if (!query.trim()) return memory;
  return {
    entries: ranked(memory.entries, (entry) => score(query, [
      [entry.title, 12],
      [entry.summary, 8],
      [entry.searchText, 2],
      [entry.sourcePath, 1],
    ])),
    sources: ranked(memory.sources, (source) => score(query, [
      [source.relativePath, 10],
      [source.kind, 4],
      [source.sha256, 1],
    ])),
    sections: ranked(memory.sections, (section) => score(query, [
      [section.title, 12],
      [section.body, 8],
      [section.evidence.map((item) => `${item.sourcePath} ${item.summary}`).join(" "), 2],
    ])),
  };
}
