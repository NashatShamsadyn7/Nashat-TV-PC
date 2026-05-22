# Nashat TV — Desktop

تطبيق سطح المكتب لمنصة Nashat TV. مبني بـ Electron + React + TypeScript.

## Stack

- **Electron 33** — runtime
- **electron-vite** — dev/build
- **React 18** + **TypeScript 5** — UI
- **Tailwind CSS 3** + **Framer Motion** — styling/animation
- **Zustand** — state
- **Firebase v11** — Auth + Realtime Database + App Check
- **HLS.js** — Live TV streaming
- **mpv** (embedded) — Movies/Series player
- **electron-builder** — packaging (Windows / macOS / Linux)

## Scripts

```bash
npm run dev            # start dev (main + preload + renderer)
npm run build          # type-check + bundle
npm run typecheck      # tsc --noEmit (node + web)
npm run package:win    # build Windows installer
npm run package:mac    # build macOS dmg
npm run package:linux  # build AppImage + .deb
```

## Structure

```
src/
├── main/         Electron main process (Node)
├── preload/      Context bridge
├── renderer/     React app
└── shared/       Cross-process types
```

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in values
3. `npm run dev`
