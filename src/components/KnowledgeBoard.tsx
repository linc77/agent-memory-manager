import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSearch,
  PencilLine,
  RefreshCw,
  Search,
} from "lucide-react";
import type {
  CodexAuditMode,
  CodexAuditRun,
  EvidenceRef,
  MemoryClaim,
  MemoryConflict,
  MemoryEntry,
  MemorySource,
  MemoryTopic,
  ScanResult,
  SuggestedCorrection,
} from "../lib/types";

const topicTitles: Record<MemoryTopic, string> = {
  profile: "Current Profile",
  projects: "Projects",
  rules: "Rules",
  tools: "Tools",
  writing: "Writing",
  activityLog: "Activity Log",
  audit: "Codex Audit",
  overrides: "Corrections",
  sources: "Sources",
  staleRisks: "Conflicts",
};

const topicLabels: Record<MemoryTopic, string> = {
  profile: "Profile",
  projects: "Projects",
  rules: "Rules",
  tools: "Tools",
  writing: "Writing",
  activityLog: "Activity",
  audit: "Audit",
  overrides: "Corrections",
  sources: "Sources",
  staleRisks: "Conflicts",
};

function findSource(sources: MemorySource[], entry: MemoryEntry) {
  return sources.find((source) => source.relativePath === entry.sourcePath);
}

function evidenceLabel(evidence: EvidenceRef) {
  return `${evidence.sourcePath} L${evidence.startLine}-${evidence.endLine}`;
}

function renderEvidenceRefs(
  evidenceItems: EvidenceRef[],
  sources: MemorySource[],
  onOpenSource: (path: string) => void,
) {
  return evidenceItems.map((evidence) => {
    const label = evidenceLabel(evidence);
    const source = sources.find((item) => item.relativePath === evidence.sourcePath);
    return source ? (
      <button
        className="evidence-link"
        key={`${evidence.sourcePath}:${evidence.startLine}-${evidence.endLine}`}
        onClick={() => onOpenSource(source.path)}
        type="button"
      >
        {label}
      </button>
    ) : (
      <span key={`${evidence.sourcePath}:${evidence.startLine}-${evidence.endLine}`}>{label}</span>
    );
  });
}

function renderClaim(
  claim: MemoryClaim,
  sources: MemorySource[],
  onOpenSource: (path: string) => void,
) {
  return (
    <article className="audit-card" key={claim.id}>
      <div className="audit-card-header">
        <strong>{claim.field}</strong>
        <span>{Math.round(claim.confidence * 100)}%</span>
      </div>
      <p>{claim.value}</p>
      <p className="audit-rationale">{claim.rationale}</p>
      <footer>{renderEvidenceRefs(claim.evidence, sources, onOpenSource)}</footer>
    </article>
  );
}

function renderConflict(
  conflict: MemoryConflict,
  sources: MemorySource[],
  onOpenSource: (path: string) => void,
) {
  return (
    <article className="audit-card warning" key={conflict.id}>
      <div className="audit-card-header">
        <strong>{conflict.title}</strong>
        <span>{Math.round(conflict.confidence * 100)}%</span>
      </div>
      <p>{conflict.detail}</p>
      <footer>{renderEvidenceRefs(conflict.evidence, sources, onOpenSource)}</footer>
    </article>
  );
}

function renderCorrection(
  correction: SuggestedCorrection,
  onDraftSuggestedCorrection: (correction: SuggestedCorrection) => void,
  sources: MemorySource[],
  onOpenSource: (path: string) => void,
) {
  return (
    <article className="audit-card" key={correction.id}>
      <div className="audit-card-header">
        <strong>{correction.title}</strong>
        <span>{Math.round(correction.confidence * 100)}%</span>
      </div>
      <p>{correction.reason}</p>
      <pre>{correction.content}</pre>
      <button
        className="secondary-button compact"
        onClick={() => onDraftSuggestedCorrection(correction)}
        type="button"
      >
        <PencilLine size={15} />
        Draft correction
      </button>
      <footer>{renderEvidenceRefs(correction.evidence, sources, onOpenSource)}</footer>
    </article>
  );
}

export function KnowledgeBoard({
  activeTopic,
  auditError,
  auditMode,
  auditRun,
  isAuditRunning,
  query,
  scan,
  selectedEntryId,
  onAuditModeChange,
  onQueryChange,
  onRefresh,
  onRunCodexAudit,
  onDraftSuggestedCorrection,
  onOpenSource,
  onSelectEntry,
}: {
  activeTopic: MemoryTopic;
  auditError?: unknown;
  auditMode: CodexAuditMode;
  auditRun: CodexAuditRun | null;
  isAuditRunning: boolean;
  query: string;
  scan?: ScanResult;
  selectedEntryId?: string;
  onAuditModeChange: (mode: CodexAuditMode) => void;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  onRunCodexAudit: () => void;
  onDraftSuggestedCorrection: (correction: SuggestedCorrection) => void;
  onOpenSource: (path: string) => void;
  onSelectEntry: (entry: MemoryEntry) => void;
}) {
  const lowerQuery = query.trim().toLowerCase();
  const isAuditView = activeTopic === "audit";
  const isGlobalEntrySearch = Boolean(lowerQuery) && activeTopic !== "sources" && !isAuditView;
  const entries = (scan?.entries ?? []).filter((entry) => {
    const matchesTopic =
      isGlobalEntrySearch
        ? true
        : activeTopic === "staleRisks"
        ? scan?.risks.some((risk) => risk.entryId === entry.id)
        : activeTopic === "sources"
          ? true
          : isAuditView
            ? false
          : entry.topic === activeTopic || (entry.relatedTopics ?? []).includes(activeTopic);
    const matchesQuery =
      !lowerQuery ||
      `${entry.title} ${entry.summary} ${entry.searchText} ${entry.sourcePath}`
        .toLowerCase()
        .includes(lowerQuery);
    return matchesTopic && matchesQuery;
  });

  const sourceCards =
    activeTopic === "sources"
      ? (scan?.sources ?? []).filter(
          (source) =>
            !lowerQuery ||
            `${source.relativePath} ${source.kind} ${source.sha256}`.toLowerCase().includes(lowerQuery),
        )
      : [];
  const sources = scan?.sources ?? [];
  const boardTitle = isGlobalEntrySearch ? "Search Results" : topicTitles[activeTopic];
  const resultSummary =
    !isAuditView && lowerQuery
      ? activeTopic === "sources"
        ? `${sourceCards.length} matching sources`
        : `${entries.length} matching memory entries`
      : undefined;

  return (
    <main className="board">
      <header className="toolbar">
        <div>
          <p className="eyebrow">Knowledge Board</p>
          <h1>{boardTitle}</h1>
          {resultSummary && <span className="toolbar-meta">{resultSummary}</span>}
        </div>
        <div className="toolbar-actions">
          {isAuditView && (
            <>
              <select
                aria-label="Audit mode"
                className="mode-select"
                onChange={(event) => onAuditModeChange(event.target.value as CodexAuditMode)}
                value={auditMode}
              >
                <option value="curated">Curated Audit</option>
                <option value="full">Full Audit</option>
              </select>
              <button
                className="secondary-button compact"
                disabled={isAuditRunning}
                onClick={onRunCodexAudit}
                type="button"
              >
                <Bot size={16} />
                {isAuditRunning ? "Running..." : "Run Codex Audit"}
              </button>
            </>
          )}
          {!isAuditView && (
            <label className="search-box">
              <Search size={16} />
              <input
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search memory..."
                value={query}
              />
            </label>
          )}
          <button className="icon-button" onClick={onRefresh} title="Rescan memory" type="button">
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      {isAuditView && (
        <section className="audit-panel">
          <div className="audit-panel-header">
            <div>
              <p className="eyebrow">Codex Audit</p>
              <h2>{auditRun ? auditRun.report.summary : "No audit report yet"}</h2>
            </div>
            {auditRun && (
              <span>
                {auditRun.report.mode} · {auditRun.report.metadata.inputEntries} entries
              </span>
            )}
          </div>
          {auditError ? <div className="audit-error">{String(auditError)}</div> : null}
          {auditRun && (
            <div className="audit-sections">
              <section>
                <h3>
                  <CheckCircle2 size={15} />
                  Current Claims
                </h3>
                <div className="audit-grid">
                  {auditRun.report.currentClaims.map((claim) =>
                    renderClaim(claim, sources, onOpenSource),
                  )}
                </div>
              </section>
              <section>
                <h3>
                  <AlertCircle size={15} />
                  Stale Claims
                </h3>
                <div className="audit-grid">
                  {auditRun.report.staleClaims.map((claim) =>
                    renderClaim(claim, sources, onOpenSource),
                  )}
                </div>
              </section>
              <section>
                <h3>
                  <Clock size={15} />
                  Uncertain Claims
                </h3>
                <div className="audit-grid">
                  {auditRun.report.uncertainClaims.map((claim) =>
                    renderClaim(claim, sources, onOpenSource),
                  )}
                </div>
              </section>
              <section>
                <h3>
                  <AlertCircle size={15} />
                  Conflicts
                </h3>
                <div className="audit-grid">
                  {auditRun.report.conflicts.map((conflict) =>
                    renderConflict(conflict, sources, onOpenSource),
                  )}
                </div>
              </section>
              <section>
                <h3>
                  <Clock size={15} />
                  Suggested Corrections
                </h3>
                <div className="audit-grid">
                  {auditRun.report.suggestedCorrections.map((correction) =>
                    renderCorrection(correction, onDraftSuggestedCorrection, sources, onOpenSource),
                  )}
                </div>
              </section>
            </div>
          )}
        </section>
      )}

      {activeTopic === "staleRisks" && (
        <section className="risk-strip">
          <AlertCircle size={18} />
          <span>{scan?.risks.length ?? 0} deterministic risk flags found.</span>
        </section>
      )}

      {isAuditView ? null : activeTopic === "sources" ? (
        <section className="source-grid">
          {sourceCards.map((source) => (
            <article className="source-card" key={source.id}>
              <FileSearch size={18} />
              <div>
                <strong>{source.relativePath}</strong>
                <span>
                  {source.kind} · {source.lines} lines · {Math.round(source.bytes / 1024)} KB
                </span>
              </div>
              <button
                aria-label={`Open source ${source.relativePath}`}
                className="icon-button source-open-button"
                onClick={() => onOpenSource(source.path)}
                title="Open source"
                type="button"
              >
                <ExternalLink size={15} />
              </button>
            </article>
          ))}
          {!sourceCards.length && <div className="empty-state">No sources match this view.</div>}
        </section>
      ) : (
        <section className="entry-grid">
          {entries.map((entry) => {
            const source = findSource(scan?.sources ?? [], entry);
            const risk = scan?.risks.find((item) => item.entryId === entry.id);
            return (
              <article
                className={entry.id === selectedEntryId ? "entry-card selected" : "entry-card"}
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
              >
                <div className="entry-card-header">
                  <strong>{entry.title}</strong>
                  <div className="entry-badges">
                    {isGlobalEntrySearch && <span className="topic-badge">{topicLabels[entry.topic]}</span>}
                    {risk && <span className="risk-badge">{risk.kind}</span>}
                  </div>
                </div>
                <p>{entry.summary}</p>
                <footer>
                  <span>{source?.relativePath ?? entry.sourcePath}</span>
                  <span>
                    L{entry.startLine}-{entry.endLine}
                  </span>
                </footer>
              </article>
            );
          })}
          {!entries.length && <div className="empty-state">No memory entries match this view.</div>}
        </section>
      )}
    </main>
  );
}
