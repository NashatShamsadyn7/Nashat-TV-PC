import 'dotenv/config'
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { registerTmdbIpc } from './ipc/tmdb'
import { registerStreamIpc } from './ipc/stream'
import { registerAuthIpc } from './ipc/auth'
import { registerPipIpc } from './ipc/pip'
import { registerSystemIpc, registerMediaKeys } from './ipc/system'
import { installFrameHeaderBypass } from './security/frameHeaders'
import { installStreamHeaders } from './security/streamHeaders'
import { installAdblock, shouldBlockUrl } from './security/adblock'
import { initAutoUpdater } from './services/updater'
import { startLocalRendererServer } from './services/localServer'

// User-initiated links we want to honor by opening in the OS browser. Everything
// else (popups, ad redirects from embedded iframes) is denied silently.
const EXTERNAL_LINK_ALLOWLIST = [
  'https://github.com/',
  'https://nashat.tv/',
  'https://wa.me/',
  'https://t.me/',
  'mailto:'
]

function isAuthPopup(url: string): boolean {
  return (
    url.startsWith('https://accounts.google.com/') ||
    url.includes('firebaseapp.com/__/auth/') ||
    url.includes('identitytoolkit.googleapis.com')
  )
}

function isAllowedExternal(url: string): boolean {
  return EXTERNAL_LINK_ALLOWLIST.some((prefix) => url.startsWith(prefix))
}

const isDev = !app.isPackaged
let prodRendererOrigin: string | null = null
let mainWin: BrowserWindow | null = null

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0b',
    title: 'Nashat TV',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false,
      spellcheck: false
    }
  })

  win.once('ready-to-show', () => win.show())

  // Popups: allow only Google/Firebase Auth. Everything else (ad popups from
  // embed iframes, popunders, window.open shenanigans) is silently denied.
  // Explicit user-clicked external links (allowlist) are forwarded to the OS
  // browser; ad redirects to unknown hosts are blocked outright.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAuthPopup(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 700,
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false }
        }
      }
    }
    if (isAllowedExternal(url) && !shouldBlockUrl(url)) {
      shell.openExternal(url).catch(() => {})
    }
    return { action: 'deny' }
  })

  // Some ad scripts hijack the parent frame via `window.location = ...`.
  // Block navigation away from our app origin (except the auth handler).
  win.webContents.on('will-navigate', (event, url) => {
    if (isAuthPopup(url)) return
    if (prodRendererOrigin && url.startsWith(prodRendererOrigin)) return
    if (isDev && process.env.ELECTRON_RENDERER_URL && url.startsWith(process.env.ELECTRON_RENDERER_URL)) return
    event.preventDefault()
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else if (prodRendererOrigin) {
    // Serve from http://localhost:PORT so Firebase Auth popup postMessage works
    // (file:// origin breaks Firebase's __/auth/handler postMessage handshake).
    win.loadURL(`${prodRendererOrigin}/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(async () => {
  app.setAppUserModelId('tv.nashat.pc')
  installAdblock()
  installFrameHeaderBypass()
  installStreamHeaders()
  // Permission policy:
  //   - allow microphone for OUR renderer (top-level frame), needed for the
  //     Watch Together voice call.
  //   - deny everything else, including any permission requested by an
  //     embedded streaming iframe.
  const { session } = await import('electron')
  session.defaultSession.setPermissionRequestHandler((wc, perm, callback, details) => {
    const requestingUrl = details?.requestingUrl || ''
    const isTopFrame = wc?.mainFrame?.url === requestingUrl
    const isOurOrigin =
      requestingUrl.startsWith('http://localhost') ||
      requestingUrl.startsWith('http://127.0.0.1') ||
      requestingUrl.startsWith(prodRendererOrigin || '__never__') ||
      requestingUrl.startsWith('file://')
    if (perm === 'media' && isTopFrame && isOurOrigin) {
      callback(true)
      return
    }
    callback(false)
  })
  // Auto-approve mic prompts that Chromium sometimes routes through the
  // synchronous check (older getUserMedia path).
  session.defaultSession.setPermissionCheckHandler((_wc, perm, requestingOrigin) => {
    if (perm === 'media') {
      const ok =
        requestingOrigin.startsWith('http://localhost') ||
        requestingOrigin.startsWith('http://127.0.0.1') ||
        requestingOrigin.startsWith(prodRendererOrigin || '__never__') ||
        requestingOrigin.startsWith('file://')
      return ok
    }
    return false
  })
  registerTmdbIpc()
  registerStreamIpc()
  registerAuthIpc()
  registerPipIpc()
  registerSystemIpc(() => mainWin)
  registerMediaKeys(() => mainWin)

  if (!isDev) {
    try {
      const rendererDir = join(__dirname, '../renderer')
      const { origin } = await startLocalRendererServer(rendererDir)
      prodRendererOrigin = origin
    } catch (err) {
      console.error('[main] failed to start local renderer server, falling back to file://', err)
    }
  }

  const win = createMainWindow()
  mainWin = win
  win.on('closed', () => {
    mainWin = null
  })
  initAutoUpdater(win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
