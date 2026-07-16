export const autoCheckUpdatesStorageKey = "agent-memory-manager.auto-check-updates";

export type AppUpdatePhase =
  | "idle"
  | "checking"
  | "upToDate"
  | "available"
  | "downloading"
  | "installing"
  | "installed"
  | "error";

export interface AppUpdateInfo {
  currentVersion: string;
  version: string;
  date?: string;
  body?: string;
}

export interface AppUpdateState {
  phase: AppUpdatePhase;
  currentVersion: string | null;
  update: AppUpdateInfo | null;
  downloadedBytes: number;
  contentLength: number | null;
  error: string | null;
}

export type AppUpdateAction =
  | { type: "currentVersionLoaded"; version: string }
  | { type: "checkStarted" }
  | { type: "upToDate" }
  | { type: "updateAvailable"; update: AppUpdateInfo }
  | { type: "downloadStarted"; contentLength?: number }
  | { type: "downloadProgress"; chunkLength: number }
  | { type: "downloadFinished" }
  | { type: "installed" }
  | { type: "failed"; error: string };

export const initialAppUpdateState: AppUpdateState = {
  phase: "idle",
  currentVersion: null,
  update: null,
  downloadedBytes: 0,
  contentLength: null,
  error: null,
};

export function appUpdateReducer(
  state: AppUpdateState,
  action: AppUpdateAction,
): AppUpdateState {
  switch (action.type) {
    case "currentVersionLoaded":
      return { ...state, currentVersion: action.version };
    case "checkStarted":
      return {
        ...state,
        phase: "checking",
        update: null,
        downloadedBytes: 0,
        contentLength: null,
        error: null,
      };
    case "upToDate":
      return { ...state, phase: "upToDate", update: null, error: null };
    case "updateAvailable":
      return {
        ...state,
        phase: "available",
        currentVersion: action.update.currentVersion,
        update: action.update,
        downloadedBytes: 0,
        contentLength: null,
        error: null,
      };
    case "downloadStarted":
      return {
        ...state,
        phase: "downloading",
        downloadedBytes: 0,
        contentLength: action.contentLength ?? null,
        error: null,
      };
    case "downloadProgress":
      return {
        ...state,
        phase: "downloading",
        downloadedBytes: state.downloadedBytes + action.chunkLength,
      };
    case "downloadFinished":
      return { ...state, phase: "installing" };
    case "installed":
      return { ...state, phase: "installed", error: null };
    case "failed":
      return { ...state, phase: "error", error: action.error };
  }
}

export function appUpdateProgress(state: AppUpdateState) {
  if (!state.contentLength || state.contentLength <= 0) {
    return null;
  }
  return Math.min(100, Math.round((state.downloadedBytes / state.contentLength) * 100));
}

export function readAutoCheckUpdates(storage: Storage = window.localStorage) {
  try {
    return storage.getItem(autoCheckUpdatesStorageKey) !== "false";
  } catch {
    return true;
  }
}

export function writeAutoCheckUpdates(
  enabled: boolean,
  storage: Storage = window.localStorage,
) {
  try {
    storage.setItem(autoCheckUpdatesStorageKey, String(enabled));
  } catch {
    // Runtime state still updates when persistent storage is unavailable.
  }
}
