// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { autoCheckUpdatesStorageKey } from "../lib/appUpdate";
import { useAppUpdater } from "./useAppUpdater";

const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  getVersion: vi.fn(),
  relaunch: vi.fn(),
}));

vi.mock("@tauri-apps/api/app", () => ({ getVersion: mocks.getVersion }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: mocks.relaunch }));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: mocks.check }));

describe("useAppUpdater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem(autoCheckUpdatesStorageKey, "false");
    mocks.getVersion.mockResolvedValue("0.1.2");
    mocks.relaunch.mockResolvedValue(undefined);
  });

  it("checks, downloads, installs, and relaunches only after explicit installation", async () => {
    const update = {
      body: "Update notes",
      close: vi.fn().mockResolvedValue(undefined),
      currentVersion: "0.1.2",
      date: "2026-07-16T00:00:00Z",
      downloadAndInstall: vi.fn().mockImplementation(async (onEvent) => {
        onEvent({ event: "Started", data: { contentLength: 100 } });
        onEvent({ event: "Progress", data: { chunkLength: 100 } });
        onEvent({ event: "Finished" });
      }),
      version: "0.1.3",
    };
    mocks.check.mockResolvedValue(update);
    const { result } = renderHook(() => useAppUpdater({ enabled: true }));

    await waitFor(() => expect(result.current.state.currentVersion).toBe("0.1.2"));
    await act(() => result.current.checkForUpdates());

    expect(result.current.state.phase).toBe("available");
    expect(result.current.state.update?.version).toBe("0.1.3");
    expect(update.downloadAndInstall).not.toHaveBeenCalled();

    await act(() => result.current.installUpdate());

    expect(update.downloadAndInstall).toHaveBeenCalledOnce();
    expect(mocks.relaunch).toHaveBeenCalledOnce();
    expect(result.current.state.phase).toBe("installed");
  });
});
