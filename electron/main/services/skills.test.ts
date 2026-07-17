import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildSkillInventory, parseSkillManifest, saveSkillManifest } from "./skills";
import { sha256 } from "./shared";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("native Skill discovery parity", () => {
  it("parses scalar, folded, and literal frontmatter", () => {
    expect(parseSkillManifest('---\nname: demo\ndescription: "A useful skill"\n---\n# Demo\n\nUse it.')).toEqual({
      name: "demo",
      description: "A useful skill",
      markdown: "# Demo\n\nUse it.",
    });
    expect(parseSkillManifest("---\nname: folded\ndescription: >\n  First line.\n  Second line.\n---").description)
      .toBe("First line. Second line.");
    expect(parseSkillManifest("---\nname: literal\ndescription: |\n  First line.\n  Second line.\n---").description)
      .toBe("First line.\nSecond line.");
    expect(() => parseSkillManifest("# Demo")).toThrow("Missing YAML frontmatter");
    expect(() => parseSkillManifest("---\nname: [broken\ndescription: broken\n---"))
      .toThrow();
    expect(() => parseSkillManifest("---\nname: 42\ndescription: valid\n---"))
      .toThrow("Missing frontmatter name");
    expect(() => parseSkillManifest("---\nname: demo\ndescription: false\n---"))
      .toThrow("Missing frontmatter description");
  });

  it("groups identical copies and writes a snapshot", async () => {
    const root = await mkdtemp(join(tmpdir(), "amm-skills-"));
    roots.push(root);
    const global = join(root, "global");
    const project = join(root, "project");
    const managed = join(root, "managed/demo");
    await mkdir(managed, { recursive: true });
    await mkdir(join(project, "demo-copy"), { recursive: true });
    await mkdir(join(global, "broken"), { recursive: true });
    const manifest = "---\nname: demo\ndescription: Demo capability\n---\n# Demo\n\n- First step\n";
    await writeFile(join(managed, "SKILL.md"), manifest);
    await writeFile(join(project, "demo-copy/SKILL.md"), manifest);
    await writeFile(join(global, "broken/SKILL.md"), "# broken");
    await symlink(managed, join(global, "demo-link"));
    const inventory = await buildSkillInventory(
      [
        { id: "global", label: "Global", path: global, tool: "Agents", scope: "global" },
        { id: "project", label: "Project", path: project, tool: "Codex", scope: "project" },
      ],
      join(root, "amm/skill-inventory.json"),
    );
    expect(inventory.copyCount).toBe(3);
    expect(inventory.capabilityCount).toBe(2);
    expect(inventory.duplicateGroupCount).toBe(1);
    expect(inventory.invalidCount).toBe(1);
    expect(inventory.capabilities.find((capability) => capability.name === "demo")?.copyCount).toBe(2);
    expect(inventory.capabilities.find((capability) => capability.name === "demo")?.markdown)
      .toContain("# Demo");
    expect(inventory.capabilities.find((capability) => capability.health === "invalid")?.markdown)
      .toBe("# broken");
    expect(inventory.snapshotError).toBeNull();
  });

  it("saves only a discovered manifest with an unchanged content hash", async () => {
    const root = await mkdtemp(join(tmpdir(), "backplane-skill-edit-"));
    roots.push(root);
    const manifestPath = join(root, ".agents/skills/demo/SKILL.md");
    const outsidePath = join(root, "outside/SKILL.md");
    const original = "---\nname: demo\ndescription: Original\n---\n# Demo\n";
    const updated = "---\nname: demo\ndescription: Updated\n---\n# Demo\n\nSaved.\n";
    await mkdir(dirname(manifestPath), { recursive: true });
    await mkdir(dirname(outsidePath), { recursive: true });
    await writeFile(manifestPath, original);
    await writeFile(outsidePath, original);

    const inventory = await saveSkillManifest(
      { manifestPath, source: updated, expectedContentHash: sha256(original) },
      root,
      join(root, ".agent-backplane/skill-inventory.json"),
    );

    expect(await readFile(manifestPath, "utf8")).toBe(updated);
    expect(inventory.capabilities.find((capability) => capability.name === "demo")?.description)
      .toBe("Updated");
    await expect(saveSkillManifest(
      { manifestPath, source: "# Invalid", expectedContentHash: sha256(updated) },
      root,
      join(root, ".agent-backplane/skill-inventory.json"),
    )).rejects.toThrow("Missing YAML frontmatter");
    expect(await readFile(manifestPath, "utf8")).toBe(updated);
    await expect(saveSkillManifest(
      { manifestPath, source: original, expectedContentHash: sha256(original) },
      root,
      join(root, ".agent-backplane/skill-inventory.json"),
    )).rejects.toThrow("changed since it was loaded");
    await expect(saveSkillManifest(
      { manifestPath: outsidePath, source: updated, expectedContentHash: sha256(original) },
      root,
      join(root, ".agent-backplane/skill-inventory.json"),
    )).rejects.toThrow("outside the discovered roots");
  });
});
