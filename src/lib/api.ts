import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { CodexAuditMode, CodexAuditRun, CorrectionDraft, ScanResult } from "./types";
import { demoAuditRun, demoScanResult } from "./demoData";

export function scanMemories(rootOverride: string | null = null) {
  if (isFixtureMode()) {
    return Promise.resolve(withFixtureRoot(rootOverride));
  }

  return invoke<ScanResult>("scan_memories", { rootOverride });
}

export function getSourceExcerpt(
  rootOverride: string | null,
  path: string,
  startLine: number,
  endLine: number,
) {
  if (isFixtureMode()) {
    const source = withFixtureRoot(rootOverride).sources.find((item) => item.path === path);
    return Promise.resolve(
      source
        ? `${source.relativePath} lines ${startLine}-${endLine}\n\nFixture source excerpt for browser verification.`
        : `Fixture source not found: ${path}`,
    );
  }

  return invoke<string>("get_source_excerpt", {
    rootOverride,
    path,
    startLine,
    endLine,
  });
}

export function draftCorrection(
  rootOverride: string | null,
  slug: string,
  bulletLines: string[],
) {
  if (isFixtureMode()) {
    const content = `Memory update request:\n\n${bulletLines
      .filter((line) => line.trim())
      .map((line) => `- ${line.trim()}`)
      .join("\n")}\n`;
    return Promise.resolve(buildFixtureDraft(rootOverride, slug, content));
  }

  return invoke<CorrectionDraft>("draft_correction", {
    rootOverride,
    slug,
    bulletLines,
  });
}

export function draftCorrectionFromContent(
  rootOverride: string | null,
  slug: string,
  content: string,
) {
  if (isFixtureMode()) {
    const normalized = content.trim().toLowerCase().startsWith("memory update request:")
      ? `${content.trim()}\n`
      : `Memory update request:\n\n${content.trim()}\n`;
    return Promise.resolve(buildFixtureDraft(rootOverride, slug, normalized));
  }

  return invoke<CorrectionDraft>("draft_correction_from_content", {
    rootOverride,
    slug,
    content,
  });
}

export function writeCorrection(rootOverride: string | null, draft: CorrectionDraft) {
  if (isFixtureMode()) {
    return Promise.resolve(draft.targetPath);
  }

  return invoke<string>("write_correction", { rootOverride, draft });
}

export function runCodexAudit(rootOverride: string | null, mode: CodexAuditMode) {
  if (isFixtureMode()) {
    const root = fixtureRoot(rootOverride);
    return Promise.resolve({
      ...demoAuditRun,
      cachePath: `${root}/.amm/codex-runs/demo-${mode}.json`,
      report: {
        ...demoAuditRun.report,
        mode,
        metadata: {
          ...demoAuditRun.report.metadata,
          memoryRoot: root,
        },
      },
    } satisfies CodexAuditRun);
  }

  return invoke<CodexAuditRun>("run_codex_audit", { rootOverride, mode });
}

export function openSourceFile(path: string) {
  if (isFixtureMode()) {
    void path;
    return Promise.resolve();
  }

  return revealItemInDir(path);
}

export function isFixtureMode() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("fixture") === "1"
  );
}

function fixtureRoot(rootOverride: string | null) {
  return rootOverride?.trim() || demoScanResult.root;
}

function withFixtureRoot(rootOverride: string | null): ScanResult {
  const root = fixtureRoot(rootOverride);
  return {
    ...demoScanResult,
    root,
    sources: demoScanResult.sources.map((source) => ({
      ...source,
      path: `${root}/${source.relativePath}`,
    })),
  };
}

function buildFixtureDraft(
  rootOverride: string | null,
  slug: string,
  content: string,
): CorrectionDraft {
  const safeSlug =
    slug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "memory-update";
  return {
    slug: safeSlug,
    content,
    targetPath: `${fixtureRoot(rootOverride)}/extensions/ad_hoc/notes/demo-${safeSlug}.md`,
  };
}
