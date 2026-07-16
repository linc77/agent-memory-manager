import { getVersion } from "@tauri-apps/api/app";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  appUpdateReducer,
  initialAppUpdateState,
  readAutoCheckUpdates,
  writeAutoCheckUpdates,
  type AppUpdateInfo,
} from "../lib/appUpdate";

const CHECK_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 5 * 60_000;

export function useAppUpdater({ enabled }: { enabled: boolean }) {
  const [state, dispatch] = useReducer(appUpdateReducer, initialAppUpdateState);
  const [autoCheck, setAutoCheckState] = useState(() => readAutoCheckUpdates());
  const pendingUpdateRef = useRef<Update | null>(null);
  const checkSequenceRef = useRef(0);
  const startupCheckStartedRef = useRef(false);

  const closePendingUpdate = useCallback(async () => {
    const pendingUpdate = pendingUpdateRef.current;
    pendingUpdateRef.current = null;
    if (pendingUpdate) {
      await pendingUpdate.close().catch(() => undefined);
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const sequence = ++checkSequenceRef.current;
    dispatch({ type: "checkStarted" });
    await closePendingUpdate();

    try {
      const update = await check({ timeout: CHECK_TIMEOUT_MS });
      if (sequence !== checkSequenceRef.current) {
        await update?.close().catch(() => undefined);
        return;
      }
      if (!update) {
        dispatch({ type: "upToDate" });
        return;
      }

      pendingUpdateRef.current = update;
      const metadata: AppUpdateInfo = {
        currentVersion: update.currentVersion,
        version: update.version,
        date: update.date,
        body: update.body,
      };
      dispatch({ type: "updateAvailable", update: metadata });
    } catch (error) {
      if (sequence === checkSequenceRef.current) {
        dispatch({ type: "failed", error: String(error) });
      }
    }
  }, [closePendingUpdate, enabled]);

  const installUpdate = useCallback(async () => {
    const update = pendingUpdateRef.current;
    if (!update) {
      dispatch({ type: "failed", error: "No pending update is available." });
      return;
    }

    try {
      await update.downloadAndInstall(
        (event: DownloadEvent) => {
          switch (event.event) {
            case "Started":
              dispatch({ type: "downloadStarted", contentLength: event.data.contentLength });
              break;
            case "Progress":
              dispatch({ type: "downloadProgress", chunkLength: event.data.chunkLength });
              break;
            case "Finished":
              dispatch({ type: "downloadFinished" });
              break;
          }
        },
        { timeout: DOWNLOAD_TIMEOUT_MS },
      );
      dispatch({ type: "installed" });
      await relaunch();
    } catch (error) {
      dispatch({ type: "failed", error: String(error) });
    }
  }, []);

  const setAutoCheck = useCallback((nextValue: boolean) => {
    setAutoCheckState(nextValue);
    writeAutoCheckUpdates(nextValue);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void getVersion()
      .then((version) => dispatch({ type: "currentVersionLoaded", version }))
      .catch((error) => dispatch({ type: "failed", error: String(error) }));
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !autoCheck || startupCheckStartedRef.current) {
      return;
    }
    startupCheckStartedRef.current = true;
    void checkForUpdates();
  }, [autoCheck, checkForUpdates, enabled]);

  useEffect(
    () => () => {
      checkSequenceRef.current += 1;
      void closePendingUpdate();
    },
    [closePendingUpdate],
  );

  return {
    state,
    autoCheck,
    checkForUpdates,
    installUpdate,
    setAutoCheck,
  };
}

export type AppUpdaterController = ReturnType<typeof useAppUpdater>;
