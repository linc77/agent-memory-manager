// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { CodexAuditRun, ScanResult } from "./lib/types";

const invokeMock = vi.hoisted(() => vi.fn());
const revealItemInDirMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  revealItemInDir: revealItemInDirMock,
}));

const scanResult: ScanResult = {
  root: "/Users/qsh/.codex/memories",
  sources: [],
  entries: [],
  risks: [],
};

const clarityScanResult: ScanResult = {
  root: "/Users/qsh/.codex/memories",
  sources: [
    {
      id: "memory",
      path: "/Users/qsh/.codex/memories/MEMORY.md",
      relativePath: "MEMORY.md",
      kind: "registry",
      modifiedMs: 1,
      bytes: 256,
      lines: 3,
      sha256: "memory-sha",
    },
    {
      id: "activity-source",
      path: "/Users/qsh/.codex/memories/extensions/chronicle/resources/example.md",
      relativePath: "extensions/chronicle/resources/example.md",
      kind: "chronicle",
      modifiedMs: 1,
      bytes: 256,
      lines: 3,
      sha256: "activity-sha",
    },
    {
      id: "summary-source",
      path: "/Users/qsh/.codex/memories/memory_summary.md",
      relativePath: "memory_summary.md",
      kind: "summary",
      modifiedMs: 1,
      bytes: 512,
      lines: 30,
      sha256: "summary-sha",
    },
    {
      id: "correction-source",
      path: "/Users/qsh/.codex/memories/extensions/ad_hoc/notes/profile.md",
      relativePath: "extensions/ad_hoc/notes/profile.md",
      kind: "adHocNote",
      modifiedMs: 1,
      bytes: 256,
      lines: 3,
      sha256: "correction-sha",
    },
  ],
  entries: [
    {
      id: "profile",
      topic: "profile",
      relatedTopics: [],
      title: "Stable profile",
      summary: "The user's current technical stack is Python/Rust.",
      searchText: "The user's current technical stack is Python/Rust.",
      sourcePath: "MEMORY.md",
      startLine: 1,
      endLine: 3,
    },
    {
      id: "activity",
      topic: "activityLog",
      relatedTopics: [],
      title: "10-minute activity",
      summary: "The user reviewed BeeBotOS in a recording.",
      searchText: "The user reviewed BeeBotOS in a recording.",
      sourcePath: "extensions/chronicle/resources/example.md",
      startLine: 1,
      endLine: 3,
    },
    {
      id: "profile-correction",
      topic: "overrides",
      relatedTopics: ["profile"],
      title: "Profile correction",
      summary: "The user's current profile explicitly prefers Python/Rust.",
      searchText: "Memory update request: The user's current profile explicitly prefers Python/Rust.",
      sourcePath: "extensions/ad_hoc/notes/profile.md",
      startLine: 1,
      endLine: 3,
    },
  ],
  risks: [],
};

const auditRun: CodexAuditRun = {
  cachePath: "/Users/qsh/.codex/memories/.amm/codex-runs/20260608-curated.json",
  report: {
    schemaVersion: "1",
    mode: "curated",
    generatedAt: "2026-06-08T09:30:00Z",
    summary: "The durable profile favors Python/Rust over older Java/Spring Boot references.",
    currentClaims: [
      {
        id: "claim-user-primary-stack",
        subject: "user",
        field: "primary_stack",
        value: "Python/Rust",
        scope: "global",
        status: "current",
        confidence: 0.92,
        rationale: "A newer correction note names Python/Rust as current.",
        evidence: [
          {
            sourcePath: "extensions/ad_hoc/notes/profile.md",
            startLine: 1,
            endLine: 3,
            summary: "Python/Rust correction.",
          },
        ],
      },
    ],
    staleClaims: [
      {
        id: "claim-old-stack",
        subject: "user",
        field: "primary_stack",
        value: "Java/Spring Boot",
        scope: "global",
        status: "stale",
        confidence: 0.78,
        rationale: "Older summary conflicts with newer correction.",
        evidence: [
          {
            sourcePath: "memory_summary.md",
            startLine: 20,
            endLine: 24,
            summary: "Older stack note.",
          },
        ],
      },
    ],
    conflicts: [
      {
        id: "conflict-primary-stack",
        title: "Primary stack mismatch",
        detail: "Older Java/Spring Boot text conflicts with newer Python/Rust evidence.",
        confidence: 0.84,
        claimIds: ["claim-user-primary-stack", "claim-old-stack"],
        evidence: [
          {
            sourcePath: "memory_summary.md",
            startLine: 20,
            endLine: 24,
            summary: "Older stack note.",
          },
        ],
      },
    ],
    uncertainClaims: [
      {
        id: "claim-beebotos-active",
        subject: "project:beebotos",
        field: "activity",
        value: "Active project is uncertain",
        scope: "project",
        status: "uncertain",
        confidence: 0.55,
        rationale: "Recent activity exists, but durable status needs confirmation.",
        evidence: [
          {
            sourcePath: "extensions/chronicle/resources/activity.md",
            startLine: 1,
            endLine: 20,
            summary: "Recent BeeBotOS work.",
          },
        ],
      },
    ],
    suggestedCorrections: [
      {
        id: "correction-primary-stack",
        title: "Clarify current primary stack",
        reason: "Older profile text may still imply Java/Spring Boot.",
        content: "Memory update request:\n\n- The user's current primary technical stack is Python/Rust.\n",
        confidence: 0.81,
        affectedClaimIds: ["claim-user-primary-stack", "claim-old-stack"],
        evidence: [
          {
            sourcePath: "extensions/ad_hoc/notes/profile.md",
            startLine: 1,
            endLine: 3,
            summary: "Python/Rust correction.",
          },
        ],
      },
    ],
    metadata: {
      memoryRoot: "/Users/qsh/.codex/memories",
      inputEntries: 4,
      model: "codex-exec-fixture",
    },
  },
};

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App pane resizing", () => {
  beforeEach(() => {
    invokeMock.mockResolvedValue(scanResult);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1400 });
    HTMLElement.prototype.setPointerCapture = vi.fn();
  });

  afterEach(() => {
    cleanup();
    invokeMock.mockReset();
    revealItemInDirMock.mockReset();
  });

  it("wires pointer dragging into the app grid columns", async () => {
    const { container, getAllByRole } = renderApp();
    const shell = container.querySelector(".app-shell") as HTMLElement;
    const [leftResizer, rightResizer] = getAllByRole("separator");

    expect(shell.style.gridTemplateColumns).toBe("240px 8px minmax(420px, 1fr) 8px 430px");

    fireEvent.pointerDown(leftResizer, { clientX: 240, pointerId: 1 });
    fireEvent.pointerMove(leftResizer, { clientX: 304, pointerId: 1 });
    fireEvent.pointerUp(leftResizer, { pointerId: 1 });

    await waitFor(() =>
      expect(shell.style.gridTemplateColumns).toBe("304px 8px minmax(420px, 1fr) 8px 430px"),
    );

    fireEvent.pointerDown(rightResizer, { clientX: 960, pointerId: 2 });
    fireEvent.pointerMove(rightResizer, { clientX: 888, pointerId: 2 });
    fireEvent.pointerUp(rightResizer, { pointerId: 2 });

    await waitFor(() =>
      expect(shell.style.gridTemplateColumns).toBe("304px 8px minmax(420px, 1fr) 8px 502px"),
    );
  });
});

describe("App memory clarity", () => {
  beforeEach(() => {
    invokeMock.mockImplementation((command: string) => {
      if (command === "scan_memories") {
        return Promise.resolve(clarityScanResult);
      }
      if (command === "get_source_excerpt") {
        return Promise.resolve("The user's current technical stack is Python/Rust.");
      }
      return Promise.reject(new Error(`unexpected command: ${command}`));
    });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1400 });
  });

  afterEach(() => {
    cleanup();
    invokeMock.mockReset();
    revealItemInDirMock.mockReset();
  });

  it("separates current profile from activity evidence", async () => {
    const { getByRole, queryByText } = renderApp();

    await waitFor(() =>
      expect(getByRole("heading", { name: "Current Profile" })).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(getByRole("button", { name: /Profile\s*2/ })).toBeInTheDocument(),
    );
    expect(getByRole("button", { name: /Activity Log\s*1/ })).toBeInTheDocument();
    expect(queryByText("Fixture mode: demo memory only")).not.toBeInTheDocument();
    expect(queryByText("No audit report yet")).not.toBeInTheDocument();
    expect(queryByText("10-minute activity")).not.toBeInTheDocument();
    expect(queryByText("The user's current profile explicitly prefers Python/Rust.")).toBeInTheDocument();

    fireEvent.click(getByRole("button", { name: /Activity Log/ }));

    await waitFor(() =>
      expect(getByRole("heading", { name: "Activity Log" })).toBeInTheDocument(),
    );
    expect(queryByText("10-minute activity")).toBeInTheDocument();
  });

  it("keeps profile correction notes visible in current profile and corrections", async () => {
    const { getByRole, queryByText } = renderApp();

    await waitFor(() =>
      expect(queryByText("The user's current profile explicitly prefers Python/Rust.")).toBeInTheDocument(),
    );

    fireEvent.click(getByRole("button", { name: /Corrections\s*1/ }));

    await waitFor(() =>
      expect(getByRole("heading", { name: "Corrections" })).toBeInTheDocument(),
    );
    expect(queryByText("The user's current profile explicitly prefers Python/Rust.")).toBeInTheDocument();
  });

  it("opens the selected source location", async () => {
    revealItemInDirMock.mockResolvedValue(undefined);
    const { findByText, getByRole } = renderApp();

    fireEvent.click(await findByText("The user's current technical stack is Python/Rust."));
    fireEvent.click(getByRole("button", { name: /Open source/ }));

    await waitFor(() =>
      expect(revealItemInDirMock).toHaveBeenCalledWith("/Users/qsh/.codex/memories/MEMORY.md"),
    );
  });

  it("shows source excerpt errors in the inspector", async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === "scan_memories") {
        return Promise.resolve(clarityScanResult);
      }
      if (command === "get_source_excerpt") {
        return Promise.reject(new Error("source read failed"));
      }
      return Promise.reject(new Error(`unexpected command: ${command}`));
    });
    const { findByText } = renderApp();

    fireEvent.click(await findByText("The user's current technical stack is Python/Rust."));

    expect(await findByText("Error: source read failed")).toBeInTheDocument();
  });

  it("searches entries globally from the active topic", async () => {
    const { findByPlaceholderText, findByText, getByText } = renderApp();

    fireEvent.change(await findByPlaceholderText("Search memory..."), {
      target: { value: "BeeBotOS" },
    });

    expect(await findByText("Search Results")).toBeInTheDocument();
    expect(getByText("1 matching memory entries")).toBeInTheDocument();
    expect(await findByText("10-minute activity")).toBeInTheDocument();
    expect(getByText("Activity")).toBeInTheDocument();
  });

  it("filters sources by search text", async () => {
    const { findByPlaceholderText, findByText, getByRole, queryByText } = renderApp();

    fireEvent.click(getByRole("button", { name: /Sources/ }));
    fireEvent.change(await findByPlaceholderText("Search memory..."), {
      target: { value: "MEMORY.md" },
    });

    await waitFor(() => expect(queryByText("MEMORY.md")).toBeInTheDocument());
    expect(await findByText("1 matching sources")).toBeInTheDocument();
    expect(queryByText("extensions/chronicle/resources/example.md")).not.toBeInTheDocument();

    fireEvent.change(await findByPlaceholderText("Search memory..."), {
      target: { value: "not-a-source" },
    });
    expect(await findByText("0 matching sources")).toBeInTheDocument();
    expect(await findByText("No sources match this view.")).toBeInTheDocument();
  });

  it("opens a source card location", async () => {
    revealItemInDirMock.mockResolvedValue(undefined);
    const { findByRole, getByRole } = renderApp();

    fireEvent.click(getByRole("button", { name: /Sources/ }));
    fireEvent.click(await findByRole("button", { name: "Open source MEMORY.md" }));

    await waitFor(() =>
      expect(revealItemInDirMock).toHaveBeenCalledWith("/Users/qsh/.codex/memories/MEMORY.md"),
    );
  });

  it("applies and resets the memory root override", async () => {
    const { findByLabelText, findByPlaceholderText, findByText, getByRole } = renderApp();
    const scanCalls = () => invokeMock.mock.calls.filter(([command]) => command === "scan_memories");
    const lastScanCall = () => {
      const calls = scanCalls();
      return calls[calls.length - 1];
    };

    await findByText("/Users/qsh/.codex/memories");
    expect(lastScanCall()).toEqual(["scan_memories", { rootOverride: null }]);
    const searchInput = await findByPlaceholderText("Search memory...");
    fireEvent.change(searchInput, {
      target: { value: "BeeBotOS" },
    });

    fireEvent.change(await findByLabelText("Memory root"), {
      target: { value: "/tmp/amm-fixture-memory" },
    });
    fireEvent.click(getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(searchInput).toHaveValue(""));
    await waitFor(() =>
      expect(lastScanCall()).toEqual([
        "scan_memories",
        {
          rootOverride: "/tmp/amm-fixture-memory",
        },
      ]),
    );

    fireEvent.click(getByRole("button", { name: "Default" }));

    await waitFor(() =>
      expect(lastScanCall()).toEqual([
        "scan_memories",
        {
          rootOverride: null,
        },
      ]),
    );
  });
});

describe("App Codex audit", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1400 });
  });

  afterEach(() => {
    cleanup();
    invokeMock.mockReset();
    revealItemInDirMock.mockReset();
  });

  it("runs a mocked audit and renders every report section", async () => {
    revealItemInDirMock.mockResolvedValue(undefined);
    invokeMock.mockImplementation((command: string) => {
      if (command === "scan_memories") {
        return Promise.resolve(clarityScanResult);
      }
      if (command === "run_codex_audit") {
        return Promise.resolve(auditRun);
      }
      if (command === "draft_correction_from_content") {
        return Promise.resolve({
          slug: "correction-primary-stack",
          content: auditRun.report.suggestedCorrections[0].content,
          targetPath:
            "/Users/qsh/.codex/memories/extensions/ad_hoc/notes/20260609-correction-primary-stack.md",
        });
      }
      if (command === "write_correction") {
        return Promise.resolve(
          "/Users/qsh/.codex/memories/extensions/ad_hoc/notes/20260609-correction-primary-stack.md",
        );
      }
      return Promise.reject(new Error(`unexpected command: ${command}`));
    });

    const {
      findByLabelText,
      findByText,
      getAllByRole,
      getAllByText,
      getByRole,
      getByText,
      queryByPlaceholderText,
    } = renderApp();

    await findByText("Stable profile");
    fireEvent.click(getByRole("button", { name: "Audit" }));
    await waitFor(() =>
      expect(getByRole("heading", { name: "Codex Audit" })).toBeInTheDocument(),
    );
    expect(queryByPlaceholderText("Search memory...")).not.toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: /Run Codex Audit/ }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("run_codex_audit", {
        rootOverride: null,
        mode: "curated",
      }),
    );
    await findByText("Primary stack mismatch");

    expect(getByText("Python/Rust")).toBeInTheDocument();
    expect(getByText("A newer correction note names Python/Rust as current.")).toBeInTheDocument();
    expect(getByText("Java/Spring Boot")).toBeInTheDocument();
    expect(getByText("Active project is uncertain")).toBeInTheDocument();
    expect(getByText("Clarify current primary stack")).toBeInTheDocument();
    expect(getAllByText("memory_summary.md L20-24").length).toBeGreaterThan(0);

    fireEvent.click(getAllByRole("button", { name: "memory_summary.md L20-24" })[0]);
    await waitFor(() =>
      expect(revealItemInDirMock).toHaveBeenCalledWith("/Users/qsh/.codex/memories/memory_summary.md"),
    );

    fireEvent.click(getByRole("button", { name: /Draft correction/ }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("draft_correction_from_content", {
        rootOverride: null,
        slug: "correction-primary-stack",
        content: auditRun.report.suggestedCorrections[0].content,
      }),
    );
    expect(getByRole("heading", { name: "Correction note" })).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalledWith("write_correction", expect.anything());

    const editedCorrectionContent =
      "Memory update request:\n\n- Edited correction content before write.\n";
    fireEvent.change(await findByLabelText("Content"), {
      target: { value: editedCorrectionContent },
    });
    fireEvent.click(getByRole("button", { name: "Write correction note" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("write_correction", {
        rootOverride: null,
        draft: {
          slug: "correction-primary-stack",
          content: editedCorrectionContent,
          targetPath:
            "/Users/qsh/.codex/memories/extensions/ad_hoc/notes/20260609-correction-primary-stack.md",
        },
      }),
    );
    expect(
      await findByText(
        "Correction note written: /Users/qsh/.codex/memories/extensions/ad_hoc/notes/20260609-correction-primary-stack.md",
      ),
    ).toBeInTheDocument();
  });

  it("clears stale audit reports when switching audit mode", async () => {
    invokeMock.mockImplementation((command: string, args?: { mode?: string }) => {
      if (command === "scan_memories") {
        return Promise.resolve(clarityScanResult);
      }
      if (command === "run_codex_audit") {
        return Promise.resolve({
          ...auditRun,
          report: {
            ...auditRun.report,
            mode: args?.mode ?? "curated",
          },
        });
      }
      return Promise.reject(new Error(`unexpected command: ${command}`));
    });

    const { findByText, getByRole, queryByText } = renderApp();

    await findByText("Stable profile");
    fireEvent.click(getByRole("button", { name: "Audit" }));
    fireEvent.click(getByRole("button", { name: /Run Codex Audit/ }));
    expect(await findByText("Primary stack mismatch")).toBeInTheDocument();

    fireEvent.change(getByRole("combobox", { name: "Audit mode" }), {
      target: { value: "full" },
    });

    expect(queryByText("Primary stack mismatch")).not.toBeInTheDocument();
    expect(getByRole("heading", { name: "No audit report yet" })).toBeInTheDocument();

    fireEvent.click(getByRole("button", { name: /Run Codex Audit/ }));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("run_codex_audit", {
        rootOverride: null,
        mode: "full",
      }),
    );
  });

  it("ignores audit results from an old mode after switching", async () => {
    let resolveAudit: (run: CodexAuditRun) => void = () => {};
    const pendingAudit = new Promise<CodexAuditRun>((resolve) => {
      resolveAudit = resolve;
    });
    invokeMock.mockImplementation((command: string) => {
      if (command === "scan_memories") {
        return Promise.resolve(clarityScanResult);
      }
      if (command === "run_codex_audit") {
        return pendingAudit;
      }
      return Promise.reject(new Error(`unexpected command: ${command}`));
    });

    const { findByText, getByRole, queryByText } = renderApp();

    await findByText("Stable profile");
    fireEvent.click(getByRole("button", { name: "Audit" }));
    fireEvent.click(getByRole("button", { name: /Run Codex Audit/ }));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("run_codex_audit", {
        rootOverride: null,
        mode: "curated",
      }),
    );

    fireEvent.change(getByRole("combobox", { name: "Audit mode" }), {
      target: { value: "full" },
    });
    resolveAudit(auditRun);
    await pendingAudit;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(queryByText("Primary stack mismatch")).not.toBeInTheDocument();
    expect(getByRole("heading", { name: "No audit report yet" })).toBeInTheDocument();
  });

  it("shows audit errors without writing corrections", async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === "scan_memories") {
        return Promise.resolve(clarityScanResult);
      }
      if (command === "run_codex_audit") {
        return Promise.reject(new Error("codex exec failed"));
      }
      return Promise.reject(new Error(`unexpected command: ${command}`));
    });

    const { findByText, getAllByText, getByRole } = renderApp();

    await findByText("Stable profile");
    fireEvent.click(getByRole("button", { name: "Audit" }));
    await waitFor(() =>
      expect(getByRole("heading", { name: "Codex Audit" })).toBeInTheDocument(),
    );
    fireEvent.click(getByRole("button", { name: /Run Codex Audit/ }));

    await waitFor(() => expect(getAllByText("Error: codex exec failed").length).toBeGreaterThan(0));
    expect(invokeMock).not.toHaveBeenCalledWith("write_correction", expect.anything());
  });
});
