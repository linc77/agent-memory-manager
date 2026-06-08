export type MemoryTopic =
  | "profile"
  | "projects"
  | "rules"
  | "tools"
  | "writing"
  | "overrides"
  | "sources"
  | "staleRisks";

export type MemorySourceKind =
  | "summary"
  | "registry"
  | "raw"
  | "rolloutSummary"
  | "adHocNote"
  | "chronicle"
  | "skill";

export interface MemorySource {
  id: string;
  path: string;
  relativePath: string;
  kind: MemorySourceKind;
  modifiedMs: number;
  bytes: number;
  lines: number;
  sha256: string;
}

export interface MemoryEntry {
  id: string;
  topic: MemoryTopic;
  title: string;
  summary: string;
  sourcePath: string;
  startLine: number;
  endLine: number;
}

export type RiskKind = "staleConflict" | "coveredByOverride";

export interface RiskFlag {
  id: string;
  kind: RiskKind;
  title: string;
  detail: string;
  entryId: string;
}

export interface CorrectionDraft {
  slug: string;
  content: string;
  targetPath: string;
}

export interface ScanResult {
  root: string;
  sources: MemorySource[];
  entries: MemoryEntry[];
  risks: RiskFlag[];
}
