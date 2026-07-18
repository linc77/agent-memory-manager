export interface SkillSourceRefLike {
  sourceId: string;
  name: string;
  sourcePath: string;
  manifestPath: string;
  directoryName: string;
  contentHash: string;
  scope: "library" | "global" | "project";
}

export interface SkillDeploymentEntryLike {
  sourceId: string;
  sourcePath: string;
  destinationPath: string;
  contentHash: string;
}

export interface ProjectSkillBindingLike {
  skills: readonly SkillSourceRefLike[];
  deployments?: readonly SkillDeploymentEntryLike[];
}

export interface SkillAssignmentBuckets {
  enabled: number;
  available: number;
}

function normalizePath(path: string) {
  const normalized = path.trim().replace(/\\/g, "/");
  if (normalized === "/") return normalized;
  return normalized.replace(/\/+$/, "");
}

function deploymentOwnsProjectSource(
  source: SkillSourceRefLike,
  deployments: readonly SkillDeploymentEntryLike[],
) {
  const path = normalizePath(source.sourcePath);
  return deployments.some((deployment) =>
    normalizePath(deployment.destinationPath) === path);
}

export function selectRepresentativeSkillSource<T extends SkillSourceRefLike>(
  sources: readonly T[],
): T | undefined {
  const priority: Record<SkillSourceRefLike["scope"], number> = {
    library: 0,
    global: 1,
    project: 2,
  };
  return [...sources].sort((left, right) => {
    const tierDifference = priority[left.scope] - priority[right.scope];
    if (tierDifference) return tierDifference;
    return normalizePath(left.sourcePath).localeCompare(normalizePath(right.sourcePath))
      || left.sourceId.localeCompare(right.sourceId);
  })[0];
}

export function isCapabilitySelected(
  sources: readonly SkillSourceRefLike[],
  binding: ProjectSkillBindingLike,
) {
  const selectedIds = new Set(binding.skills.map((source) => source.sourceId));
  const selectedPaths = new Set(binding.skills.map((source) => normalizePath(source.sourcePath)));
  return sources.some((source) =>
    selectedIds.has(source.sourceId) || selectedPaths.has(normalizePath(source.sourcePath)));
}

export function isCapabilityGloballyInherited(
  sources: readonly SkillSourceRefLike[],
) {
  return sources.some((source) => source.scope === "global");
}

export function isCapabilityProjectLocal(
  sources: readonly SkillSourceRefLike[],
  deployments: readonly SkillDeploymentEntryLike[] = [],
) {
  return sources.some((source) =>
    source.scope === "project"
    && !deploymentOwnsProjectSource(source, deployments));
}

export function toggleSelectedSourcePath(
  sourcePaths: readonly string[],
  sourcePath: string,
) {
  const uniquePaths = sourcePaths.filter((path, index) =>
    sourcePaths.findIndex((candidate) => normalizePath(candidate) === normalizePath(path)) === index);
  const requested = normalizePath(sourcePath);
  if (!requested) return uniquePaths;
  if (uniquePaths.some((path) => normalizePath(path) === requested)) {
    return uniquePaths.filter((path) => normalizePath(path) !== requested);
  }
  return [...uniquePaths, sourcePath];
}

export function countSkillAssignmentBuckets(
  capabilities: readonly (readonly SkillSourceRefLike[])[],
  binding: ProjectSkillBindingLike,
  deployments: readonly SkillDeploymentEntryLike[] = binding.deployments ?? [],
): SkillAssignmentBuckets {
  let enabled = 0;
  for (const sources of capabilities) {
    if (
      isCapabilitySelected(sources, binding)
      || isCapabilityGloballyInherited(sources)
      || isCapabilityProjectLocal(sources, deployments)
    ) {
      enabled += 1;
    }
  }
  return { enabled, available: capabilities.length - enabled };
}
