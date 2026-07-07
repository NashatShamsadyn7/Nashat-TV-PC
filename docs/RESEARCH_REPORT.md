# Nashat TV — Research Report

App: **Nashat TV** (Desktop, Electron 33 + React 18 + TypeScript 5 + Tailwind + Zustand + Firebase 11), v1.3.8.
This report answers six questions: the full feature inventory, all solvable errors, new feature ideas,
why fullscreen was not working, whether the design can be made more friendly, and why the streaming
server kept changing while it was still working.

---

## 1) Full current feature inventory

### Pages / routes (`src/renderer/src/router.tsx` — hash router, all lazy-loaded)
- **Home** — personalized landing page.
- **Live TV** — channel grid with categories, EPG data, stream extraction.
- **Multi-Live** — watch several channels at once in 2×2, 1+3, or 3×1 grids (`multiLiveLayout` setting).
- **Movies**, **Series**, **Arabic content** — TMDB-driven catalogs.
- **Actors** + Actor detail pages.
- **Details** — media detail page with trailer iframe.
- **Search** — fuzzy search powered by fuse.js (`/`, Ctrl+K shortcuts).
- **Library** — watchlist, favorites, continue-watching.
- **Stats** — usage statistics.
- **Settings** — themes, subtitle style, playback and UI preferences.
- **Profiles**, **Profile** — user profile management.
- **Watch Together** — synchronized rooms (admin play/pause/seek sync, chat overlay, resync).
- **Friends** (+ onboarding modal), **Chats** — DMs.

### Feature slices (`src/renderer/src/features/`)
arabic · auth (Google sign-in via loopback OAuth, `src/main/ipc/auth.ts`) · continueWatching · dms ·
downloads · epg · favorites · friends · library · livetv · notes · player (server registry + health
pings + per-user votes + last-working memory) · recommendations · search · stats ·
themes (6 dark themes: dark / midnight / oled / crimson / forest / sunset) · tmdb ·
voiceCall (WebRTC) · watchTogether.

### Player features (`src/renderer/src/components/player/`)
- HLS playback (hls.js) with **quality menu**, **speed menu**, live badge, buffered bar.
- **Subtitles**: drag-and-drop SRT → VTT conversion, styling via `::cue` from `settingsStore.subtitleStyle`.
- **Native PiP** + **detached floating PiP window** (`src/main/ipc/pip.ts`, Ctrl+Shift+P).
- Keyboard shortcuts: Space, F, M, J/L, C, P, R, 0–9, `,`/`.` frame stepping.
- **Embed server switcher** with live health pings + latency display, per-user up/down votes that
  bias auto-pick (`useServerPrefs`), "last working server per title" memory, iframe load-timeout
  auto-advance, and TMDB **trailer fallback** when all servers fail.

### System features (`src/main/`)
- Auto-update (hourly, autoDownload) with UpdateNotifier UI.
- System tray, global media keys.
- Adblock (~130 domains) and frame-header bypass for ~22 embed hosts.
- Karwan stream extractor (IPC `stream:extract`).
- Fixed-port localhost renderer server (ports 17645–17649) for Firebase Auth compatibility.
- Download cancellation (never save media files), microphone-only permission policy.
- Presence (`setPresence`), gamepad navigation (`useGamepad`).
- Global shortcuts: `?` help, `/` and Ctrl+K search, `g`+letter navigation chords, ShortcutHelp overlay.
- Reduce-motion accessibility setting.

---

## 2) All solvable errors / bugs

### Fixed in this session (root-caused)
| # | Bug | Root cause | Fix |
|---|-----|-----------|-----|
| 1 | **Fullscreen not working anywhere** | `setPermissionRequestHandler` in `src/main/index.ts` denied every permission except `media`, so Electron silently rejected the `'fullscreen'` permission behind `element.requestFullscreen()` app-wide. | Added a `fullscreen` carve-out to both `setPermissionRequestHandler` and `setPermissionCheckHandler`. |
| 2 | **Server auto-switches while it is working** | The 12 s `IFRAME_LOAD_TIMEOUT_MS` timer in `MoviePlayerModal.tsx` never checked whether the iframe already loaded, so it marked even a perfectly-playing server as failed and advanced. | Guard `if (loadedAtRef.current !== null) return` inside the timeout callback. |
| 3 | Esc while in fullscreen closed the whole player | `Escape` handlers called `onClose()` unconditionally. | `if (document.fullscreenElement)` guard in `PlayerModal.tsx` and `MoviePlayerModal.tsx`. |
| 4 | `F` could not exit fullscreen | `requestFullscreen` only ever requested; never toggled. | Toggle in `VideoPlayer.tsx`; new `F` shortcut added to `MoviePlayerModal.tsx`. |
| 5 | Typing in room chat triggered player shortcuts | Keydown handlers didn't skip editable targets. | `isEditable(e.target)` early-return in both modals. |
| 6 | A mis-flagged server could never be retried | `failedServersRef` was never cleared. | Manual server picks (chip click, prev/next, `[`/`]`) now delete the picked id from the failed set. |

### Remaining solvable backlog
1. **Health-check false positives** — `useServerHealth.ts` pings with `fetch(..., { mode: 'no-cors' })`;
   an opaque response counts as "ok", so servers that respond but refuse to embed pass the check.
   Fix: iframe probe or a main-process `net.request` status check.
2. **Continue-watching position always 0 for embeds** — cross-origin iframes hide playback progress.
   Fix: use server postMessage progress APIs where available (e.g. VidLink emits progress events).
3. **Localhost port drift** — if port 17645 is taken the origin changes and localStorage /
   IndexedDB (login) is wiped. Fix: persist the chosen port or migrate storage on origin change.
4. **Swallowed errors everywhere** — `.catch(() => {})` hides failures (this is exactly why both
   root-caused bugs were invisible). Fix: route errors through `electron-log` + user-facing toasts.
5. **Firebase App Check disabled** — enable to protect the RTDB.
6. **Secrets inlined into the main bundle at build time** — move to a proxy or restrict key scopes.
7. **No tests, no GitLab CI** — add typecheck/lint/build pipeline and unit tests for extractors/stores.
8. **`live_tv_channels` / `channels` DB duality** — two channel collections in RTDB; consolidate.
9. **README / code mismatch** — update docs.
10. **Hardcoded ad blocklists and embed-host allowlists** — move to remote config so updates don't
    require an app release.

---

## 3) New feature ideas (grounded in existing scaffolding)

- **F11 / window-level fullscreen** — `win.setFullScreen()` via IPC; complements the HTML fullscreen fix.
- **Light theme + more themes** — themes are pure CSS-variable data in `features/themes/index.ts`;
  adding a light theme is a data change only.
- **Auto-next-episode** — the `autoplayNext` setting already exists but is unused for embeds.
- **Discord Rich Presence** — the `discordRpc` setting exists; wire it to a main-process RPC client.
- **User-initiated HLS downloads / recording** — the `features/downloads/` slice exists; today all
  downloads are cancelled in main.
- **Subtitle search (OpenSubtitles)** — the SRT→VTT pipeline already exists in `VideoPlayer.tsx`.
- **Remote-config server & adblock lists** — a Firebase RTDB node removes release churn.
- **Episode-release notifications** — notify when a followed series airs a new episode.
- **Trakt / Simkl sync** — export watch history.
- **TV / remote "10-foot" mode** — the gamepad navigation hook already exists.

---

## 4) Why fullscreen was not working (root cause)

In Electron, `element.requestFullscreen()` is routed through the session's
**permission handlers** as the `'fullscreen'` permission. `src/main/index.ts` installed:

```ts
session.defaultSession.setPermissionRequestHandler((wc, perm, callback, details) => {
  ...
  if (perm === 'media' && isTopFrame && isOurOrigin) { callback(true); return }
  callback(false)   // ← 'fullscreen' landed here and was DENIED
})
session.defaultSession.setPermissionCheckHandler((_wc, perm, requestingOrigin) => {
  if (perm === 'media') { ... }
  return false      // ← also denied fullscreen checks
})
```

Only `'media'` (microphone for Watch Together voice calls) was approved — **every HTML fullscreen
request in the entire app was silently denied**: the player's own fullscreen button, the `F`
shortcut, and the fullscreen buttons inside embedded third-party players. The iframes' own
`allow="fullscreen" allowFullScreen` attributes were correct; the main-process policy was the block.
The failure was invisible because every call site swallowed the rejection with
`requestFullscreen().catch(() => {})`.

**Fix applied:** a `fullscreen` carve-out at the top of both handlers
(`callback(true)` / `return true`), leaving the media policy and the default deny unchanged.
**Secondary fixes:** `F` now toggles fullscreen (enter *and* exit), Esc in fullscreen no longer
closes the player, `MoviePlayerModal` gained an `F` shortcut, and player shortcuts are ignored
while typing in chat inputs.

---

## 5) Can the design be made more friendly? — Yes

The theming system (`features/themes/index.ts`) applies CSS-variable maps to `:root`, so visual
changes are cheap. Recommended improvements, all buildable on existing scaffolding:

1. **Light theme + theme preview swatches in Settings** — pure data addition to the `THEMES` map
   (all 6 current themes are dark variants).
2. **Collapsible sidebar** — persist the state in `settingsStore`.
3. **Global toast system** — surface the many currently-silent errors (extraction failures,
   server switches) instead of `.catch(() => {})`.
4. **Server-switch banner** — when the player auto-advances servers, show "switched to server X
   because Y" instead of switching silently. This transparency directly addresses the confusion
   that prompted this investigation.
5. **Visible focus rings** — for keyboard and gamepad navigation (the gamepad hook exists but focus
   is hard to see).
6. **First-run onboarding / shortcut tour** — the building blocks already exist:
   `showHotkeysOnStartup` setting, `ShortcutHelp` overlay, and the friends `OnboardingModal`.

---

## 6) Why the server was changing while it was working (root cause)

`MoviePlayerModal.tsx` starts a 12-second watchdog whenever a server is selected:

```ts
useEffect(() => {
  if (!activeId) return
  setLoadState('loading')
  loadedAtRef.current = null
  const t = window.setTimeout(() => {
    // ← there was NO check of loadedAtRef here!
    failedServersRef.current.add(activeId)
    setLoadState('timeout')
    const next = sorted.filter((s) => s.status === 'ok' && !failedServersRef.current.has(s.id))[0]
    if (next) setActiveId(next.id)
  }, IFRAME_LOAD_TIMEOUT_MS)
  return () => window.clearTimeout(t)
}, [activeId, reloadKey])   // ← deps do NOT include loadState
```

The iframe's `onLoad` set `loadedAtRef.current` and `loadState = 'loaded'`, but the effect only
re-ran (clearing the timer) when `activeId` or `reloadKey` changed. So **12 seconds after any
server was selected — even one playing perfectly — the timer fired, marked the working server as
failed, and switched to the next one**, repeating on every switch until candidates ran out. This is
exactly the reported symptom.

**Contributing factor (Watch Together only):** `iframeKey` includes `sync.syncTick`, so every room
sync event remounts the iframe and restarts the 12 s timer (intentional for sync, but it amplified
the bug).

**Fix applied:** a one-line guard as the first statement of the timeout callback —
`if (loadedAtRef.current !== null) return` — so a successfully-loaded server is never flagged or
abandoned. Additionally, manually picking a server now clears its "failed" flag
(`failedServersRef.current.delete(id)`) so a previously mis-flagged server can be retried.
