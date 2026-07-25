import { ipcMain, Tray, Menu, app, BrowserWindow, nativeImage, globalShortcut, shell } from 'electron'
import { shouldBlockUrl } from '../security/adblock'

let tray: Tray | null = null

export function registerSystemIpc(getMainWindow: () => BrowserWindow | null) {
  // Tray
  ipcMain.handle('system:show-tray', () => {
    if (tray) return
    const icon = nativeImage.createEmpty()
    tray = new Tray(icon)
    tray.setToolTip('Nashat TV')
    rebuildMenu(getMainWindow)
    tray.on('click', () => {
      const win = getMainWindow()
      if (!win) return
      if (win.isVisible()) win.hide()
      else win.show()
    })
  })

  ipcMain.handle('system:set-presence', (_e, payload: { title?: string; status?: 'playing' | 'paused' | 'idle' }) => {
    if (!tray) return
    if (payload.title) tray.setToolTip(`Nashat TV — ${payload.title}`)
    rebuildMenu(getMainWindow, payload)
  })

  ipcMain.handle('system:flash-frame', () => {
    const win = getMainWindow()
    win?.flashFrame(true)
  })

  // Report the real app version so the Settings page stops showing a stale
  // hardcoded string and users can actually tell which build they're on.
  ipcMain.handle('system:get-version', () => app.getVersion())

  // Deliberate "open this in my browser" escape hatch for the player's
  // extraction-failed fallback. A plain <a target="_blank"> cannot work here:
  // setWindowOpenHandler denies every host outside EXTERNAL_LINK_ALLOWLIST, and
  // stream hosts are dynamic so they can never be on that list. This path is
  // narrower than the allowlist rather than wider — the URL leaves the app
  // entirely and only after scheme + adblock validation.
  ipcMain.handle('system:open-external', async (_e, rawUrl: unknown) => {
    if (typeof rawUrl !== 'string') return false
    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      return false
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    if (shouldBlockUrl(rawUrl)) return false
    await shell.openExternal(rawUrl)
    return true
  })
}

function rebuildMenu(
  getMainWindow: () => BrowserWindow | null,
  presence?: { title?: string; status?: 'playing' | 'paused' | 'idle' }
) {
  if (!tray) return
  const items: Electron.MenuItemConstructorOptions[] = []
  if (presence?.title) {
    items.push({ label: presence.title, enabled: false })
    items.push({ type: 'separator' })
  }
  items.push(
    { label: 'إظهار', click: () => getMainWindow()?.show() },
    { label: 'إخفاء', click: () => getMainWindow()?.hide() },
    { type: 'separator' },
    { label: 'خروج', click: () => app.quit() }
  )
  tray.setContextMenu(Menu.buildFromTemplate(items))
}

/**
 * Media transport control now lives in the renderer, via the Media Session API
 * (`src/renderer/src/hooks/useMediaSession.ts`).
 *
 * The previous implementation registered MediaPlayPause/NextTrack/PreviousTrack
 * /Stop as `globalShortcut`s. Three problems with that:
 *
 *  1. `globalShortcut` is system-wide and exclusive — it stole the media keys
 *     from Spotify, browsers and every other player for as long as Nashat TV
 *     was running, even minimized with nothing playing.
 *  2. It never sees AirPods / Bluetooth headset buttons at all. Those send
 *     AVRCP transport commands to the OS media session, not key events, so the
 *     headphone play/pause button did nothing for this app.
 *  3. Now that Media Session is wired up, keyboard media keys are delivered
 *     there too — keeping both would toggle playback twice per press.
 *
 * Kept as an exported no-op so the call site and preload surface stay stable.
 */
export function registerMediaKeys(_getMainWindow: () => BrowserWindow | null) {
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}
