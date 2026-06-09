export type MemoryTopic =
  | "profile"
  | "projects"
  | "rules"
  | "tools"
  | "writing"
  | "activityLog"
  | "audit"
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
  relatedTopics: MemoryTopic[];
  title: string;
  summary: string;
  searchText: string;
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

export type CodexAuditMode = "curated" | "full";

export type ClaimScope = "global" | "project" | "tool" | "writing" | "rule" | "unknown";

export type ClaimStatus = "current" | "stale" | "historical" | "uncertain";

export interface EvidenceRef {
  sourcePath: string;
  startLine: number;
  endLine: number;
  summary: string;
}

export interface MemoryClaim {
  id: string;
  subject: string;
  field: string;
  value: string;
  scope: ClaimScope;
  status: ClaimStatus;
  confidence: number;
  rationale: string;
  evidence: EvidenceRef[];
}

export interface MemoryConflict {
  id: string;
  title: string;
  detail: string;
  confidence: number;
  claimIds: string[];
  evidence: EvidenceRef[];
}

export interface SuggestedCorrection {
  id: string;
  title: string;
  reason: string;
  content: string;
  confidence: number;
  affectedClaimIds: string[];
  evidence: EvidenceRef[];
}

export interface CodexAuditMetadata {
  memoryRoot: string;
  inputEntries: number;
  model: string;
}

export interface CodexAuditReport {
  schemaVersion: "1";
  mode: CodexAuditMode;
  generatedAt: string;
  summary: string;
  currentClaims: MemoryClaim[];
  staleClaims: MemoryClaim[];
  conflicts: MemoryConflict[];
  uncertainClaims: MemoryClaim[];
  suggestedCorrections: SuggestedCorrection[];
  metadata: CodexAuditMetadata;
}

export interface CodexAuditRun {
  report: CodexAuditReport;
  cachePath: string;
}
