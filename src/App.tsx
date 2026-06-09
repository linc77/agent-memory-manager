import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  draftCorrection,
  draftCorrectionFromContent,
  isFixtureMode,
  openSourceFile,
  runCodexAudit,
  scanMemories,
  writeCorrection,
} from "./lib/api";
import {
  clampPaneLayout,
  DEFAULT_PANE_LAYOUT,
  paneGridTemplate,
  resizePaneLayout,
  type PaneDivider,
type PaneLayout,
} from "./lib/paneLayout";
import type {
  CodexAuditMode,
  CodexAuditRun,
  CorrectionDraft,
  MemoryEntry,
  MemoryTopic,
  SuggestedCorrection,
} from "./lib/types";
import { CorrectionDialog } from "./components/CorrectionDialog";
import { Inspector } from "./components/Inspector";
import { KnowledgeBoard } from "./components/KnowledgeBoard";
import { Sidebar } from "./components/Sidebar";
import "./App.css";

interface AuditRequest {
  rootOverride: string | null;
  mode: CodexAuditMode;
}

function App() {
  const queryClient = useQueryClient();
  const fixtureMode = isFixtureMode();
  const [rootOverride, setRootOverride] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<MemoryTopic>("profile");
  const [query, setQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>();
  const [draft, setDraft] = useState<CorrectionDraft | null>(null);
  const [lastWritePath, setLastWritePath] = useState<string | null>(null);
  const [auditMode, setAuditMode] = useState<CodexAuditMode>("curated");
  const [auditRun, setAuditRun] = useState<CodexAuditRun | null>(null);
  const [paneLayout, setPaneLayout] = useState(() =>
    clampPaneLayout(DEFAULT_PANE_LAYOUT, window.innerWidth),
  );
  const [draggingDivider, setDraggingDivider] = useState<PaneDivider | null>(null);
  const auditContextRef = useRef<{ rootOverride: string | null; mode: CodexAuditMode }>({
    rootOverride,
    mode: auditMode,
  });
  auditContextRef.current = { rootOverride, mode: auditMode };
  const dragRef = useRef<{
    divider: PaneDivider;
    startX: number;
    startLayout: PaneLayout;
    viewportWidth: number;
  } | null>(null);

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
    onSuccess: async (path) => {
      setDraft(null);
      setLastWritePath(path);
      await queryClient.invalidateQueries({ queryKey: ["memories", rootOverride] });
    },
  });

  const suggestedCorrectionMutation = useMutation({
    mutationFn: (correction: SuggestedCorrection) =>
      draftCorrectionFromContent(rootOverride, correction.id, correction.content),
    onSuccess: setDraft,
  });

  const auditMutation = useMutation({
    mutationFn: async (request: AuditRequest) => ({
      request,
      run: await runCodexAudit(request.rootOverride, request.mode),
    }),
    onSuccess: ({ request, run }) => {
      const current = auditContextRef.current;
      if (request.rootOverride === current.rootOverride && request.mode === current.mode) {
        setAuditRun(run);
      }
    },
  });

  const openSourceMutation = useMutation({
    mutationFn: (path: string) => openSourceFile(path),
  });

  useEffect(() => {
    const handleResize = () =>
      setPaneLayout((layout) => clampPaneLayout(layout, window.innerWidth));

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function startPaneResize(divider: PaneDivider, event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      divider,
      startX: event.clientX,
      startLayout: paneLayout,
      viewportWidth: window.innerWidth,
    };
    setDraggingDivider(divider);
  }

  function movePaneResize(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    setPaneLayout(
      resizePaneLayout(drag.startLayout, drag.divider, event.clientX - drag.startX, drag.viewportWidth),
    );
  }

  function stopPaneResize() {
    dragRef.current = null;
    setDraggingDivider(null);
  }

  function nudgePaneResize(divider: PaneDivider, event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const step = event.shiftKey ? 48 : 16;
    const deltaX = event.key === "ArrowLeft" ? -step : step;
    setPaneLayout((layout) => resizePaneLayout(layout, divider, deltaX, window.innerWidth));
  }

  function renderPaneResizer(divider: PaneDivider) {
    return (
      <div
        aria-label={divider === "left" ? "Resize sidebar" : "Resize inspector"}
        className={draggingDivider === divider ? "pane-resizer active" : "pane-resizer"}
        onKeyDown={(event) => nudgePaneResize(divider, event)}
        onPointerCancel={stopPaneResize}
        onPointerDown={(event) => startPaneResize(divider, event)}
        onPointerMove={movePaneResize}
        onPointerUp={stopPaneResize}
        role="separator"
        tabIndex={0}
      />
    );
  }

  return (
    <div
      className={draggingDivider ? "app-shell resizing" : "app-shell"}
      style={{ gridTemplateColumns: paneGridTemplate(paneLayout) }}
    >
      {fixtureMode && <div className="fixture-banner">Fixture mode: demo memory only</div>}
      <Sidebar
        activeTopic={activeTopic}
        rootOverride={rootOverride}
        rootPath={scanQuery.data?.root}
        onApplyRootOverride={(path) => {
          setRootOverride(path);
          setQuery("");
          setSelectedEntryId(undefined);
          setAuditRun(null);
          setLastWritePath(null);
          auditMutation.reset();
        }}
        onSelectTopic={(topic) => {
          setActiveTopic(topic);
          setSelectedEntryId(undefined);
        }}
        scan={scanQuery.data}
      />

      {renderPaneResizer("left")}

      <KnowledgeBoard
        activeTopic={activeTopic}
        auditError={auditMutation.error}
        auditMode={auditMode}
        auditRun={auditRun}
        isAuditRunning={auditMutation.isPending}
        onAuditModeChange={(mode) => {
          setAuditMode(mode);
          setAuditRun(null);
          auditMutation.reset();
        }}
        onQueryChange={setQuery}
        onRefresh={() => scanQuery.refetch()}
        onDraftSuggestedCorrection={(correction) => suggestedCorrectionMutation.mutate(correction)}
        onOpenSource={(path) => openSourceMutation.mutate(path)}
        onRunCodexAudit={() => auditMutation.mutate({ rootOverride, mode: auditMode })}
        onSelectEntry={(entry) => setSelectedEntryId(entry.id)}
        query={query}
        scan={scanQuery.data}
        selectedEntryId={selectedEntryId}
      />

      {renderPaneResizer("right")}

      <Inspector
        entry={selectedEntry}
        onDraftCorrection={(entry) => draftMutation.mutate(entry)}
        risk={selectedRisk}
        rootOverride={rootOverride}
        source={selectedSource}
      />

      {scanQuery.isLoading && <div className="status-toast">Scanning Codex memory...</div>}
      {lastWritePath && <div className="status-toast">Correction note written: {lastWritePath}</div>}
      {scanQuery.error && <div className="status-toast error">{String(scanQuery.error)}</div>}
      {draftMutation.error && <div className="status-toast error">{String(draftMutation.error)}</div>}
      {writeMutation.error && <div className="status-toast error">{String(writeMutation.error)}</div>}
      {auditMutation.error && <div className="status-toast error">{String(auditMutation.error)}</div>}
      {openSourceMutation.error && (
        <div className="status-toast error">{String(openSourceMutation.error)}</div>
      )}
      {suggestedCorrectionMutation.error && (
        <div className="status-toast error">{String(suggestedCorrectionMutation.error)}</div>
      )}

      {draft && (
        <CorrectionDialog
          draft={draft}
          isWriting={writeMutation.isPending}
          onCancel={() => setDraft(null)}
          onContentChange={(content) => setDraft({ ...draft, content })}
          onConfirm={() => writeMutation.mutate(draft)}
        />
      )}
    </div>
  );
}

export default App;
