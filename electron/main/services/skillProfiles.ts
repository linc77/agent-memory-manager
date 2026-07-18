import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  stat,
  symlink,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import type {
  AgentKind,
  ApplySkillProfileInput,
  ProjectSkillBinding,
  SaveProjectSkillSelectionInput,
  SaveSkillProfileInput,
  SkillBindingSyncStatus,
  SkillDeploymentEntry,
  SkillProfile,
  SkillProfileWorkspace,
  SkillProject,
  SkillScope,
  SkillSourceDrift,
  SkillSourceInput,
  SkillSourceRef,
  SkillSyncConflict,
  SkillSyncResult,
  SyncProjectSkillsInput,
} from "../../../src/lib/types";
import { atomicWrite, isoNow, sha256 } from "./shared";

export interface SkillProfileServicePaths {
  catalogPath: string;
}

interface StoredCatalog {
  schemaVersion: 1;
  projects: SkillProject[];
  profiles: SkillProfile[];
  bindings: ProjectSkillBinding[];
}

interface DesiredDeployment {
  skill: SkillSourceRef;
  entry: SkillDeploymentEntry;
}

interface DeploymentPlan {
  additions: DesiredDeployment[];
  replacements: Array<{ desired: DesiredDeployment; previous: SkillDeploymentEntry }>;
  removals: SkillDeploymentEntry[];
  missingRemovals: SkillDeploymentEntry[];
  unchanged: DesiredDeployment[];
  conflicts: SkillSyncConflict[];
}

const agents = new Set<AgentKind>(["codex", "claudeCode", "hermes"]);
const scopes = new Set<SkillScope>(["library", "global", "project"]);
const syncStates = new Set<SkillBindingSyncStatus["state"]>([
  "never",
  "pending",
  "synced",
  "drifted",
  "conflict",
  "failed",
]);
const targetDirectories: Record<AgentKind, string> = {
  codex: ".agents/skills",
  claudeCode: ".claude/skills",
  hermes: ".hermes/skills",
};
const scopePriority: Record<SkillScope, number> = { library: 0, global: 1, project: 2 };

function emptyCatalog(): StoredCatalog {
  return { schemaVersion: 1, projects: [], profiles: [], bindings: [] };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function stringOrNull(value: unknown, label: string) {
  if (value === null) return null;
  return stringValue(value, label);
}

function arrayValue(value: unknown, label: string) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function parseAgent(value: unknown, label: string): AgentKind {
  const agent = stringValue(value, label) as AgentKind;
  if (!agents.has(agent)) throw new Error(`${label} is unsupported`);
  return agent;
}

function parseScope(value: unknown, label: string): SkillScope {
  const scope = stringValue(value, label) as SkillScope;
  if (!scopes.has(scope)) throw new Error(`${label} is unsupported`);
  return scope;
}

function parseContentHash(value: unknown, label: string) {
  const hash = stringValue(value, label).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`${label} must be a SHA-256 hash`);
  return hash;
}

function safeDirectoryName(value: unknown, label: string) {
  const name = stringValue(value, label);
  if (name === "." || name === ".." || basename(name) !== name) {
    throw new Error(`${label} must be one directory name`);
  }
  return name;
}

function parseSource(value: unknown, label: string): SkillSourceRef {
  const item = record(value, label);
  return {
    sourceId: stringValue(item.sourceId, `${label}.sourceId`),
    name: stringValue(item.name, `${label}.name`),
    directoryName: safeDirectoryName(item.directoryName, `${label}.directoryName`),
    sourcePath: stringValue(item.sourcePath, `${label}.sourcePath`),
    manifestPath: stringValue(item.manifestPath, `${label}.manifestPath`),
    contentHash: parseContentHash(item.contentHash, `${label}.contentHash`),
    scope: parseScope(item.scope, `${label}.scope`),
  };
}

function parseDeployment(value: unknown, label: string): SkillDeploymentEntry {
  const item = record(value, label);
  return {
    sourceId: stringValue(item.sourceId, `${label}.sourceId`),
    sourcePath: stringValue(item.sourcePath, `${label}.sourcePath`),
    destinationPath: stringValue(item.destinationPath, `${label}.destinationPath`),
    contentHash: parseContentHash(item.contentHash, `${label}.contentHash`),
  };
}

function parseSyncStatus(value: unknown, label: string): SkillBindingSyncStatus {
  const item = record(value, label);
  const state = stringValue(item.state, `${label}.state`) as SkillBindingSyncStatus["state"];
  if (!syncStates.has(state)) throw new Error(`${label}.state is unsupported`);
  return {
    state,
    syncedAt: item.syncedAt === null ? null : stringValue(item.syncedAt, `${label}.syncedAt`),
    message: item.message === null ? null : stringValue(item.message, `${label}.message`),
  };
}

function parseProject(value: unknown, index: number): SkillProject {
  const label = `projects[${index}]`;
  const item = record(value, label);
  return {
    id: stringValue(item.id, `${label}.id`),
    name: stringValue(item.name, `${label}.name`),
    rootPath: stringValue(item.rootPath, `${label}.rootPath`),
    createdAt: stringValue(item.createdAt, `${label}.createdAt`),
    updatedAt: stringValue(item.updatedAt, `${label}.updatedAt`),
  };
}

function parseProfile(value: unknown, index: number): SkillProfile {
  const label = `profiles[${index}]`;
  const item = record(value, label);
  return {
    id: stringValue(item.id, `${label}.id`),
    name: stringValue(item.name, `${label}.name`),
    agent: parseAgent(item.agent, `${label}.agent`),
    skills: arrayValue(item.skills, `${label}.skills`).map((source, sourceIndex) =>
      parseSource(source, `${label}.skills[${sourceIndex}]`)),
    createdAt: stringValue(item.createdAt, `${label}.createdAt`),
    updatedAt: stringValue(item.updatedAt, `${label}.updatedAt`),
  };
}

function parseBinding(value: unknown, index: number): ProjectSkillBinding {
  const label = `bindings[${index}]`;
  const item = record(value, label);
  return {
    projectId: stringValue(item.projectId, `${label}.projectId`),
    agent: parseAgent(item.agent, `${label}.agent`),
    profileId: stringOrNull(item.profileId, `${label}.profileId`),
    skills: arrayValue(item.skills, `${label}.skills`).map((source, sourceIndex) =>
      parseSource(source, `${label}.skills[${sourceIndex}]`)),
    deployments: arrayValue(item.deployments, `${label}.deployments`).map((deployment, deploymentIndex) =>
      parseDeployment(deployment, `${label}.deployments[${deploymentIndex}]`)),
    syncStatus: parseSyncStatus(item.syncStatus, `${label}.syncStatus`),
    updatedAt: stringValue(item.updatedAt, `${label}.updatedAt`),
  };
}

async function loadCatalog(path: string): Promise<StoredCatalog> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyCatalog();
    throw error;
  }
  if (!text.trim()) return emptyCatalog();
  const root = record(JSON.parse(text), "Skill profile catalog");
  if (root.schemaVersion !== 1) {
    throw new Error(`unsupported Skill profile catalog schema ${String(root.schemaVersion)}`);
  }
  return {
    schemaVersion: 1,
    projects: arrayValue(root.projects, "projects").map(parseProject),
    profiles: arrayValue(root.profiles, "profiles").map(parseProfile),
    bindings: arrayValue(root.bindings, "bindings").map(parseBinding),
  };
}

function copySource(source: SkillSourceRef): SkillSourceRef {
  return { ...source };
}

function copyBinding(binding: ProjectSkillBinding): ProjectSkillBinding {
  return {
    ...binding,
    skills: binding.skills.map(copySource),
    deployments: binding.deployments.map((entry) => ({ ...entry })),
    syncStatus: { ...binding.syncStatus },
  };
}

function workspace(catalog: StoredCatalog, catalogPath: string): SkillProfileWorkspace {
  return {
    schemaVersion: 1,
    generatedAt: isoNow(),
    catalogPath,
    projects: catalog.projects.map((project) => ({ ...project })),
    profiles: catalog.profiles.map((profile) => ({ ...profile, skills: profile.skills.map(copySource) })),
    bindings: catalog.bindings.map(copyBinding),
  };
}

function sortCatalog(catalog: StoredCatalog) {
  catalog.projects.sort((left, right) => left.name.localeCompare(right.name) || left.rootPath.localeCompare(right.rootPath));
  catalog.profiles.sort((left, right) => left.agent.localeCompare(right.agent) || left.name.localeCompare(right.name));
  catalog.bindings.sort((left, right) => left.projectId.localeCompare(right.projectId) || left.agent.localeCompare(right.agent));
  return catalog;
}

function saveCatalog(path: string, catalog: StoredCatalog) {
  return atomicWrite(path, `${JSON.stringify(sortCatalog(catalog), null, 2)}\n`);
}

function projectById(catalog: StoredCatalog, projectId: string) {
  const project = catalog.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("Skill project was not found");
  return project;
}

function bindingByKey(catalog: StoredCatalog, projectId: string, agent: AgentKind) {
  return catalog.bindings.find((binding) => binding.projectId === projectId && binding.agent === agent);
}

function setBinding(catalog: StoredCatalog, binding: ProjectSkillBinding) {
  const index = catalog.bindings.findIndex(
    (item) => item.projectId === binding.projectId && item.agent === binding.agent,
  );
  if (index >= 0) catalog.bindings[index] = binding;
  else catalog.bindings.push(binding);
}

function pendingStatus(previous?: SkillBindingSyncStatus): SkillBindingSyncStatus {
  return { state: "pending", syncedAt: previous?.syncedAt ?? null, message: null };
}

function sameSkills(left: SkillSourceRef[], right: SkillSourceRef[]) {
  if (left.length !== right.length) return false;
  return left.every((source, index) => {
    const other = right[index];
    return source.sourceId === other.sourceId
      && source.name === other.name
      && source.directoryName === other.directoryName
      && source.sourcePath === other.sourcePath
      && source.manifestPath === other.manifestPath
      && source.contentHash === other.contentHash
      && source.scope === other.scope;
  });
}

async function normalizeSource(input: SkillSourceInput): Promise<SkillSourceRef> {
  const name = input.name.trim();
  if (!name) throw new Error("Skill source name is required");
  if (!scopes.has(input.scope)) throw new Error(`unsupported Skill source scope ${String(input.scope)}`);
  const contentHash = parseContentHash(input.contentHash, "Skill source contentHash");
  const requestedPath = input.sourcePath.trim();
  if (!requestedPath) throw new Error("Skill source path is required");
  const sourcePath = await realpath(resolve(requestedPath));
  if (!(await stat(sourcePath)).isDirectory()) throw new Error(`Skill source is not a directory: ${sourcePath}`);
  const directoryName = safeDirectoryName(basename(sourcePath), "Skill source directoryName");
  const manifestPath = join(sourcePath, "SKILL.md");
  if (!(await stat(manifestPath)).isFile()) throw new Error(`Skill manifest was not found: ${manifestPath}`);
  await readFile(manifestPath);
  return {
    sourceId: sha256(sourcePath),
    name,
    directoryName,
    sourcePath,
    manifestPath,
    contentHash,
    scope: input.scope,
  };
}

async function normalizeSources(inputs: SkillSourceInput[]) {
  const normalized = await Promise.all(inputs.map(normalizeSource));
  const bySource = new Map<string, SkillSourceRef>();
  for (const source of normalized) {
    const previous = bySource.get(source.sourceId);
    if (!previous || scopePriority[source.scope] < scopePriority[previous.scope]) {
      bySource.set(source.sourceId, source);
    }
  }
  const sources = [...bySource.values()].sort(
    (left, right) => left.directoryName.localeCompare(right.directoryName) || left.sourceId.localeCompare(right.sourceId),
  );
  const targetNames = new Set<string>();
  for (const source of sources) {
    const key = source.directoryName.normalize("NFC").toLowerCase();
    if (targetNames.has(key)) throw new Error(`Multiple Skills use the target directory ${source.directoryName}`);
    targetNames.add(key);
  }
  return sources;
}

async function pathMetadata(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function managedLinkMatches(path: string, sourcePath: string) {
  const metadata = await pathMetadata(path);
  if (!metadata?.isSymbolicLink()) return false;
  const target = await readlink(path);
  return resolve(dirname(path), target) === resolve(sourcePath);
}

async function assertSafeProjectTarget(project: SkillProject, targetRoot: string) {
  const canonicalProject = await realpath(project.rootPath).catch(() => {
    throw new Error(`Project root is unavailable: ${project.rootPath}`);
  });
  if (canonicalProject !== project.rootPath || sha256(canonicalProject) !== project.id) {
    throw new Error(`Project root identity changed: ${project.rootPath}`);
  }
  let candidate = targetRoot;
  while (candidate !== project.rootPath) {
    const metadata = await pathMetadata(candidate);
    if (metadata) {
      if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        throw new Error(`Project Skill target must be a real directory: ${candidate}`);
      }
      if (await realpath(candidate) !== resolve(candidate)) {
        throw new Error(`Project Skill target escapes the project root: ${candidate}`);
      }
      return;
    }
    const parent = dirname(candidate);
    if (parent === candidate) break;
    candidate = parent;
  }
}

function assertDeploymentPath(entry: SkillDeploymentEntry, targetRoot: string) {
  if (resolve(dirname(entry.destinationPath)) !== resolve(targetRoot)) {
    throw new Error(`Refusing to manage a Skill outside the project target: ${entry.destinationPath}`);
  }
}

async function desiredDeployments(binding: ProjectSkillBinding, targetRoot: string) {
  const desired: DesiredDeployment[] = [];
  const driftedSources: SkillSourceDrift[] = [];
  for (const skill of binding.skills) {
    const canonicalPath = await realpath(skill.sourcePath).catch(() => {
      throw new Error(`Skill source is unavailable: ${skill.name}`);
    });
    if (sha256(canonicalPath) !== skill.sourceId) {
      throw new Error(`Skill source identity changed: ${skill.name}`);
    }
    const manifestPath = join(canonicalPath, "SKILL.md");
    const actualContentHash = sha256(await readFile(manifestPath));
    if (actualContentHash !== skill.contentHash) {
      driftedSources.push({
        sourceId: skill.sourceId,
        name: skill.name,
        expectedContentHash: skill.contentHash,
        actualContentHash,
      });
    }
    const destinationPath = join(targetRoot, skill.directoryName);
    if (resolve(dirname(destinationPath)) !== resolve(targetRoot)) {
      throw new Error(`Invalid Skill target directory: ${skill.directoryName}`);
    }
    desired.push({
      skill,
      entry: {
        sourceId: skill.sourceId,
        sourcePath: canonicalPath,
        destinationPath,
        contentHash: actualContentHash,
      },
    });
  }
  return { desired, driftedSources };
}

async function buildDeploymentPlan(
  desired: DesiredDeployment[],
  previous: SkillDeploymentEntry[],
  targetRoot: string,
): Promise<DeploymentPlan> {
  const additions: DesiredDeployment[] = [];
  const replacements: DeploymentPlan["replacements"] = [];
  const removals: SkillDeploymentEntry[] = [];
  const missingRemovals: SkillDeploymentEntry[] = [];
  const unchanged: DesiredDeployment[] = [];
  const conflicts: SkillSyncConflict[] = [];
  const desiredByPath = new Map(desired.map((item) => [item.entry.destinationPath, item]));
  const previousByPath = new Map<string, SkillDeploymentEntry>();
  for (const entry of previous) {
    assertDeploymentPath(entry, targetRoot);
    if (previousByPath.has(entry.destinationPath)) {
      throw new Error(`Duplicate managed Skill target: ${entry.destinationPath}`);
    }
    previousByPath.set(entry.destinationPath, entry);
  }

  for (const item of desired) {
    const path = item.entry.destinationPath;
    const previousEntry = previousByPath.get(path);
    const metadata = await pathMetadata(path);
    if (!metadata) {
      additions.push(item);
      continue;
    }
    if (!previousEntry) {
      conflicts.push({
        directoryName: item.skill.directoryName,
        destinationPath: path,
        reason: "unmanaged-target",
      });
      continue;
    }
    if (!(await managedLinkMatches(path, previousEntry.sourcePath))) {
      conflicts.push({
        directoryName: item.skill.directoryName,
        destinationPath: path,
        reason: "managed-target-changed",
      });
      continue;
    }
    if (resolve(previousEntry.sourcePath) === resolve(item.entry.sourcePath)) unchanged.push(item);
    else replacements.push({ desired: item, previous: previousEntry });
  }

  for (const entry of previous) {
    if (desiredByPath.has(entry.destinationPath)) continue;
    const metadata = await pathMetadata(entry.destinationPath);
    if (!metadata) {
      missingRemovals.push(entry);
    } else if (await managedLinkMatches(entry.destinationPath, entry.sourcePath)) {
      removals.push(entry);
    } else {
      conflicts.push({
        directoryName: basename(entry.destinationPath),
        destinationPath: entry.destinationPath,
        reason: "managed-target-changed",
      });
    }
  }
  return { additions, replacements, removals, missingRemovals, unchanged, conflicts };
}

async function createTemporaryLink(sourcePath: string, temporaryPath: string) {
  await symlink(sourcePath, temporaryPath, process.platform === "win32" ? "junction" : "dir");
}

async function rollbackDeployment(
  installed: Array<{ destinationPath: string; sourcePath: string }>,
  backups: Array<{ destinationPath: string; backupPath: string }>,
  temporaryPaths: string[],
) {
  const errors: string[] = [];
  for (const item of installed.toReversed()) {
    try {
      if (await managedLinkMatches(item.destinationPath, item.sourcePath)) {
        await rm(item.destinationPath, { force: true });
      } else if (await pathMetadata(item.destinationPath)) {
        throw new Error(`target changed during rollback: ${item.destinationPath}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  for (const item of backups.toReversed()) {
    try {
      if (await pathMetadata(item.destinationPath)) {
        throw new Error(`target occupied during rollback: ${item.destinationPath}`);
      }
      await rename(item.backupPath, item.destinationPath);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  await Promise.all(temporaryPaths.map((path) => rm(path, { force: true }).catch(() => undefined)));
  if (errors.length) throw new Error(errors.join("; "));
}

export function createSkillProfileService(paths: SkillProfileServicePaths) {
  const catalogPath = resolve(paths.catalogPath);
  let queue = Promise.resolve<unknown>(undefined);
  const serialized = <T>(operation: () => Promise<T>) => {
    const result = queue.then(operation, operation);
    queue = result.catch(() => undefined);
    return result;
  };

  const load = () => serialized(async () => workspace(await loadCatalog(catalogPath), catalogPath));

  const registerProject = (rootPath: string) => serialized(async () => {
    const requestedPath = rootPath.trim();
    if (!requestedPath) throw new Error("Project root is required");
    const canonicalPath = await realpath(resolve(requestedPath));
    if (!(await stat(canonicalPath)).isDirectory()) throw new Error("Project root must be a directory");
    const catalog = await loadCatalog(catalogPath);
    const id = sha256(canonicalPath);
    const now = isoNow();
    const existing = catalog.projects.find((project) => project.id === id);
    if (existing) {
      existing.name = basename(canonicalPath) || canonicalPath;
      existing.rootPath = canonicalPath;
      existing.updatedAt = now;
    } else {
      catalog.projects.push({
        id,
        name: basename(canonicalPath) || canonicalPath,
        rootPath: canonicalPath,
        createdAt: now,
        updatedAt: now,
      });
    }
    await saveCatalog(catalogPath, catalog);
    return workspace(catalog, catalogPath);
  });

  const saveSelection = (input: SaveProjectSkillSelectionInput) => serialized(async () => {
    const catalog = await loadCatalog(catalogPath);
    projectById(catalog, input.projectId);
    if (!agents.has(input.agent)) throw new Error("unsupported Skill selection Agent");
    const skills = await normalizeSources(input.skills);
    const previous = bindingByKey(catalog, input.projectId, input.agent);
    const changed = !previous || !sameSkills(previous.skills, skills);
    const now = isoNow();
    setBinding(catalog, {
      projectId: input.projectId,
      agent: input.agent,
      profileId: null,
      skills,
      deployments: previous?.deployments.map((entry) => ({ ...entry })) ?? [],
      syncStatus: changed ? pendingStatus(previous?.syncStatus) : { ...previous.syncStatus },
      updatedAt: now,
    });
    await saveCatalog(catalogPath, catalog);
    return workspace(catalog, catalogPath);
  });

  const saveProfile = (input: SaveSkillProfileInput) => serialized(async () => {
    const catalog = await loadCatalog(catalogPath);
    projectById(catalog, input.projectId);
    if (!agents.has(input.agent)) throw new Error("unsupported Skill profile Agent");
    const binding = bindingByKey(catalog, input.projectId, input.agent);
    if (!binding) throw new Error("Save a project Skill selection before creating a profile");
    const name = input.name.trim();
    if (!name) throw new Error("Skill profile name is required");
    const existing = input.id
      ? catalog.profiles.find((profile) => profile.id === input.id)
      : undefined;
    if (input.id && !existing) throw new Error("Skill profile was not found");
    if (existing && existing.agent !== input.agent) throw new Error("Skill profile Agent cannot be changed");
    if (catalog.profiles.some((profile) =>
      profile.id !== existing?.id && profile.agent === input.agent && profile.name === name)) {
      throw new Error("A Skill profile with this name already exists for the Agent");
    }
    const now = isoNow();
    const id = existing?.id ?? randomUUID();
    const profile: SkillProfile = {
      id,
      name,
      agent: input.agent,
      skills: binding.skills.map(copySource),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing) catalog.profiles[catalog.profiles.indexOf(existing)] = profile;
    else catalog.profiles.push(profile);
    binding.profileId = id;
    binding.updatedAt = now;
    await saveCatalog(catalogPath, catalog);
    return workspace(catalog, catalogPath);
  });

  const deleteProfile = (profileId: string) => serialized(async () => {
    const catalog = await loadCatalog(catalogPath);
    const profile = catalog.profiles.find((item) => item.id === profileId);
    if (!profile) throw new Error("Skill profile was not found");
    catalog.profiles = catalog.profiles.filter((item) => item.id !== profileId);
    const now = isoNow();
    for (const binding of catalog.bindings) {
      if (binding.profileId !== profileId) continue;
      binding.profileId = null;
      binding.updatedAt = now;
    }
    await saveCatalog(catalogPath, catalog);
    return workspace(catalog, catalogPath);
  });

  const applyProfile = (input: ApplySkillProfileInput) => serialized(async () => {
    const catalog = await loadCatalog(catalogPath);
    projectById(catalog, input.projectId);
    const profile = catalog.profiles.find((item) => item.id === input.profileId);
    if (!profile) throw new Error("Skill profile was not found");
    const previous = bindingByKey(catalog, input.projectId, profile.agent);
    const skills = profile.skills.map(copySource);
    const changed = !previous || !sameSkills(previous.skills, skills);
    const now = isoNow();
    setBinding(catalog, {
      projectId: input.projectId,
      agent: profile.agent,
      profileId: profile.id,
      skills,
      deployments: previous?.deployments.map((entry) => ({ ...entry })) ?? [],
      syncStatus: changed ? pendingStatus(previous?.syncStatus) : { ...previous.syncStatus },
      updatedAt: now,
    });
    await saveCatalog(catalogPath, catalog);
    return workspace(catalog, catalogPath);
  });

  const sync = (input: SyncProjectSkillsInput) => serialized(async (): Promise<SkillSyncResult> => {
    const catalog = await loadCatalog(catalogPath);
    if (!agents.has(input.agent)) throw new Error("unsupported Skill sync Agent");
    const project = projectById(catalog, input.projectId);
    const binding = bindingByKey(catalog, input.projectId, input.agent);
    if (!binding) throw new Error("Project Skill selection was not found");
    const targetRoot = join(project.rootPath, targetDirectories[input.agent]);
    let desired: DesiredDeployment[] = [];
    let driftedSources: SkillSourceDrift[] = [];
    let plan: DeploymentPlan | null = null;

    const failed = async (error: unknown): Promise<SkillSyncResult> => {
      const message = error instanceof Error ? error.message : String(error);
      binding.syncStatus = { state: "failed", syncedAt: binding.syncStatus.syncedAt, message };
      binding.updatedAt = isoNow();
      let saveError: string | null = null;
      try {
        await saveCatalog(catalogPath, catalog);
      } catch (catalogError) {
        saveError = catalogError instanceof Error ? catalogError.message : String(catalogError);
      }
      const combined = saveError ? `${message}; failed to persist sync status: ${saveError}` : message;
      return {
        status: "failed",
        workspace: workspace(catalog, catalogPath),
        created: [],
        removed: [],
        unchanged: plan?.unchanged.map((item) => item.entry.destinationPath) ?? [],
        driftedSources,
        conflicts: [],
        error: combined,
      };
    };

    try {
      await assertSafeProjectTarget(project, targetRoot);
      ({ desired, driftedSources } = await desiredDeployments(binding, targetRoot));
      plan = await buildDeploymentPlan(desired, binding.deployments, targetRoot);
    } catch (error) {
      return failed(error);
    }

    if (plan.conflicts.length) {
      const message = `${plan.conflicts.length} Skill target conflict${plan.conflicts.length === 1 ? "" : "s"}`;
      binding.syncStatus = { state: "conflict", syncedAt: binding.syncStatus.syncedAt, message };
      binding.updatedAt = isoNow();
      await saveCatalog(catalogPath, catalog);
      return {
        status: "conflict",
        workspace: workspace(catalog, catalogPath),
        created: [],
        removed: [],
        unchanged: plan.unchanged.map((item) => item.entry.destinationPath),
        driftedSources,
        conflicts: plan.conflicts,
        error: null,
      };
    }

    const transactionId = randomUUID();
    const installs = [
      ...plan.additions,
      ...plan.replacements.map((item) => item.desired),
    ];
    const retired = [
      ...plan.removals,
      ...plan.replacements.map((item) => item.previous),
    ];
    const temporaryLinks: Array<{ temporaryPath: string; desired: DesiredDeployment }> = [];
    const backups: Array<{ destinationPath: string; backupPath: string }> = [];
    const installed: Array<{ destinationPath: string; sourcePath: string }> = [];
    const previousDeployments = binding.deployments.map((entry) => ({ ...entry }));

    try {
      if (installs.length || retired.length) await mkdir(targetRoot, { recursive: true });
      for (const item of installs) {
        const temporaryPath = join(targetRoot, `.${item.skill.directoryName}.${transactionId}.tmp`);
        await createTemporaryLink(item.entry.sourcePath, temporaryPath);
        temporaryLinks.push({ temporaryPath, desired: item });
      }
      for (const entry of retired) {
        const backupPath = join(targetRoot, `.${basename(entry.destinationPath)}.${transactionId}.bak`);
        await rename(entry.destinationPath, backupPath);
        backups.push({ destinationPath: entry.destinationPath, backupPath });
      }
      for (const item of temporaryLinks) {
        await rename(item.temporaryPath, item.desired.entry.destinationPath);
        installed.push({
          destinationPath: item.desired.entry.destinationPath,
          sourcePath: item.desired.entry.sourcePath,
        });
      }

      const now = isoNow();
      binding.deployments = desired.map((item) => ({ ...item.entry }));
      binding.syncStatus = {
        state: driftedSources.length ? "drifted" : "synced",
        syncedAt: now,
        message: driftedSources.length ? `${driftedSources.length} Skill source${driftedSources.length === 1 ? " has" : "s have"} changed` : null,
      };
      binding.updatedAt = now;
      await saveCatalog(catalogPath, catalog);
      await Promise.all(backups.map((item) => rm(item.backupPath, { force: true }).catch(() => undefined)));
    } catch (error) {
      let rollbackError: string | null = null;
      try {
        await rollbackDeployment(installed, backups, temporaryLinks.map((item) => item.temporaryPath));
      } catch (rollbackFailure) {
        rollbackError = rollbackFailure instanceof Error ? rollbackFailure.message : String(rollbackFailure);
      }
      binding.deployments = previousDeployments;
      const message = error instanceof Error ? error.message : String(error);
      return failed(rollbackError ? `${message}; rollback failed: ${rollbackError}` : message);
    }

    const created = installs.map((item) => item.entry.destinationPath);
    const removed = [
      ...retired.map((entry) => entry.destinationPath),
      ...plan.missingRemovals.map((entry) => entry.destinationPath),
    ];
    return {
      status: created.length || removed.length ? "synced" : "unchanged",
      workspace: workspace(catalog, catalogPath),
      created,
      removed,
      unchanged: plan.unchanged.map((item) => item.entry.destinationPath),
      driftedSources,
      conflicts: [],
      error: null,
    };
  });

  return { load, registerProject, saveSelection, saveProfile, deleteProfile, applyProfile, sync };
}
