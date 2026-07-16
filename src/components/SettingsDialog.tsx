import { RefreshCw, Settings2, X } from "lucide-react";
import { appUpdateProgress } from "../lib/appUpdate";
import type { AppUpdaterController } from "../hooks/useAppUpdater";
import type { UiText } from "../lib/i18n";

export function SettingsDialog({
  controller,
  nativeEnabled,
  onClose,
  uiText,
}: {
  controller: AppUpdaterController;
  nativeEnabled: boolean;
  onClose: () => void;
  uiText: UiText;
}) {
  const { autoCheck, checkForUpdates, installUpdate, setAutoCheck, state } = controller;
  const progress = appUpdateProgress(state);
  const busy =
    state.phase === "checking" ||
    state.phase === "downloading" ||
    state.phase === "installing";
  const canInstall =
    Boolean(state.update) && (state.phase === "available" || state.phase === "error");

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !busy) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-labelledby="settings-dialog-title"
        aria-modal="true"
        className="dialog settings-dialog"
        role="dialog"
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">{uiText.settings.eyebrow}</p>
            <h2 id="settings-dialog-title">{uiText.settings.title}</h2>
            <p>{uiText.settings.subtitle}</p>
          </div>
          <button
            aria-label={uiText.settings.close}
            className="icon-button"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>

        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-section-icon">
              <Settings2 aria-hidden="true" size={18} />
            </span>
            <div>
              <h3>{uiText.settings.appUpdate}</h3>
              <p>{uiText.settings.appUpdateHint}</p>
            </div>
          </div>

          <div className="settings-version-row">
            <span>{uiText.settings.currentVersion}</span>
            <strong>{state.currentVersion ?? uiText.settings.unknownVersion}</strong>
          </div>

          <label className="settings-toggle">
            <span>
              <strong>{uiText.settings.autoCheck}</strong>
              <small>{uiText.settings.autoCheckHint}</small>
            </span>
            <input
              checked={autoCheck}
              disabled={!nativeEnabled}
              onChange={(event) => setAutoCheck(event.target.checked)}
              type="checkbox"
            />
          </label>

          {!nativeEnabled ? (
            <p className="settings-status muted">{uiText.settings.desktopOnly}</p>
          ) : (
            <>
              {state.phase === "checking" && (
                <p className="settings-status">{uiText.settings.checking}</p>
              )}
              {state.phase === "upToDate" && (
                <p className="settings-status success">{uiText.settings.upToDate}</p>
              )}
              {state.update && (
                <div className="settings-update-card">
                  <strong>{uiText.settings.available(state.update.version)}</strong>
                  {state.update.body && (
                    <p className="settings-release-notes">{state.update.body}</p>
                  )}
                </div>
              )}
              {state.phase === "downloading" && (
                <div className="settings-progress">
                  <span>{uiText.settings.downloading(progress)}</span>
                  <progress max={100} value={progress ?? undefined} />
                </div>
              )}
              {state.phase === "installing" && (
                <p className="settings-status">{uiText.settings.installing}</p>
              )}
              {state.phase === "installed" && (
                <p className="settings-status success">{uiText.settings.installed}</p>
              )}
              {state.error && (
                <div className="settings-error" role="alert">
                  <strong>{uiText.settings.error}</strong>
                  <span>{state.error}</span>
                </div>
              )}

              <div className="settings-actions">
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void checkForUpdates()}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" size={15} />
                  {state.phase === "checking" ? uiText.settings.checking : uiText.settings.check}
                </button>
                {canInstall && (
                  <button
                    className="primary-button"
                    onClick={() => void installUpdate()}
                    type="button"
                  >
                    {uiText.settings.install}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </section>
    </div>
  );
}
