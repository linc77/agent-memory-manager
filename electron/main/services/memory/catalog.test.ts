import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadMemoryCatalog } from "./catalog";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("memory catalog", () => {
  it("reuses unchanged documents without reparsing them", async () => {
    const root = await mkdtemp(join(tmpdir(), "backplane-catalog-"));
    roots.push(root);
    await writeFile(join(root, "MEMORY.md"), "# Memory\n\nProject A is active.\n");

    const first = await loadMemoryCatalog("codex", root);
    const second = await loadMemoryCatalog("codex", root);

    expect(first.catalog).toMatchObject({ changedSources: 1, reusedSources: 0 });
    expect(second.catalog).toMatchObject({ changedSources: 0, reusedSources: 1 });
    expect(second.entries).toEqual(first.entries);
  });
});
