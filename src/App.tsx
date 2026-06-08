import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { draftCorrection, scanMemories, writeCorrection } from "./lib/api";
import type { CorrectionDraft, MemoryEntry, MemoryTopic } from "./lib/types";
import { CorrectionDialog } from "./components/CorrectionDialog";
import { Inspector } from "./components/Inspector";
import { KnowledgeBoard } from "./components/KnowledgeBoard";
import { Sidebar } from "./components/Sidebar";
import "./App.css";

function App() {
  const queryClient = useQueryClient();
  const rootOverride: string | null = null;
  const [activeTopic, setActiveTopic] = useState<MemoryTopic>("profile");
  const [query, setQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>();
  const [draft, setDraft] = useState<CorrectionDraft | null>(null);

  const scanQuery = useQuery({
    queryKey: ["memories", rootOverride],
    queryFn: () => scanMemories(rootOverride),
  });

  const selectedEntry = useMemo(
    () => scanQuery.data?.entries.find((entry) => entry.id === selectedEntryId),
    [scanQuery.data?.entries, selectedEntryId],
  );

  const selectedSource = useMemo(
    () =>
      selectedEntry
        ? scanQuery.data?.sources.find((source) => source.relativePath === selectedEntry.sourcePath)
        : undefined,
    [scanQuery.data?.sources, selectedEntry],
  );

  const selectedRisk = useMemo(
    () =>
      selectedEntry
        ? scanQuery.data?.risks.find((risk) => risk.entryId === selectedEntry.id)
        : undefined,
    [scanQuery.data?.risks, selectedEntry],
  );

  const draftMutation = useMutation({
    mutationFn: (entry: MemoryEntry) =>
      draftCorrection(rootOverride, "memory-correction", [
        `Review and update memory from ${entry.sourcePath} lines ${entry.startLine}-${entry.endLine}: ${entry.summary}`,
      ]),
    onSuccess: setDraft,
  });

  const writeMutation = useMutation({
    mutationFn: (nextDraft: CorrectionDraft) => writeCorrection(rootOverride, nextDraft),
    onSuccess: async () => {
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["memories", rootOverride] });
    },
  });

  return (
    <div className="app-shell">
      <Sidebar
        activeTopic={activeTopic}
        onSelectTopic={(topic) => {
          setActiveTopic(topic);
          setSelectedEntryId(undefined);
        }}
        scan={scanQuery.data}
      />

      <KnowledgeBoard
        activeTopic={activeTopic}
        onQueryChange={setQuery}
        onRefresh={() => scanQuery.refetch()}
        onSelectEntry={(entry) => setSelectedEntryId(entry.id)}
        query={query}
        scan={scanQuery.data}
        selectedEntryId={selectedEntryId}
      />

      <Inspector
        entry={selectedEntry}
        onDraftCorrection={(entry) => draftMutation.mutate(entry)}
        risk={selectedRisk}
        rootOverride={rootOverride}
        source={selectedSource}
      />

      {scanQuery.isLoading && <div className="status-toast">Scanning Codex memory...</div>}
      {scanQuery.error && <div className="status-toast error">{String(scanQuery.error)}</div>}
      {draftMutation.error && <div className="status-toast error">{String(draftMutation.error)}</div>}
      {writeMutation.error && <div className="status-toast error">{String(writeMutation.error)}</div>}

      {draft && (
        <CorrectionDialog
          draft={draft}
          isWriting={writeMutation.isPending}
          onCancel={() => setDraft(null)}
          onConfirm={() => writeMutation.mutate(draft)}
        />
      )}
    </div>
  );
}

export default App;
