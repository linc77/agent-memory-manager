// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  appUpdateProgress,
  appUpdateReducer,
  autoCheckUpdatesStorageKey,
  initialAppUpdateState,
  readAutoCheckUpdates,
  writeAutoCheckUpdates,
} from "./appUpdate";

describe("app update state", () => {
  it("tracks an available update through download and installation", () => {
    const available = appUpdateReducer(initialAppUpdateState, {
      type: "updateAvailable",
      update: { currentVersion: "0.1.2", version: "0.1.3", body: "Fixes" },
    });
    const started = appUpdateReducer(available, {
      type: "downloadStarted",
      contentLength: 200,
    });
    const halfway = appUpdateReducer(started, { type: "downloadProgress", chunkLength: 100 });

    expect(available.phase).toBe("available");
    expect(appUpdateProgress(halfway)).toBe(50);
    expect(appUpdateReducer(halfway, { type: "downloadFinished" }).phase).toBe("installing");
    expect(appUpdateReducer(halfway, { type: "installed" }).phase).toBe("installed");
  });

  it("keeps update metadata available after an install failure so the user can retry", () => {
    const available = appUpdateReducer(initialAppUpdateState, {
      type: "updateAvailable",
      update: { currentVersion: "0.1.2", version: "0.1.3" },
    });
    const failed = appUpdateReducer(available, { type: "failed", error: "network error" });

    expect(failed.phase).toBe("error");
    expect(failed.update?.version).toBe("0.1.3");
    expect(failed.error).toBe("network error");
  });

  it("defaults startup checks to enabled and persists an explicit opt-out", () => {
    window.localStorage.clear();
    expect(readAutoCheckUpdates()).toBe(true);

    writeAutoCheckUpdates(false);
    expect(window.localStorage.getItem(autoCheckUpdatesStorageKey)).toBe("false");
    expect(readAutoCheckUpdates()).toBe(false);
  });
});
