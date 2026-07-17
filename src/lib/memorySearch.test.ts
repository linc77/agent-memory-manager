import { describe, expect, it } from "vitest";
import { searchMemory } from "./memorySearch";
import type { MemoryEntry } from "./types";

function entry(id: string, title: string, summary: string): MemoryEntry {
  return {
    id,
    topic: "projects",
    relatedTopics: [],
    title,
    summary,
    searchText: `${title} ${summary}`,
    sourcePath: `${id}.md`,
    startLine: 1,
    endLine: 1,
  };
}

describe("memory search", () => {
  it("ranks title matches ahead of body-only matches", () => {
    const result = searchMemory("BeeBotOS", {
      entries: [
        entry("body", "Current projects", "BeeBotOS is active."),
        entry("title", "BeeBotOS workflow", "Daily synchronization rules."),
      ],
      sources: [],
      sections: [],
    });
    expect(result.entries.map((item) => item.id)).toEqual(["title", "body"]);
  });

  it("supports Chinese terms and omits unrelated memory", () => {
    const result = searchMemory("写作", {
      entries: [entry("writing", "写作偏好", "表达自然"), entry("tools", "工具", "检查日志")],
      sources: [],
      sections: [],
    });
    expect(result.entries.map((item) => item.id)).toEqual(["writing"]);
  });
});
