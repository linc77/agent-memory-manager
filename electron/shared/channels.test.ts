import { describe, expect, it } from "vitest";
import { channels } from "./channels";

describe("desktop updater IPC contract", () => {
  it("exposes only fixed updater operations", () => {
    expect({
      get: channels.getAppUpdateState,
      check: channels.checkAppUpdate,
      download: channels.downloadAppUpdate,
      install: channels.installAppUpdate,
    }).toEqual({
      get: "app:get-update-state",
      check: "app:check-update",
      download: "app:download-update",
      install: "app:install-update",
    });
    expect(Object.values(channels)).not.toContain("app:open-release-page");
  });
});
