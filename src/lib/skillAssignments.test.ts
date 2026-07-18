import { describe, expect, it } from "vitest";
import {
  countSkillAssignmentBuckets,
  isCapabilityGloballyInherited,
  isCapabilityProjectLocal,
  isCapabilitySelected,
  selectRepresentativeSkillSource,
  toggleSelectedSourcePath,
  type ProjectSkillBindingLike,
  type SkillSourceRefLike,
} from "./skillAssignments";

function source(
  sourceId: string,
  sourcePath: string,
  scope: SkillSourceRefLike["scope"] = "global",
): SkillSourceRefLike {
  const segments = sourcePath.replace(/\\/g, "/").split("/").filter(Boolean);
  const directoryName = segments[segments.length - 1] ?? sourceId;
  return {
    sourceId,
    name: directoryName,
    sourcePath,
    manifestPath: `${sourcePath}/SKILL.md`,
    directoryName,
    contentHash: `${sourceId}-hash`,
    scope,
  };
}

function binding(
  skills: readonly SkillSourceRefLike[] = [],
): ProjectSkillBindingLike {
  return { skills };
}

describe("selectRepresentativeSkillSource", () => {
  it("prefers library, then global, then project sources", () => {
    const project = source("project", "/work/demo/.codex/skills/diagnose", "project");
    const global = source("global", "/Users/demo/.agents/skills/diagnose", "global");
    const library = source("library", "/Users/demo/.agent-backplane/skills/diagnose", "library");

    expect(selectRepresentativeSkillSource([project, global, library])).toBe(library);
    expect(selectRepresentativeSkillSource([project, global])).toBe(global);
    expect(selectRepresentativeSkillSource([project])).toBe(project);
    expect(selectRepresentativeSkillSource([])).toBeUndefined();
  });

  it("uses explicit scope and sorts ties deterministically", () => {
    const later = source("later", "/z/skill", "library");
    const earlier = source("earlier", "/a/skill", "library");
    const inferredGlobal = source("global", "/Users/demo/.agents/skills/skill");

    expect(selectRepresentativeSkillSource([later, inferredGlobal, earlier])).toBe(earlier);
  });
});

describe("capability assignment state", () => {
  it("recognizes an explicit selection by source id or normalized path", () => {
    const library = source("diagnose", "/Users/demo/.agent-backplane/skills/diagnose", "library");
    const moved = source("diagnose", "/Users/demo/new-library/diagnose");
    const samePath = source("other-id", "\\Users\\demo\\.agent-backplane\\skills\\diagnose\\");

    expect(isCapabilitySelected([moved], binding([library]))).toBe(true);
    expect(isCapabilitySelected([samePath], binding([library]))).toBe(true);
    expect(isCapabilitySelected([source("other", "/tmp/other")], binding([library]))).toBe(false);
  });

  it("distinguishes global inheritance from project-local copies", () => {
    const global = source("global", "/Users/demo/.agents/skills/diagnose", "global");
    const library = source("library", "/Users/demo/.agent-backplane/skills/diagnose", "library");
    const project = source("project", "/work/demo/.codex/skills/diagnose", "project");

    expect(isCapabilityGloballyInherited([global])).toBe(true);
    expect(isCapabilityGloballyInherited([library, project])).toBe(false);
    expect(isCapabilityProjectLocal([project])).toBe(true);
  });

  it("does not label a Backplane deployment as a project-owned copy", () => {
    const project = source("project-copy", "/work/demo/.codex/skills/diagnose", "project");
    const deployment = {
      sourceId: "library-source",
      sourcePath: "/Users/demo/.agent-backplane/skills/diagnose",
      destinationPath: "/work/demo/.codex/skills/diagnose/",
      contentHash: "diagnose-hash",
    };

    expect(isCapabilityProjectLocal([project], [deployment])).toBe(false);
  });
});

describe("selection changes", () => {
  it("adds and removes a source path without mutating the original array", () => {
    const original = ["/library/diagnose"];
    const added = toggleSelectedSourcePath(original, "/library/tdd");
    const removed = toggleSelectedSourcePath(added, "/library/diagnose/");

    expect(original).toEqual(["/library/diagnose"]);
    expect(added).toEqual(["/library/diagnose", "/library/tdd"]);
    expect(removed).toEqual(["/library/tdd"]);
  });

  it("deduplicates equivalent paths and ignores an empty request", () => {
    const paths = ["/library/diagnose", "/library/diagnose/"];

    expect(toggleSelectedSourcePath(paths, "/library/tdd")).toEqual([
      "/library/diagnose",
      "/library/tdd",
    ]);
    expect(toggleSelectedSourcePath(paths, "   ")).toEqual(["/library/diagnose"]);
  });
});

describe("countSkillAssignmentBuckets", () => {
  it("counts selected, inherited, and project-owned capabilities as enabled", () => {
    const selected = source("selected", "/Users/demo/.agent-backplane/skills/selected", "library");
    const inherited = source("inherited", "/Users/demo/.agents/skills/inherited", "global");
    const local = source("local", "/work/demo/.codex/skills/local", "project");
    const available = source("available", "/Users/demo/.agent-backplane/skills/available", "library");

    expect(countSkillAssignmentBuckets(
      [[selected], [inherited], [local], [available]],
      binding([selected]),
    )).toEqual({ enabled: 3, available: 1 });
  });
});
