import {
  AlertTriangle,
  Bot,
  Database,
  FileText,
  FolderKanban,
  History,
  PenLine,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import type { MemoryTopic, ScanResult } from "../lib/types";

interface TopicDef {
  id: MemoryTopic;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

interface TopicSection {
  label: string;
  topics: TopicDef[];
}

const topicSections: TopicSection[] = [
  {
    label: "Current Memory",
    topics: [
      { id: "profile", label: "Profile", icon: UserRound },
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "rules", label: "Rules", icon: ShieldCheck },
      { id: "tools", label: "Tools", icon: Wrench },
      { id: "writing", label: "Writing", icon: PenLine },
    ],
  },
  {
    label: "Review",
    topics: [
      { id: "audit", label: "Audit", icon: Bot },
      { id: "overrides", label: "Corrections", icon: Sparkles },
      { id: "staleRisks", label: "Conflicts", icon: AlertTriangle },
    ],
  },
  {
    label: "Evidence",
    topics: [
      { id: "activityLog", label: "Activity Log", icon: History },
      { id: "sources", label: "Sources", icon: Database },
    ],
  },
];

export function Sidebar({
  activeTopic,
  rootOverride,
  rootPath,
  scan,
  onApplyRootOverride,
  onSelectTopic,
}: {
  activeTopic: MemoryTopic;
  rootOverride: string | null;
  rootPath?: string;
  scan?: ScanResult;
  onApplyRootOverride: (path: string | null) => void;
  onSelectTopic: (topic: MemoryTopic) => void;
}) {
  const [draftRoot, setDraftRoot] = useState(rootOverride ?? "");
  const counts = new Map<MemoryTopic, number>();
  for (const entry of scan?.entries ?? []) {
    counts.set(entry.topic, (counts.get(entry.topic) ?? 0) + 1);
    for (const topic of entry.relatedTopics ?? []) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  counts.set("sources", scan?.sources.length ?? 0);
  counts.set("staleRisks", scan?.risks.length ?? 0);

  useEffect(() => {
    setDraftRoot(rootOverride ?? "");
  }, [rootOverride]);

  function applyRootOverride() {
    const nextRoot = draftRoot.trim();
    onApplyRootOverride(nextRoot ? nextRoot : null);
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <Bot size={22} />
        <div>
          <strong>Agent Memory</strong>
          <span>Codex local memory</span>
        </div>
      </div>

      <nav className="topic-nav">
        {topicSections.map((section) => (
          <div className="topic-section" key={section.label}>
            <span className="topic-section-label">{section.label}</span>
            {section.topics.map((topic) => {
              const Icon = topic.icon;
              const count = topic.id === "audit" ? undefined : counts.get(topic.id) ?? 0;
              return (
                <button
                  className={topic.id === activeTopic ? "topic-item active" : "topic-item"}
                  key={topic.id}
                  onClick={() => onSelectTopic(topic.id)}
                  type="button"
                >
                  <Icon size={17} />
                  <span>{topic.label}</span>
                  {count !== undefined && <em>{count}</em>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="root-label">
          <FileText size={15} />
          <span>{rootPath ?? "Scanning default memory root"}</span>
        </div>
        <label className="root-input">
          Memory root
          <input
            onChange={(event) => setDraftRoot(event.target.value)}
            placeholder="Default ~/.codex/memories"
            value={draftRoot}
          />
        </label>
        <div className="root-actions">
          <button className="secondary-button compact" onClick={applyRootOverride} type="button">
            Apply
          </button>
          <button
            className="secondary-button compact"
            disabled={!rootOverride && !draftRoot}
            onClick={() => {
              setDraftRoot("");
              onApplyRootOverride(null);
            }}
            type="button"
          >
            Default
          </button>
        </div>
      </div>
    </aside>
  );
}
