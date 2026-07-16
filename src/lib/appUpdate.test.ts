// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  appUpdateReducer,
  autoCheckUpdatesStorageKey,
  initialAppUpdateState,
  readAutoCheckUpdates,
  writeAutoCheckUpdates,
} from "./appUpdate";

describe("app update state", () => {
  it("tracks release availability without starting a download", () => {
    const available = appUpdateReducer(initialAppUpdateState, {
      type: "stateReceived",
      state: {
        supported: true,
        phase: "available",
        currentVersion: "0.2.0",
        update: { currentVersion: "0.2.0", version: "0.2.1", body: "Fixes" },
        progress: null,
        error: null,
      },
    });
    expect(available.phase).toBe("available");
    expect(available.update?.version).toBe("0.2.1");
  });

  it("keeps update metadata after a release check failure", () => {
    const available = appUpdateReducer(initialAppUpdateState, {
      type: "stateReceived",
      state: {
        supported: true,
        phase: "available",
        currentVersion: "0.2.0",
        update: { currentVersion: "0.2.0", version: "0.2.1" },
        progress: null,
        error: null,
      },
    });
    const failed = appUpdateReducer(available, { type: "failed", error: "network error" });
    expect(failed.phase).toBe("error");
    expect(failed.update?.version).toBe("0.2.1");
  });

  it("tracks download and install intent before native snapshots arrive", () => {
    const downloading = appUpdateReducer(initialAppUpdateState, { type: "downloadStarted" });
    expect(downloading.phase).toBe("downloading");
    expect(downloading.progress).toBe(0);
    expect(appUpdateReducer(downloading, { type: "installStarted" }).phase).toBe("installing");
  });

  it("defaults startup checks to enabled and persists an explicit opt-out", () => {
    window.localStorage.clear();
    expect(readAutoCheckUpdates()).toBe(true);
    writeAutoCheckUpdates(false);
    expect(window.localStorage.getItem(autoCheckUpdatesStorageKey)).toBe("false");
    expect(readAutoCheckUpdates()).toBe(false);
  });
});
