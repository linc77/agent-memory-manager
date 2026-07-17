import { describe, expect, it } from "vitest";
import type { MemoryEntry, MemorySource } from "../../../../src/lib/types";
import { buildMemoryProfileWithoutCache } from "./profile";

describe("deterministic memory profile", () => {
  it("deduplicates repeated observation titles", () => {
    const sources: MemorySource[] = ["one.md", "two.md"].map((relativePath, index) => ({
      id: String(index),
      path: `/tmp/${relativePath}`,
      relativePath,
      kind: "registry",
      modifiedMs: index,
      bytes: 10,
      lines: 2,
      sha256: relativePath,
    }));
    const entries: MemoryEntry[] = sources.map((source, index) => ({
      id: `entry-${index}`,
      topic: "rules",
      relatedTopics: [],
      title: `Rule ${index}`,
      summary: "The user wants collaboration rules to become executable behavior.",
      searchText: "The user wants collaboration rules to become executable behavior.",
      sourcePath: source.relativePath,
      startLine: 1,
      endLine: 2,
    }));
    const profile = buildMemoryProfileWithoutCache("/tmp", sources, entries, []);
    expect(new Set(profile.sections.map((section) => section.title)).size).toBe(profile.sections.length);
  });

  it("builds sections only from effective targeted claims", () => {
    const sources: MemorySource[] = [
      {
        id: "registry",
        path: "/tmp/MEMORY.md",
        relativePath: "MEMORY.md",
        kind: "registry",
        modifiedMs: 1,
        bytes: 10,
        lines: 4,
        sha256: "registry",
      },
      {
        id: "change",
        path: "/tmp/change.md",
        relativePath: "extensions/ad_hoc/notes/change.md",
        kind: "adHocNote",
        modifiedMs: 2,
        bytes: 10,
        lines: 2,
        sha256: "change",
      },
    ];
    const entries: MemoryEntry[] = [
      {
        id: "project-a",
        topic: "projects",
        relatedTopics: [],
        title: "Project A",
        summary: "Project A is active.",
        searchText: "Project A is active.",
        sourcePath: "MEMORY.md",
        startLine: 1,
        endLine: 2,
      },
      {
        id: "project-b",
        topic: "projects",
        relatedTopics: [],
        title: "Project B",
        summary: "Project B is active.",
        searchText: "Project B is active.",
        sourcePath: "MEMORY.md",
        startLine: 3,
        endLine: 4,
      },
      {
        id: "project-a-change",
        topic: "overrides",
        relatedTopics: ["projects"],
        title: "Project A correction",
        summary: "Project A is archived.",
        searchText: "Project A is archived.",
        sourcePath: "extensions/ad_hoc/notes/change.md",
        startLine: 1,
        endLine: 2,
        change: {
          id: "change-a",
          operation: "replace",
          targetEntryIds: ["project-a"],
          revertsChangeId: null,
          createdAt: "2026-07-17T00:00:00.000Z",
        },
      },
    ];

    const profile = buildMemoryProfileWithoutCache("/tmp", sources, entries, []);
    const body = profile.sections.map((section) => section.body).join("\n");
    expect(body).toContain("Project A is archived.");
    expect(body).toContain("Project B is active.");
    expect(body).not.toContain("Project A is active.");
  });
});
