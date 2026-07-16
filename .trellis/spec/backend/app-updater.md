# Application Updater Contract

## Scenario: Signed desktop updates from GitHub Releases

### 1. Scope / Trigger

Read this spec when changing any application version, updater UI or state,
Tauri updater/process plugin, signing key, supported desktop target, release
workflow, or `latest.json` validation.

The updater is application-global. It must never be keyed by or reset when the
user switches Codex, Claude Code, or Hermes.

### 2. Signatures

Frontend controller:

```ts
useAppUpdater({ enabled: boolean }): {
  state: AppUpdateState;
  autoCheck: boolean;
  checkForUpdates(): Promise<void>;
  installUpdate(): Promise<void>;
  setAutoCheck(enabled: boolean): void;
}
```

Tauri JavaScript boundary:

```ts
check({ timeout: 15_000 }): Promise<Update | null>
update.downloadAndInstall(onEvent, { timeout: 300_000 }): Promise<void>
relaunch(): Promise<void>
```

Release metadata gate:

```bash
pnpm updater:verify <latest.json path or HTTPS URL>
```

### 3. Contracts

Configuration:

- `bundle.createUpdaterArtifacts` is `true`.
- `plugins.updater.pubkey` contains the public key value, never a private key or
  a filesystem path.
- `plugins.updater.endpoints` contains the public HTTPS GitHub Release
  `latest.json` URL.
- The main capability grants `updater:default` and
  `process:allow-restart`; do not grant unrelated process commands.

Environment keys used only during signed builds:

- `TAURI_SIGNING_PRIVATE_KEY`: required private key content or local path.
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: required password for the encrypted
  project key.

GitHub stores both values as repository secrets. The owner's local recovery
copy is outside the repository under `~/.tauri`, and its password is in macOS
Keychain. Never echo, commit, or add either secret to a command literal.

`latest.json` must contain a SemVer `version` and these platform entries:

```json
{
  "platforms": {
    "darwin-aarch64": { "url": "https://...", "signature": "..." },
    "windows-x86_64": { "url": "https://...", "signature": "..." }
  }
}
```

The startup preference key is
`agent-memory-manager.auto-check-updates`. Absence means enabled. Startup checks
only call `check()`; downloads require an explicit user action.

### 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Browser or fixture mode | Do not call native updater APIs; show desktop-only state. |
| Endpoint unavailable or malformed | Enter retryable `error`; leave other workspaces usable. |
| No higher SemVer exists | Enter `upToDate`; do not retain an update resource. |
| Update exists | Retain one `Update` resource and show version/notes. |
| A new check starts | Close the previous resource before requesting another. |
| Download has content length | Show bounded percentage, clamped to 100. |
| Download has no content length | Show indeterminate progress. |
| Signature does not match | Installation fails visibly; never bypass verification. |
| `latest.json` misses either target | Release verification fails; keep the release draft. |
| macOS build uses only `dmg` | Treat the updater build as failed even if the DMG succeeds. |

### 5. Good / Base / Bad Cases

- Good: a newer signed Release produces an availability marker; the user opens
  Settings, confirms installation, sees progress, and the app relaunches.
- Base: no newer Release exists; Settings shows the installed version and
  `upToDate` without downloading anything.
- Bad: a network or signature error is shown as retryable while Memory, Skills,
  MCP, and Agent configuration continue working.

### 6. Tests Required

- Reducer: availability, byte accumulation, progress calculation, install
  phase, retained metadata after a retryable failure.
- Preference: missing key defaults to true; explicit false round-trips.
- Hook: `check()` does not download; explicit `installUpdate()` calls
  `downloadAndInstall()` and `relaunch()`.
- Fixture UI: Settings opens, shows desktop-only state, and does not invoke
  native APIs.
- Full gate: `pnpm verify`.
- Signed artifact: build macOS ARM64 with `--bundles app,dmg` and assert both
  `Agent Memory Manager.app.tar.gz` and its `.sig` exist.
- Release gate: run `pnpm updater:verify` against the draft `latest.json` before
  publishing.

### 7. Wrong vs Correct

#### Wrong

```bash
pnpm tauri build --target aarch64-apple-darwin --bundles dmg
```

This creates a usable first-install DMG but Tauri warns that no updater-enabled
target was built and emits no updater archive or signature.

#### Correct

```bash
pnpm tauri build --target aarch64-apple-darwin --bundles app,dmg
```

This keeps the DMG and explicitly produces the `.app.tar.gz` updater artifact
plus `.app.tar.gz.sig`. Windows must build `nsis,msi`, with NSIS preferred in
updater metadata when both formats are present.
