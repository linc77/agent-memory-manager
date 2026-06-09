import { ExternalLink, FileText, PencilLine } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getSourceExcerpt, openSourceFile } from "../lib/api";
import type { MemoryEntry, MemorySource, RiskFlag } from "../lib/types";

export function Inspector({
  entry,
  source,
  risk,
  rootOverride,
  onDraftCorrection,
}: {
  entry?: MemoryEntry;
  source?: MemorySource;
  risk?: RiskFlag;
  rootOverride: string | null;
  onDraftCorrection: (entry: MemoryEntry) => void;
}) {
  const excerptQuery = useQuery({
    enabled: Boolean(entry && source),
    queryKey: ["excerpt", source?.path, entry?.startLine, entry?.endLine],
    queryFn: () =>
      getSourceExcerpt(rootOverride, source!.path, entry!.startLine, entry!.endLine),
  });

  const openSourceMutation = useMutation({
    mutationFn: (path: string) => openSourceFile(path),
  });
  const excerptText = excerptQuery.error
    ? String(excerptQuery.error)
    : excerptQuery.data ?? "Loading source excerpt...";

  if (!entry) {
    return (
      <aside className="inspector">
        <div className="empty-inspector">
          <FileText size={26} />
          <strong>Select a memory card</strong>
          <span>Source, risk, and correction actions will appear here.</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <p className="eyebrow">Inspector</p>
      <h2>{entry.title}</h2>
      <p className="inspector-summary">{entry.summary}</p>

      {risk && (
        <section className="inspector-panel warning">
          <strong>{risk.title}</strong>
          <span>{risk.detail}</span>
        </section>
      )}

      <section className="inspector-panel">
        <strong>Source</strong>
        <span>{source?.relativePath ?? entry.sourcePath}</span>
        <span>
          Lines {entry.startLine}-{entry.endLine}
        </span>
      </section>

      <section className="inspector-panel">
        <strong>Excerpt</strong>
        <pre>{excerptText}</pre>
      </section>

      <div className="inspector-actions">
        <button className="primary-button" onClick={() => onDraftCorrection(entry)} type="button">
          <PencilLine size={16} />
          Draft correction
        </button>
        <button
          className="secondary-button"
          disabled={!source || openSourceMutation.isPending}
          onClick={() => source && openSourceMutation.mutate(source.path)}
          type="button"
        >
          <ExternalLink size={16} />
          Open source
        </button>
      </div>
      {openSourceMutation.error && (
        <div className="inspector-error">{String(openSourceMutation.error)}</div>
      )}
    </aside>
  );
}
