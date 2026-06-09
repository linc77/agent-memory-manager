// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  draftCorrectionFromContent,
  openSourceFile,
  runCodexAudit,
  scanMemories,
  writeCorrection,
} from "./api";

const invokeMock = vi.hoisted(() => vi.fn());
const revealItemInDirMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  revealItemInDir: revealItemInDirMock,
}));

describe("fixture API mode", () => {
  beforeEach(() => {
    window.history.pushState(null, "", "/?fixture=1");
  });

  afterEach(() => {
    window.history.pushState(null, "", "/");
    invokeMock.mockReset();
    revealItemInDirMock.mockReset();
  });

  it("serves scan data without calling Tauri", async () => {
    const scan = await scanMemories("/tmp/demo-memory");

    expect(scan.root).toBe("/tmp/demo-memory");
    expect(scan.sources[0].path).toBe("/tmp/demo-memory/MEMORY.md");
    expect(scan.entries.some((entry) => entry.topic === "profile")).toBe(true);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("serves audit and correction commands without calling Tauri", async () => {
    const audit = await runCodexAudit("/tmp/demo-memory", "full");
    const draft = await draftCorrectionFromContent(
      "/tmp/demo-memory",
      "Clarify Stack",
      "- The current stack is Python/Rust.",
    );
    const written = await writeCorrection("/tmp/demo-memory", draft);
    await openSourceFile("/tmp/demo-memory/MEMORY.md");

    expect(audit.report.mode).toBe("full");
    expect(audit.report.metadata.memoryRoot).toBe("/tmp/demo-memory");
    expect(draft.slug).toBe("clarify-stack");
    expect(draft.content).toContain("Memory update request:");
    expect(written).toBe(draft.targetPath);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(revealItemInDirMock).not.toHaveBeenCalled();
  });
});
