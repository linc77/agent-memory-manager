import { readdir, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import type {
  AgentKind,
  MemoryChangeMetadata,
  MemorySourceKind,
} from "../../../../src/lib/types";

export interface DiscoveredMemorySource {
  path: string;
  kind: MemorySourceKind;
}

export interface AgentMemoryAdapter {
  agent: AgentKind;
  discover(root: string): Promise<DiscoveredMemorySource[]>;
  correctionTarget(root: string, filename: string, sourcePaths: string[]): Promise<string>;
  serializeChange(change: MemoryChangeMetadata, content: string): string;
  writeMode: "create" | "append";
}

async function isDirectory(path: string) {
  return stat(path).then((value) => value.isDirectory()).catch(() => false);
}

async function isFile(path: string) {
  return stat(path).then((value) => value.isFile()).catch(() => false);
}

async function collectFile(
  base: string,
  name: string,
  kind: MemorySourceKind,
  output: DiscoveredMemorySource[],
) {
  const path = join(base, name);
  if (await isFile(path)) output.push({ path, kind });
}

async function collectDirectory(
  directory: string,
  kind: MemorySourceKind,
  output: DiscoveredMemorySource[],
) {
  if (!(await isDirectory(directory))) return;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (extname(entry.name) === ".md" && (entry.isFile() || (await isFile(path)))) {
      output.push({ path, kind });
    }
  }
}

function serializeMarkdownChange(change: MemoryChangeMetadata, content: string) {
  const marker = `<!-- agent-backplane-change ${JSON.stringify(change)} -->`;
  const heading = `## Agent Backplane change ${change.id}`;
  return `${heading}\n\n${marker}\n\n${content.trim()}\n`;
}

const codexAdapter: AgentMemoryAdapter = {
  agent: "codex",
  writeMode: "create",
  async discover(root) {
    const output: DiscoveredMemorySource[] = [];
    await collectFile(root, "memory_summary.md", "summary", output);
    await collectFile(root, "MEMORY.md", "registry", output);
    await collectFile(root, "raw_memories.md", "raw", output);
    await collectDirectory(join(root, "rollout_summaries"), "rolloutSummary", output);
    await collectDirectory(join(root, "extensions/ad_hoc/notes"), "adHocNote", output);
    await collectDirectory(join(root, "extensions/chronicle/resources"), "chronicle", output);
    const skillsDirectory = join(root, "skills");
    if (await isDirectory(skillsDirectory)) {
      for (const entry of await readdir(skillsDirectory)) {
        await collectFile(join(skillsDirectory, entry), "SKILL.md", "skill", output);
      }
    }
    return output;
  },
  async correctionTarget(root, filename) {
    return join(root, "extensions", "ad_hoc", "notes", filename);
  },
  serializeChange: serializeMarkdownChange,
};

const claudeAdapter: AgentMemoryAdapter = {
  agent: "claudeCode",
  writeMode: "create",
  async discover(root) {
    const output: DiscoveredMemorySource[] = [];
    if (!(await isDirectory(root))) return output;
    for (const projectEntry of await readdir(root, { withFileTypes: true })) {
      const project = join(root, projectEntry.name);
      if (!projectEntry.isDirectory() && !(await isDirectory(project))) continue;
      await collectFile(project, "MEMORY.md", "registry", output);
      await collectDirectory(join(project, "memory"), "registry", output);
    }
    return output;
  },
  async correctionTarget(root, filename, sourcePaths) {
    const projectNames = new Set(
      sourcePaths
        .map((path) => normalize(path).split(sep)[0])
        .filter((part) => part && part !== "." && part !== ".."),
    );
    if (projectNames.size !== 1) {
      throw new Error("Claude Code corrections must target memory from exactly one project");
    }
    const projectName = [...projectNames][0];
    return join(root, projectName, "memory", filename);
  },
  serializeChange: serializeMarkdownChange,
};

const hermesAdapter: AgentMemoryAdapter = {
  agent: "hermes",
  writeMode: "append",
  async discover(root) {
    const output: DiscoveredMemorySource[] = [];
    await collectFile(root, "MEMORY.md", "registry", output);
    await collectFile(root, "USER.md", "registry", output);
    return output;
  },
  async correctionTarget(root) {
    return join(root, "MEMORY.md");
  },
  serializeChange(change, content) {
    return serializeMarkdownChange(change, content)
      .trim()
      .split("\n")
      .map((line) => `${line}\n§`)
      .join("\n") + "\n";
  },
};

const adapters: Record<AgentKind, AgentMemoryAdapter> = {
  codex: codexAdapter,
  claudeCode: claudeAdapter,
  hermes: hermesAdapter,
};

export function memoryAdapter(agent: AgentKind) {
  return adapters[agent];
}
