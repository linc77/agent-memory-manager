import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, FolderOpen, Pencil, RefreshCw, Save, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loadSkillInventory, openSourceFile, saveSkillManifest } from "../lib/api";
import { agentMeta } from "../lib/agentScope";
import type { UiText } from "../lib/i18n";
import { projectSkillInventory } from "../lib/skillInventory";
import type { AgentKind, SkillCapability, SkillCopy } from "../lib/types";

function matchesCapability(capability: SkillCapability, query: string, tool: string) {
  if (tool && !capability.tools.includes(tool)) {
    return false;
  }
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return [
    capability.name,
    capability.description,
    ...capability.tools,
    ...capability.copies.flatMap((copy) => [copy.path, copy.resolvedPath, copy.issue ?? ""]),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function copyScope(copy: SkillCopy, uiText: UiText) {
  return copy.scope === "project" ? uiText.skills.projectScope : uiText.skills.globalScope;
}

function filesystemKind(copy: SkillCopy, uiText: UiText) {
  return copy.filesystemKind === "symlink" ? uiText.skills.symlink : uiText.skills.directory;
}

export function SkillManager({
  selectedAgent,
  uiText,
}: {
  selectedAgent: AgentKind;
  uiText: UiText;
}) {
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedCopyId, setSelectedCopyId] = useState<string>();
  const [isEditing, setIsEditing] = useState(false);
  const [draftSource, setDraftSource] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [saveMessage, setSaveMessage] = useState<string>();
  const queryClient = useQueryClient();
  const inventoryQuery = useQuery({
    queryKey: ["skill-inventory"],
    queryFn: () => loadSkillInventory(),
  });
  const inventory = useMemo(
    () =>
      inventoryQuery.data
        ? projectSkillInventory(inventoryQuery.data, selectedAgent)
        : undefined,
    [inventoryQuery.data, selectedAgent],
  );

  useEffect(() => {
    setQuery("");
    setTool("");
    setSelectedId(undefined);
    setSelectedCopyId(undefined);
    setIsEditing(false);
    setDraftSource("");
    setSaveError(undefined);
    setSaveMessage(undefined);
  }, [selectedAgent]);

  const tools = useMemo(
    () =>
      Array.from(
        new Set(inventory?.capabilities.flatMap((capability) => capability.tools) ?? []),
      ).sort(),
    [inventory?.capabilities],
  );
  const capabilities = useMemo(
    () =>
      (inventory?.capabilities ?? []).filter((capability) =>
        matchesCapability(capability, query, tool),
      ),
    [inventory?.capabilities, query, tool],
  );
  const selectedCapability = inventory?.capabilities.find(
    (capability) => capability.id === selectedId,
  );
  const selectedCopy = selectedCapability?.copies.find((copy) => copy.id === selectedCopyId)
    ?? selectedCapability?.copies[0];
  const activeRoots = inventory?.roots.filter((root) => root.exists) ?? [];

  function openCapability(id: string) {
    setSelectedId(id);
    setSelectedCopyId(undefined);
    setIsEditing(false);
    setDraftSource("");
    setSaveError(undefined);
    setSaveMessage(undefined);
  }

  function closeCapability() {
    setSelectedId(undefined);
    setSelectedCopyId(undefined);
    setIsEditing(false);
    setDraftSource("");
    setSaveError(undefined);
    setSaveMessage(undefined);
  }

  function startEditing() {
    if (!selectedCopy) return;
    setDraftSource(selectedCopy.source);
    setIsEditing(true);
    setSaveError(undefined);
    setSaveMessage(undefined);
  }

  async function saveChanges() {
    if (!selectedCopy) return;
    setIsSaving(true);
    setSaveError(undefined);
    setSaveMessage(undefined);
    try {
      const nextInventory = await saveSkillManifest({
        manifestPath: selectedCopy.manifestPath,
        source: draftSource,
        expectedContentHash: selectedCopy.contentHash,
      });
      queryClient.setQueryData(["skill-inventory"], nextInventory);
      const nextCapability = nextInventory.capabilities.find((capability) =>
        capability.copies.some((copy) => copy.manifestPath === selectedCopy.manifestPath));
      const nextCopy = nextCapability?.copies.find(
        (copy) => copy.manifestPath === selectedCopy.manifestPath,
      );
      setSelectedId(nextCapability?.id);
      setSelectedCopyId(nextCopy?.id);
      setIsEditing(false);
      setSaveMessage(uiText.skills.savedChanges);
    } catch (error) {
      setSaveError(uiText.skills.saveFailed(error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="board skill-manager">
      <header className="toolbar skill-toolbar">
        <div>
          <p className="eyebrow">{uiText.skills.eyebrow}</p>
          <h1>{agentMeta[selectedAgent].label} · {uiText.skills.title}</h1>
        </div>
        <button
          className="secondary-button"
          disabled={inventoryQuery.isFetching || isEditing}
          onClick={() => void inventoryQuery.refetch()}
          type="button"
        >
          <RefreshCw size={15} />
          {uiText.skills.refresh}
        </button>
      </header>

      {inventoryQuery.error && <div className="audit-error">{String(inventoryQuery.error)}</div>}
      {inventoryQuery.isLoading && <div className="skill-state">{uiText.skills.loading}</div>}

      {inventory && !selectedCapability && (
        <>
          <div className="skill-root-summary">
            <span>{uiText.skills.scanRoots}</span>
            <div className="skill-tool-list">
              {activeRoots.map((root) => (
                <span key={root.id} title={root.path}>
                  {root.label} · {root.copyCount}
                </span>
              ))}
            </div>
          </div>

          <div className="skill-controls">
            <label className="search-box">
              <Search size={15} />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder={uiText.skills.searchPlaceholder}
                value={query}
              />
            </label>
            <select
              aria-label={uiText.skills.tools}
              className="mode-select"
              onChange={(event) => setTool(event.target.value)}
              value={tool}
            >
              <option value="">{uiText.skills.allTools}</option>
              {tools.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {inventory.snapshotError && <div className="audit-error">{inventory.snapshotError}</div>}

          <section className="skill-grid">
            {capabilities.map((capability) => (
              <button
                aria-label={uiText.skills.openDetails(capability.name)}
                className="skill-card"
                key={capability.id}
                onClick={() => openCapability(capability.id)}
                type="button"
              >
                <span className="skill-card-heading">
                  <strong>{capability.name}</strong>
                  <ChevronRight size={17} />
                </span>
                <span className="skill-card-description">
                  {capability.description || uiText.skills.noDescription}
                </span>
                <span className="skill-card-footer">
                  <span>{capability.tools.join(" · ")}</span>
                  <em className={capability.health === "invalid" ? "invalid" : ""}>
                    {capability.health === "invalid"
                      ? uiText.skills.invalid
                      : uiText.skills.copyCount(capability.copyCount)}
                  </em>
                </span>
              </button>
            ))}
            {!capabilities.length && <div className="skill-state">{uiText.skills.empty}</div>}
          </section>
        </>
      )}

      {selectedCapability && (
        <section className="skill-detail-page">
          <button
            className="skill-detail-back"
            disabled={isEditing || isSaving}
            onClick={closeCapability}
            type="button"
          >
            <ArrowLeft size={16} />
            {uiText.skills.backToAll}
          </button>

          <section className="skill-locations" aria-label={uiText.skills.copyLocations}>
            <h3>{uiText.skills.copyLocations}</h3>
            <div className="skill-copy-list">
              {selectedCapability.copies.map((copy) => (
                <article className={copy.valid ? "skill-copy" : "skill-copy invalid"} key={copy.id}>
                  <header>
                    <div>
                      <strong>{copy.tool}</strong>
                      <span>{copyScope(copy, uiText)}</span>
                      <span>{filesystemKind(copy, uiText)}</span>
                    </div>
                    <button
                      aria-label={`${uiText.skills.reveal}: ${copy.path}`}
                      className="icon-button"
                      onClick={() => void openSourceFile(copy.path)}
                      type="button"
                    >
                      <FolderOpen size={15} />
                    </button>
                  </header>
                  <code>{copy.path}</code>
                  {copy.filesystemKind === "symlink" && copy.resolvedPath !== copy.path && (
                    <small>{uiText.skills.resolvedPath}: {copy.resolvedPath}</small>
                  )}
                  {copy.issue && <small className="skill-copy-issue">{copy.issue}</small>}
                </article>
              ))}
            </div>
          </section>

          <header className="skill-detail-header">
            <div className="skill-detail-content">
              <div className="skill-detail-field">
                <span>{uiText.skills.nameLabel}</span>
                <h2>{selectedCapability.name}</h2>
              </div>
              <div className="skill-detail-field">
                <span>{uiText.skills.descriptionLabel}</span>
                <p>{selectedCapability.description || uiText.skills.noDescription}</p>
              </div>
            </div>
            <aside className="skill-detail-facts">
              <span
                className={
                  selectedCapability.health === "invalid"
                    ? "status-pill invalid"
                    : "status-pill"
                }
              >
                {selectedCapability.health === "invalid"
                  ? uiText.skills.invalid
                  : uiText.skills.ready}
              </span>
              <dl>
                <div>
                  <dt>{uiText.skills.tools}</dt>
                  <dd>{selectedCapability.tools.join(", ")}</dd>
                </div>
                <div>
                  <dt>{uiText.skills.copyLocations}</dt>
                  <dd>{uiText.skills.copyCount(selectedCapability.copyCount)}</dd>
                </div>
              </dl>
            </aside>
          </header>

          <article className="skill-markdown-panel">
            <header className="skill-markdown-toolbar">
              <h3>{uiText.skills.documentation}</h3>
              <div className="skill-editor-actions">
                {selectedCapability.copies.length > 1 && (
                  <label className="skill-copy-select">
                    <span>{uiText.skills.editCopy}</span>
                    <select
                      disabled={isEditing}
                      onChange={(event) => {
                        setSelectedCopyId(event.target.value);
                        setSaveError(undefined);
                        setSaveMessage(undefined);
                      }}
                      value={selectedCopy?.id ?? ""}
                    >
                      {selectedCapability.copies.map((copy) => (
                        <option key={copy.id} value={copy.id}>
                          {copy.tool} · {copyScope(copy, uiText)} · {copy.path}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {isEditing ? (
                  <>
                    <button
                      className="secondary-button compact"
                      disabled={isSaving}
                      onClick={() => {
                        setIsEditing(false);
                        setDraftSource("");
                        setSaveError(undefined);
                      }}
                      type="button"
                    >
                      {uiText.skills.cancelEdit}
                    </button>
                    <button
                      className="primary-button"
                      disabled={isSaving || draftSource === selectedCopy?.source}
                      onClick={() => void saveChanges()}
                      type="button"
                    >
                      <Save size={14} />
                      {isSaving ? uiText.skills.savingChanges : uiText.skills.saveChanges}
                    </button>
                  </>
                ) : (
                  <button className="secondary-button compact" onClick={startEditing} type="button">
                    <Pencil size={14} />
                    {uiText.skills.editDocumentation}
                  </button>
                )}
              </div>
            </header>
            {isEditing ? (
              <textarea
                aria-label={uiText.skills.sourceEditor}
                className="skill-source-editor"
                onChange={(event) => setDraftSource(event.target.value)}
                spellCheck={false}
                value={draftSource}
              />
            ) : selectedCapability.markdown ? (
              <div className="skill-markdown">
                <ReactMarkdown
                  components={{
                    a: ({ children, href }) => (
                      <span className="skill-markdown-link" title={href}>{children}</span>
                    ),
                    img: ({ alt }) => alt ? <span className="skill-markdown-image">{alt}</span> : null,
                  }}
                  remarkPlugins={[remarkGfm]}
                >
                  {selectedCapability.markdown}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="skill-state">{uiText.skills.noDocumentation}</div>
            )}
            {saveError && <p className="skill-save-status error">{saveError}</p>}
            {saveMessage && <p className="skill-save-status success">{saveMessage}</p>}
          </article>

        </section>
      )}
    </main>
  );
}
