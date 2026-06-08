import { invoke } from "@tauri-apps/api/core";
import type { CorrectionDraft, ScanResult } from "./types";

export function scanMemories(rootOverride: string | null = null) {
  return invoke<ScanResult>("scan_memories", { rootOverride });
}

export function getSourceExcerpt(
  rootOverride: string | null,
  path: string,
  startLine: number,
  endLine: number,
) {
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
  return invoke<CorrectionDraft>("draft_correction", {
    rootOverride,
    slug,
    bulletLines,
  });
}

export function writeCorrection(rootOverride: string | null, draft: CorrectionDraft) {
  return invoke<string>("write_correction", { rootOverride, draft });
}
