import {
  AlertTriangle,
  Bot,
  Database,
  FileText,
  FolderKanban,
  PenLine,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";
import type { MemoryTopic, ScanResult } from "../lib/types";

interface TopicDef {
  id: MemoryTopic;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

const topics: TopicDef[] = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "rules", label: "Rules", icon: ShieldCheck },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "writing", label: "Writing", icon: PenLine },
  { id: "overrides", label: "Overrides", icon: Sparkles },
  { id: "sources", label: "Sources", icon: Database },
  { id: "staleRisks", label: "Stale Risks", icon: AlertTriangle },
];

export function Sidebar({
  activeTopic,
  scan,
  onSelectTopic,
}: {
  activeTopic: MemoryTopic;
  scan?: ScanResult;
  onSelectTopic: (topic: MemoryTopic) => void;
}) {
  const counts = new Map<MemoryTopic, number>();
  for (const entry of scan?.entries ?? []) {
    counts.set(entry.topic, (counts.get(entry.topic) ?? 0) + 1);
  }
  counts.set("sources", scan?.sources.length ?? 0);
  counts.set("staleRisks", scan?.risks.length ?? 0);

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
        {topics.map((topic) => {
          const Icon = topic.icon;
          return (
            <button
              className={topic.id === activeTopic ? "topic-item active" : "topic-item"}
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              type="button"
            >
              <Icon size={17} />
              <span>{topic.label}</span>
              <em>{counts.get(topic.id) ?? 0}</em>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <FileText size={15} />
        <span>{scan?.root ?? "Scanning default memory root"}</span>
      </div>
    </aside>
  );
}
