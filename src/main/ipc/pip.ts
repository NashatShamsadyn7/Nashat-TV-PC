import { ipcMain, BrowserWindow, app } from 'electron'
import { join } from 'node:path'

let pipWindow: BrowserWindow | null = null

type PipPayload = {
  streamUrl: string
  title?: string
  logo?: string
}

/** Escape for HTML text/attribute context (preserves the original characters). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Embed a value inside a <script> block. JSON.stringify alone is not enough:
 * it leaves `<` untouched, so a stream URL containing `</script>` closes the
 * block early and injects markup. Escaping `<` as < is still valid JS and
 * cannot terminate the element.
 */
function toScriptLiteral(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function buildHtml(payload: PipPayload, hlsPath: string): string {
  const safeTitle = escapeHtml(payload.title || '')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle || 'PiP'}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    html,body{margin:0;height:100%;background:#000;color:#fff;font-family:Inter,system-ui,sans-serif;overflow:hidden}
    #app{position:relative;width:100%;height:100%}
    video{width:100%;height:100%;display:block;background:#000;object-fit:contain}
    .bar{position:absolute;inset:auto 0 0 0;display:flex;align-items:center;gap:8px;
      background:linear-gradient(to top,rgba(0,0,0,.85),transparent);padding:10px;opacity:0;transition:opacity .2s}
    #app:hover .bar{opacity:1}
    button{background:rgba(255,255,255,.1);color:#fff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:13px}
    button:hover{background:rgba(255,255,255,.2)}
    .title{font-size:12px;color:#ddd;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .drag{-webkit-app-region:drag;position:absolute;top:0;left:0;right:0;height:30px;background:linear-gradient(to bottom,rgba(0,0,0,.5),transparent);opacity:0;transition:opacity .2s}
    #app:hover .drag{opacity:1}
  </style>
</head>
<body>
  <div id="app">
    <div class="drag"></div>
    <video id="v" autoplay playsinline></video>
    <div class="bar">
      <span class="title">${safeTitle}</span>
      <button id="play">⏯</button>
      <button id="mute">🔊</button>
      <button id="close">✕</button>
    </div>
  </div>
  <script src="${escapeHtml(hlsPath)}"></script>
  <script>
    const v = document.getElementById('v')
    const url = ${toScriptLiteral(payload.streamUrl)}
    const isHls = /\\.m3u8(\\?|$)/i.test(url)
    if (isHls && window.Hls && window.Hls.isSupported()) {
      const h = new window.Hls({ lowLatencyMode: true })
      h.loadSource(url); h.attachMedia(v)
    } else {
      v.src = url
    }
    document.getElementById('play').onclick = () => v.paused ? v.play() : v.pause()
    document.getElementById('mute').onclick = () => v.muted = !v.muted
    document.getElementById('close').onclick = () => window.close()
    v.addEventListener('click', () => v.paused ? v.play() : v.pause())
  </script>
</body>
</html>`
}

/** Resolve the bundled hls.js as a file:// URL for the PiP document. */
function hlsScriptUrl(): string {
  const hlsPath = app.isPackaged
    ? join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'hls.js', 'dist', 'hls.min.js')
    : join(app.getAppPath(), 'node_modules', 'hls.js', 'dist', 'hls.min.js')
  return `file:///${hlsPath.replace(/\\/g, '/')}`
}

function loadPayload(win: BrowserWindow, payload: PipPayload): Promise<void> {
  return win.loadURL(
    'data:text/html;charset=utf-8,' + encodeURIComponent(buildHtml(payload, hlsScriptUrl()))
  )
}

export function registerPipIpc() {
  ipcMain.handle('pip:open', async (_e, payload: PipPayload) => {
    if (pipWindow && !pipWindow.isDestroyed()) {
      // The PiP document is a self-contained data: URL with no preload, so it
      // has no ipcRenderer and cannot receive a 'pip:source' message — the old
      // send() was a no-op and the window kept playing the previous channel.
      // Re-render the document with the new payload instead.
      pipWindow.focus()
      await loadPayload(pipWindow, payload)
      return
    }
    pipWindow = new BrowserWindow({
      width: 480,
      height: 270,
      alwaysOnTop: true,
      frame: false,
      transparent: false,
      resizable: true,
      minWidth: 240,
      minHeight: 140,
      backgroundColor: '#000000',
      title: payload.title || 'PiP',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })
    pipWindow.setMenuBarVisibility(false)
    pipWindow.on('closed', () => {
      pipWindow = null
    })

    // The PiP document embeds third-party stream URLs. Deny popups and any
    // navigation away from the generated data: document so an ad script inside
    // a hostile playlist cannot repurpose the always-on-top window.
    pipWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    pipWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('data:text/html')) event.preventDefault()
    })

    await loadPayload(pipWindow, payload)
  })

  ipcMain.handle('pip:close', () => {
    if (pipWindow && !pipWindow.isDestroyed()) pipWindow.close()
  })
}
