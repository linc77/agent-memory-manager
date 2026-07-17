import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  MemoryEntry,
  MemoryProfile,
  MemoryProfileConfidence,
  MemoryProfileSection,
  MemoryProfileStability,
  MemorySource,
  MemoryTopic,
  RiskFlag,
} from "../../../../src/lib/types";
import { resolveMemoryTruth } from "../../../../src/lib/memoryTruth";
import { isoNow, sha256 } from "../shared";

const supportedGenerators = new Set([
  "codex-profile-v2",
  "deterministic-profile-v4",
  "deterministic-profile-v4-fallback",
]);

const topicTitles: Partial<Record<MemoryTopic, string>> = {
  profile: "个人画像",
  projects: "项目与工作",
  rules: "协作规则",
  tools: "工具与工作方式",
  writing: "写作与表达",
  overrides: "近期修正",
};

export function currentMemoryEntries(
  sources: MemorySource[],
  entries: MemoryEntry[],
  risks: RiskFlag[],
) {
  return resolveMemoryTruth({ root: "", sources, entries, risks }).current.map((item) => item.entry);
}

function sourceHash(sources: MemorySource[], entries: MemoryEntry[]) {
  const currentPaths = new Set(entries.map((entry) => entry.sourcePath));
  return sha256(
    sources
      .filter((source) => currentPaths.has(source.relativePath))
      .map((source) => `${source.relativePath}${source.sha256}`)
      .join(""),
  );
}

function sectionId(topic: MemoryTopic, entries: MemoryEntry[]) {
  return `${topic}-${sha256(entries.map((entry) => entry.id).join("\n")).slice(0, 12)}`;
}

function sectionConfidence(entries: MemoryEntry[]): MemoryProfileConfidence {
  if (entries.some((entry) => entry.change?.operation === "replace")) return "high";
  return entries.length > 1 ? "medium" : "low";
}

function sectionStability(entries: MemoryEntry[]): MemoryProfileStability {
  if (entries.some((entry) => entry.change?.operation === "replace") || entries.length > 1) return "stable";
  return "uncertain";
}

function buildSections(current: MemoryEntry[]) {
  const grouped = new Map<MemoryTopic, MemoryEntry[]>();
  for (const entry of current) {
    const topic = entry.topic === "overrides"
      ? entry.relatedTopics.find((candidate) => topicTitles[candidate]) ?? "overrides"
      : entry.topic;
    if (!topicTitles[topic]) continue;
    const entries = grouped.get(topic) ?? [];
    entries.push(entry);
    grouped.set(topic, entries);
  }

  const sections: MemoryProfileSection[] = [];
  for (const [topic, entries] of grouped) {
    if (sections.length >= 6) break;
    const selected = entries.slice(0, 4);
    const observations = [...new Set(selected.map((entry) => entry.summary.trim()).filter(Boolean))];
    if (!observations.length) continue;
    sections.push({
      id: sectionId(topic, selected),
      title: topicTitles[topic]!,
      body: observations.join("；"),
      evidence: selected.map((entry) => ({
        sourcePath: entry.sourcePath,
        startLine: entry.startLine,
        endLine: entry.endLine,
        summary: entry.summary,
      })),
      confidence: sectionConfidence(selected),
      stability: sectionStability(selected),
    });
  }
  return sections;
}

export function buildMemoryProfileWithoutCache(
  root: string,
  sources: MemorySource[],
  entries: MemoryEntry[],
  risks: RiskFlag[],
): MemoryProfile {
  const current = currentMemoryEntries(sources, entries, risks);
  return {
    schemaVersion: "1",
    generatedAt: isoNow(),
    sourceHash: sourceHash(sources, current),
    generator: "deterministic-profile-v4",
    cachePath: join(root, ".backplane", "profile.json"),
    sections: buildSections(current),
    metadata: { memoryRoot: root, inputEntries: entries.length, currentEntries: current.length },
  };
}

export async function buildMemoryProfile(
  root: string,
  sources: MemorySource[],
  entries: MemoryEntry[],
  risks: RiskFlag[],
) {
  const profile = buildMemoryProfileWithoutCache(root, sources, entries, risks);
  await mkdir(dirname(profile.cachePath), { recursive: true });
  await writeFile(profile.cachePath, `${JSON.stringify(profile, null, 2)}\n`, { mode: 0o600 });
  return profile;
}

export async function loadMemoryProfileForRoot(
  root: string,
  sources: MemorySource[],
  entries: MemoryEntry[],
  risks: RiskFlag[],
) {
  const current = currentMemoryEntries(sources, entries, risks);
  const hash = sourceHash(sources, current);
  const cachePath = join(root, ".backplane", "profile.json");
  try {
    const cached = JSON.parse(await readFile(cachePath, "utf8")) as MemoryProfile;
    const uniqueTitles = new Set(cached.sections?.map((section) => section.title));
    const uniqueIds = new Set(cached.sections?.map((section) => section.id));
    if (
      cached.schemaVersion === "1" &&
      supportedGenerators.has(cached.generator) &&
      cached.sourceHash === hash &&
      Array.isArray(cached.sections) &&
      uniqueTitles.size === cached.sections.length &&
      uniqueIds.size === cached.sections.length
    ) {
      return {
        ...cached,
        cachePath,
        sourceHash: hash,
        metadata: { memoryRoot: root, inputEntries: entries.length, currentEntries: current.length },
      };
    }
  } catch {
    // A missing or stale cache is regenerated from the effective memory claims.
  }
  return buildMemoryProfile(root, sources, entries, risks);
}
