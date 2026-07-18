import {
  lstat,
  mkdir,
  readFile,
  readlink,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentKind, SkillSourceInput } from "../../../src/lib/types";
import { sha256 } from "./shared";
import { createSkillProfileService } from "./skillProfiles";

const renameFault = vi.hoisted(() => ({ destination: "", remaining: 0 }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    rename: async (oldPath: Parameters<typeof actual.rename>[0], newPath: Parameters<typeof actual.rename>[1]) => {
      if (
        renameFault.remaining > 0
        && String(newPath) === renameFault.destination
        && String(oldPath).endsWith(".tmp")
      ) {
        renameFault.remaining -= 1;
        throw new Error("injected Skill deployment failure");
      }
      return actual.rename(oldPath, newPath);
    },
  };
});

const temporaryRoots: string[] = [];

afterEach(async () => {
  renameFault.destination = "";
  renameFault.remaining = 0;
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function temporaryRoot() {
  const { mkdtemp } = await import("node:fs/promises");
  const root = await mkdtemp(join(tmpdir(), "backplane-skill-profiles-"));
  temporaryRoots.push(root);
  return root;
}

async function createProject(root: string, name: string) {
  const path = join(root, "projects", name);
  await mkdir(path, { recursive: true });
  return path;
}

async function createSkill(
  root: string,
  parent: string,
  directoryName: string,
  name = directoryName,
): Promise<SkillSourceInput> {
  const sourcePath = join(root, parent, directoryName);
  const source = `---\nname: ${name}\ndescription: ${name} test Skill\n---\n# ${name}\n`;
  await mkdir(sourcePath, { recursive: true });
  await writeFile(join(sourcePath, "SKILL.md"), source);
  return { name, sourcePath, contentHash: sha256(source), scope: "library" };
}

function bindingFor(
  workspace: Awaited<ReturnType<ReturnType<typeof createSkillProfileService>["load"]>>,
  projectId: string,
  agent: AgentKind,
) {
  const binding = workspace.bindings.find((item) => item.projectId === projectId && item.agent === agent);
  if (!binding) throw new Error("Expected project Skill binding");
  return binding;
}

describe("Skill profile service", () => {
  it("registers canonical projects and reuses Agent-scoped profiles across projects", async () => {
    const root = await temporaryRoot();
    const projectA = await createProject(root, "project-a");
    const projectB = await createProject(root, "project-b");
    const projectAlias = join(root, "project-a-alias");
    await symlink(projectA, projectAlias, "dir");
    const first = await createSkill(root, "library", "first-skill");
    const second = await createSkill(root, "library", "second-skill");
    const firstAlias = join(root, "aliases", "first-skill");
    await mkdir(join(root, "aliases"), { recursive: true });
    await symlink(first.sourcePath, firstAlias, "dir");
    const service = createSkillProfileService({ catalogPath: join(root, "state", "profiles.json") });

    let workspace = await service.registerProject(projectAlias);
    workspace = await service.registerProject(projectA);
    workspace = await service.registerProject(projectB);
    expect(workspace.projects).toHaveLength(2);
    const registeredA = workspace.projects.find((project) => project.name === "project-a")!;
    const registeredB = workspace.projects.find((project) => project.name === "project-b")!;
    expect(registeredA.rootPath).toBe(await realpath(projectA));
    expect(registeredA.id).toBe(sha256(await realpath(projectA)));

    workspace = await service.saveSelection({
      projectId: registeredA.id,
      agent: "codex",
      skills: [
        { ...first, sourcePath: firstAlias, scope: "project" },
        first,
      ],
    });
    const selected = bindingFor(workspace, registeredA.id, "codex");
    expect(selected.skills).toHaveLength(1);
    expect(selected.skills[0]).toMatchObject({
      sourceId: sha256(await realpath(first.sourcePath)),
      sourcePath: await realpath(first.sourcePath),
      scope: "library",
    });

    workspace = await service.saveProfile({
      id: null,
      name: "Frontend",
      projectId: registeredA.id,
      agent: "codex",
    });
    const profileId = workspace.profiles[0].id;
    workspace = await service.applyProfile({ profileId, projectId: registeredB.id });
    expect(bindingFor(workspace, registeredB.id, "codex").skills[0].sourceId)
      .toBe(selected.skills[0].sourceId);

    await service.saveSelection({ projectId: registeredA.id, agent: "codex", skills: [second] });
    workspace = await service.saveProfile({
      id: profileId,
      name: "Frontend",
      projectId: registeredA.id,
      agent: "codex",
    });
    expect(workspace.profiles[0].skills[0].name).toBe("second-skill");
    expect(bindingFor(workspace, registeredB.id, "codex").skills[0].name).toBe("first-skill");
    workspace = await service.applyProfile({ profileId, projectId: registeredB.id });
    expect(bindingFor(workspace, registeredB.id, "codex").skills[0].name).toBe("second-skill");

    workspace = await service.deleteProfile(profileId);
    expect(workspace.profiles).toHaveLength(0);
    expect(bindingFor(workspace, registeredB.id, "codex")).toMatchObject({ profileId: null });
    expect(bindingFor(workspace, registeredB.id, "codex").skills[0].name).toBe("second-skill");

    const reloaded = await createSkillProfileService({
      catalogPath: join(root, "state", "profiles.json"),
    }).load();
    expect(reloaded.projects).toHaveLength(2);
    expect(bindingFor(reloaded, registeredA.id, "codex").skills[0].name).toBe("second-skill");
  });

  it("syncs each Agent to its native project directory and is idempotent", async () => {
    const root = await temporaryRoot();
    const projectPath = await createProject(root, "targets");
    const service = createSkillProfileService({ catalogPath: join(root, "state.json") });
    const registered = (await service.registerProject(projectPath)).projects[0];
    const cases: Array<[AgentKind, string]> = [
      ["codex", ".agents/skills"],
      ["claudeCode", ".claude/skills"],
      ["hermes", ".hermes/skills"],
    ];

    for (const [agent, relativeTarget] of cases) {
      const skill = await createSkill(root, `library-${agent}`, `${agent}-skill`);
      await service.saveSelection({ projectId: registered.id, agent, skills: [skill] });
      const first = await service.sync({ projectId: registered.id, agent });
      const destination = join(registered.rootPath, relativeTarget, `${agent}-skill`);
      expect(first.status).toBe("synced");
      expect((await lstat(destination)).isSymbolicLink()).toBe(true);
      expect(await realpath(destination)).toBe(await realpath(skill.sourcePath));
      expect(bindingFor(first.workspace, registered.id, agent).deployments).toHaveLength(1);

      const second = await service.sync({ projectId: registered.id, agent });
      expect(second.status).toBe("unchanged");
      expect(second.unchanged).toEqual([destination]);
      expect(bindingFor(second.workspace, registered.id, agent).syncStatus.state).toBe("synced");
    }
  });

  it("reports unmanaged conflicts and removes only managed links", async () => {
    const root = await temporaryRoot();
    const projectPath = await createProject(root, "conflicts");
    const skill = await createSkill(root, "library", "demo");
    const service = createSkillProfileService({ catalogPath: join(root, "state.json") });
    const project = (await service.registerProject(projectPath)).projects[0];
    await service.saveSelection({ projectId: project.id, agent: "codex", skills: [skill] });
    const targetRoot = join(project.rootPath, ".agents/skills");
    const destination = join(targetRoot, "demo");
    const unmanaged = join(targetRoot, "manual");
    await mkdir(destination, { recursive: true });
    await writeFile(join(destination, "keep.txt"), "keep");

    let result = await service.sync({ projectId: project.id, agent: "codex" });
    expect(result.status).toBe("conflict");
    expect(result.conflicts).toEqual([{
      directoryName: "demo",
      destinationPath: destination,
      reason: "unmanaged-target",
    }]);
    expect(await readFile(join(destination, "keep.txt"), "utf8")).toBe("keep");
    expect(bindingFor(result.workspace, project.id, "codex").deployments).toHaveLength(0);

    await rm(destination, { recursive: true });
    result = await service.sync({ projectId: project.id, agent: "codex" });
    expect(result.status).toBe("synced");
    await mkdir(unmanaged, { recursive: true });
    await writeFile(join(unmanaged, "keep.txt"), "keep");
    await service.saveSelection({ projectId: project.id, agent: "codex", skills: [] });
    result = await service.sync({ projectId: project.id, agent: "codex" });
    expect(result.status).toBe("synced");
    expect(await lstat(destination).catch(() => null)).toBeNull();
    expect(await readFile(join(unmanaged, "keep.txt"), "utf8")).toBe("keep");
    expect(bindingFor(result.workspace, project.id, "codex").deployments).toHaveLength(0);
  });

  it("uses content hashes only to report source drift", async () => {
    const root = await temporaryRoot();
    const projectPath = await createProject(root, "drift");
    const skill = await createSkill(root, "library", "changing");
    const service = createSkillProfileService({ catalogPath: join(root, "state.json") });
    const project = (await service.registerProject(projectPath)).projects[0];
    const originalSourceId = sha256(await realpath(skill.sourcePath));
    await service.saveSelection({ projectId: project.id, agent: "codex", skills: [skill] });
    await writeFile(join(skill.sourcePath, "SKILL.md"), "changed after selection\n");

    const first = await service.sync({ projectId: project.id, agent: "codex" });
    expect(first.status).toBe("synced");
    expect(first.driftedSources).toHaveLength(1);
    expect(first.driftedSources[0]).toMatchObject({ sourceId: originalSourceId });
    expect(bindingFor(first.workspace, project.id, "codex")).toMatchObject({
      syncStatus: { state: "drifted" },
    });

    const second = await service.sync({ projectId: project.id, agent: "codex" });
    expect(second.status).toBe("unchanged");
    expect(second.driftedSources).toHaveLength(1);
    expect(bindingFor(second.workspace, project.id, "codex").skills[0].sourceId)
      .toBe(originalSourceId);
  });

  it("rolls back managed links when deployment fails", async () => {
    const root = await temporaryRoot();
    const projectPath = await createProject(root, "rollback");
    const oldSkill = await createSkill(root, "old-library", "shared", "old-shared");
    const newSkill = await createSkill(root, "new-library", "shared", "new-shared");
    const service = createSkillProfileService({ catalogPath: join(root, "state.json") });
    const project = (await service.registerProject(projectPath)).projects[0];
    await service.saveSelection({ projectId: project.id, agent: "codex", skills: [oldSkill] });
    await service.sync({ projectId: project.id, agent: "codex" });
    const destination = join(project.rootPath, ".agents/skills/shared");
    const oldCanonicalPath = await realpath(oldSkill.sourcePath);
    const oldDeployment = bindingFor(await service.load(), project.id, "codex").deployments[0];

    await service.saveSelection({ projectId: project.id, agent: "codex", skills: [newSkill] });
    renameFault.destination = destination;
    renameFault.remaining = 1;
    const result = await service.sync({ projectId: project.id, agent: "codex" });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("injected Skill deployment failure");
    expect(await realpath(destination)).toBe(oldCanonicalPath);
    const binding = bindingFor(result.workspace, project.id, "codex");
    expect(binding.deployments).toEqual([oldDeployment]);
    expect(binding.skills[0].sourceId).toBe(sha256(await realpath(newSkill.sourcePath)));
    expect(binding.syncStatus.state).toBe("failed");
    expect((await readdir(join(project.rootPath, ".agents/skills"))).sort()).toEqual(["shared"]);
    expect(await readlink(destination)).toBe(oldCanonicalPath);
  });
});
