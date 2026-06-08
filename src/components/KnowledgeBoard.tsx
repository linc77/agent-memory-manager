import { AlertCircle, FileSearch, RefreshCw, Search } from "lucide-react";
import type { MemoryEntry, MemorySource, MemoryTopic, ScanResult } from "../lib/types";

const topicTitles: Record<MemoryTopic, string> = {
  profile: "Profile",
  projects: "Projects",
  rules: "Rules",
  tools: "Tools",
  writing: "Writing",
  overrides: "Overrides",
  sources: "Sources",
  staleRisks: "Stale Risks",
};

function findSource(sources: MemorySource[], entry: MemoryEntry) {
  return sources.find((source) => source.relativePath === entry.sourcePath);
}

export function KnowledgeBoard({
  activeTopic,
  query,
  scan,
  selectedEntryId,
  onQueryChange,
  onRefresh,
  onSelectEntry,
}: {
  activeTopic: MemoryTopic;
  query: string;
  scan?: ScanResult;
  selectedEntryId?: string;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  onSelectEntry: (entry: MemoryEntry) => void;
}) {
  const lowerQuery = query.trim().toLowerCase();
  const entries = (scan?.entries ?? []).filter((entry) => {
    const matchesTopic =
      activeTopic === "staleRisks"
        ? scan?.risks.some((risk) => risk.entryId === entry.id)
        : activeTopic === "sources"
          ? true
          : entry.topic === activeTopic;
    const matchesQuery =
      !lowerQuery ||
      `${entry.title} ${entry.summary} ${entry.searchText} ${entry.sourcePath}`
        .toLowerCase()
        .includes(lowerQuery);
    return matchesTopic && matchesQuery;
  });

  const sourceCards = activeTopic === "sources" ? scan?.sources ?? [] : [];

  return (
    <main className="board">
      <header className="toolbar">
        <div>
          <p className="eyebrow">Knowledge Board</p>
          <h1>{topicTitles[activeTopic]}</h1>
        </div>
        <div className="toolbar-actions">
          <label className="search-box">
            <Search size={16} />
            <input
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search memory..."
              value={query}
            />
          </label>
          <button className="icon-button" onClick={onRefresh} title="Rescan memory" type="button">
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      {activeTopic === "staleRisks" && (
        <section className="risk-strip">
          <AlertCircle size={18} />
          <span>{scan?.risks.length ?? 0} deterministic risk flags found.</span>
        </section>
      )}

      {activeTopic === "sources" ? (
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
            </article>
          ))}
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
                  {risk && <span className="risk-badge">{risk.kind}</span>}
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
